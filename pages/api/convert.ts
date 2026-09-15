import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import { formatToMarkdown, isAlreadyMarkdown } from '../../utils/markdownFormatter'
import { rateLimit, clientKey } from '../../lib/rateLimit'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const limit = rateLimit(`convert:${clientKey(req)}`, 20, 15 * 60 * 1000)
  if (!limit.ok) {
    return res.status(429).json({ error: 'Too many uploads. Try again later.' })
  }

  try {
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true,
    })

    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const file = files.file?.[0]
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const autoFormat = fields.autoFormat?.[0] !== 'false'
    const filePath = file.filepath
    const fileExtension = path.extname(file.originalFilename || '').toLowerCase()
    const fileName = (file.originalFilename || 'uploaded-file').replace(/\.[^.]+$/, '')

    let content = ''

    try {
      switch (fileExtension) {
        case '.txt':
          content = await fs.readFile(filePath, 'utf-8')
          if (autoFormat) content = formatToMarkdown(content)
          break
        case '.md':
          content = await fs.readFile(filePath, 'utf-8')
          if (autoFormat && !isAlreadyMarkdown(content)) {
            content = formatToMarkdown(content)
          }
          break
        case '.docx': {
          const result = await mammoth.convertToMarkdown({ path: filePath })
          content = result.value || ''
          break
        }
        case '.doc':
          return res.status(400).json({
            error: 'Legacy .doc files are not supported. Save as .docx and try again.'
          })
        default:
          return res.status(400).json({ error: 'Unsupported file type' })
      }
    } finally {
      await fs.unlink(filePath).catch(() => undefined)
    }

    return res.status(200).json({
      content,
      title: fileName,
    })
  } catch (error) {
    console.error('File conversion error:', error)
    return res.status(500).json({ error: 'File conversion failed' })
  }
}
