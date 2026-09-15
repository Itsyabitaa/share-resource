import type { NextApiRequest, NextApiResponse } from 'next'
import { insertFile } from '../../lib/dbSchema'
import { getCloudinaryConfig } from '../../lib/userCredentials'
import { uploadMarkdown } from '../../lib/cloudinaryOps'
import { auth } from '../../lib/auth'
import { rateLimit, clientKey } from '../../lib/rateLimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await auth.api.getSession({
    headers: req.headers as any
  })
  const userId = session?.user?.id
  const max = userId ? 60 : 12
  const limit = rateLimit(`save:${clientKey(req)}`, max, 15 * 60 * 1000)
  if (!limit.ok) {
    return res.status(429).json({ error: 'Too many saves. Try again later.' })
  }

  try {
    const {
      content,
      title = 'Untitled Document',
      author,
      isPublic = false,
      hashtags = [],
      folderId
    } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const storageTier: 'guest' | 'registered' = userId ? 'registered' : 'guest'
    const expiresAt = userId ? undefined : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    const config = await getCloudinaryConfig(userId)
    const uploadResult = await uploadMarkdown(content, config)

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
      storageTier,
      folderId
    )

    res.status(200).json({
      id: fileData.id,
      title: fileData.title,
      url: fileData.cloudinary_url,
      storageTier: fileData.storage_tier,
      expiresAt: fileData.expires_at,
      message: userId
        ? 'File saved permanently'
        : 'File saved temporarily (expires in 3 days)'
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
