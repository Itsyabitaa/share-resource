import type { NextApiRequest, NextApiResponse } from 'next'
import cloudinary from '../../lib/cloudinary'
import { insertFile } from '../../lib/dbSchema'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { 
      content, 
      title = 'Untitled Document', 
      author, 
      isPublic = false, 
      hashtags = [] 
    } = req.body
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    console.log('Uploading content to Cloudinary...')

    // Upload content to Cloudinary as a text file
    const uploadResult = await cloudinary.uploader.upload(
      `data:text/plain;base64,${Buffer.from(content).toString('base64')}`,
      {
        resource_type: 'raw',
                     public_id: `md-nest/${Date.now()}-${Math.random().toString(36).substring(7)}`,
        format: 'txt',
        overwrite: true,
      }
    )

    console.log('Cloudinary upload successful:', uploadResult.secure_url)

    // Store metadata in Neon database
    const fileData = await insertFile(
      title,
      uploadResult.secure_url,
      'txt',
      content.length,
      author,
      isPublic,
      hashtags
    )

    console.log('File metadata stored in database:', fileData)

    res.status(200).json({ 
      id: fileData.id,
      title: fileData.title,
      url: fileData.cloudinary_url
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}