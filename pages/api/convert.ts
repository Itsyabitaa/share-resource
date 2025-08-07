import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import { promises as fs } from 'fs'
import path from 'path'

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
        
      case '.pdf':
        // For now, just return a placeholder (you might want to add PDF parsing)
        content = `# PDF Document\n\nThis PDF file has been uploaded. Content extraction is not yet implemented.\n\nFile: ${file.originalFilename}`
        break
        
      default:
        return res.status(400).json({ error: 'Unsupported file type' })
    }

    // Clean up the temporary file
    await fs.unlink(filePath)

    res.status(200).json({ content })
  } catch (error) {
    console.error('File conversion error:', error)
    res.status(500).json({ 
      error: 'File conversion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
