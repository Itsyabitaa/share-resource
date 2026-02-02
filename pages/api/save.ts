import type { NextApiRequest, NextApiResponse } from 'next'
import { insertFile } from '../../lib/dbSchema'
import { getCloudinaryInstance } from '../../lib/userCredentials'
import { auth } from '../../lib/auth'

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

    // Check if user is authenticated
    const session = await auth.api.getSession({
      headers: req.headers as any
    })
    const userId = session?.user?.id
    const isAuthenticated = !!userId

    console.log('User authentication status:', isAuthenticated ? `Authenticated (${userId})` : 'Guest')

    // Determine storage tier and expiry
    let storageTier: 'guest' | 'registered' = 'guest'
    let expiresAt: Date | undefined = undefined

    if (isAuthenticated) {
      storageTier = 'registered'
      expiresAt = undefined // Permanent storage
      console.log('Using registered user storage (permanent)')
    } else {
      storageTier = 'guest'
      // Set expiry to 3 days from now
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3)
      console.log('Using guest storage (expires in 3 days):', expiresAt.toISOString())
    }

    // Get appropriate Cloudinary instance (user's custom or default)
    const cloudinary = await getCloudinaryInstance(userId)

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
      hashtags,
      userId,
      expiresAt,
      storageTier
    )

    console.log('File metadata stored in database:', fileData)

    res.status(200).json({
      id: fileData.id,
      title: fileData.title,
      url: fileData.cloudinary_url,
      storageTier: fileData.storage_tier,
      expiresAt: fileData.expires_at,
      message: isAuthenticated
        ? 'File saved permanently'
        : 'File saved temporarily (expires in 3 days)'
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    res.status(500).json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}