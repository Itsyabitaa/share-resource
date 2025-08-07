import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import path from 'path'
import cloudinary from '../../lib/cloudinary'
import { insertFile } from '../../lib/dbSchema'

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
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
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

    const filePath = file.filepath
    const fileExtension = path.extname(file.originalFilename || '').toLowerCase()
    const fileName = file.originalFilename || 'uploaded-file'
    
    let content = ''

    // Handle different file types
    switch (fileExtension) {
      case '.txt':
      case '.md':
        // Read text files directly
        content = await fs.readFile(filePath, 'utf-8')
        break
        
      case '.doc':
      case '.docx':
        // For now, just read as text (you might want to add proper DOC parsing)
        content = await fs.readFile(filePath, 'utf-8')
        content = `# Converted Document\n\n${content}`
        break
        
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
        public_id: `mdshare/${Date.now()}-${Math.random().toString(36).substring(7)}`,
        format: fileExtension.substring(1),
        overwrite: true,
      }
    )

    // Store metadata in Neon database
    const fileData = await insertFile(
      fileName,
      uploadResult.secure_url,
      fileExtension.substring(1),
      content.length
    )

    res.status(200).json({ 
      content,
      id: fileData.id,
      title: fileData.title,
      url: fileData.cloudinary_url
    })
  } catch (error) {
    console.error('File conversion error:', error)
    res.status(500).json({ 
      error: 'File conversion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
