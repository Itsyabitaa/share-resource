import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import { rateLimit, clientKey } from '../../lib/rateLimit'
import { convertBufferToMarkdown, ConvertError } from '../../lib/convertDocument'

export const config = {
  api: {
    bodyParser: false,
  },
}

function firstUploadedFile(files: Record<string, any>) {
  const raw = files.file
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] : raw
}

function firstField(fields: Record<string, any>, name: string) {
  const raw = fields[name]
  if (raw == null) return undefined
  return Array.isArray(raw) ? raw[0] : raw
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const limit = rateLimit(`convert:${clientKey(req)}`, 20, 15 * 60 * 1000)
  if (!limit.ok) {
    return res.status(429).json({ error: 'Too many uploads. Try again later.' })
  }

  let filePath = ''

  try {
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true,
    })

    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, parsedFields, parsedFiles) => {
        if (err) reject(err)
        else resolve([parsedFields, parsedFiles])
      })
    })

    const file = firstUploadedFile(files)
    if (!file?.filepath) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    filePath = file.filepath
    const autoFormat = firstField(fields, 'autoFormat') !== 'false'
    const filename = file.originalFilename || file.newFilename || 'uploaded-file'
    const buffer = await fs.readFile(filePath)
    const result = await convertBufferToMarkdown(buffer, filename, autoFormat)

    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof ConvertError) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('File conversion error:', error)
    return res.status(500).json({ error: 'File conversion failed' })
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => undefined)
    }
  }
}
