import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import path from 'path'
import cloudinary from '../../lib/cloudinary'
import { insertFile } from '../../lib/dbSchema'
import { formatToMarkdown, isAlreadyMarkdown } from '../../utils/markdownFormatter'
import mammoth from 'mammoth'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = new IncomingForm({
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      keepExtensions: true,
    })

    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          if (err.message && err.message.includes('maxFileSize exceeded')) {
            reject(new Error('File size exceeds maximum limit of 5MB'))
          } else {
            reject(err)
          }
        }
        else resolve([fields, files])
      })
    })

    const file = files.file?.[0]
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Extract author and autoFormat from form fields
    const author = fields.author?.[0] || undefined
    const autoFormat = fields.autoFormat?.[0] !== 'false' // Default to true

    const filePath = file.filepath
    const fileExtension = path.extname(file.originalFilename || '').toLowerCase()
    const fileName = file.originalFilename || 'uploaded-file'
    const fileMimeType = file.mimetype || ''

    // Server-side hardening: Validate file content type
    const allowedMimeTypes = [
      'text/plain',
      'text/markdown',
      'application/octet-stream',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    if (fileMimeType && !allowedMimeTypes.includes(fileMimeType) && !fileMimeType.startsWith('text/')) {
      await fs.unlink(filePath)
      return res.status(400).json({ error: 'Unsupported file content type' })
    }

    let content = ''

    // Handle different file types
    switch (fileExtension) {
      case '.txt':
        // Read text files and optionally format to markdown
        content = await fs.readFile(filePath, 'utf-8')
        if (autoFormat) {
          content = formatToMarkdown(content)
        }
        break

      case '.md':
        // Read markdown files directly, skip formatting if already well-formatted
        content = await fs.readFile(filePath, 'utf-8')
        if (autoFormat && !isAlreadyMarkdown(content)) {
          content = formatToMarkdown(content)
        }
        break

      case '.docx':
        try {
          const mammothResult = await mammoth.extractRawText({ path: filePath })
          content = mammothResult.value
          if (autoFormat) {
            content = formatToMarkdown(content)
          } else {
            content = `# Converted Document\n\n${content}`
          }
        } catch (err: any) {
          await fs.unlink(filePath)
          return res.status(400).json({ error: 'Failed to parse .docx document content.' })
        }
        break

      case '.doc':
        await fs.unlink(filePath)
        return res.status(400).json({ error: 'Legacy .doc format is not supported. Please upload .docx instead.' })

      default:
        return res.status(400).json({ error: 'Unsupported file type' })
    }

    // Clean up the temporary file
    await fs.unlink(filePath)

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:text/plain;base64,${Buffer.from(content).toString('base64')}`,
      {
        resource_type: 'raw',
        public_id: `md-nest/${Date.now()}-${Math.random().toString(36).substring(7)}`,
        format: fileExtension.substring(1),
        overwrite: true,
      }
    )

    // Store metadata in Neon database
    const fileData = await insertFile(
      fileName,
      uploadResult.secure_url,
      fileExtension.substring(1),
      content.length,
      author
    )

    res.status(200).json({
      content,
      id: fileData.id,
      title: fileData.title,
      url: fileData.cloudinary_url
    })
  } catch (error) {
    console.error('File conversion error:', error)
    if (error instanceof Error && error.message === 'File size exceeds maximum limit of 5MB') {
      return res.status(413).json({ error: error.message })
    }
    res.status(500).json({
      error: 'File conversion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
