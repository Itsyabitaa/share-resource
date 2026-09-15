import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { getFileById, updateOwnedFile, deleteOwnedFile } from '../../../lib/dbSchema'
import { getCloudinaryConfig } from '../../../lib/userCredentials'
import { destroyRaw, extractPublicId, uploadMarkdown } from '../../../lib/cloudinaryOps'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await auth.api.getSession({
    headers: req.headers as any
  })
  const userId = session?.user?.id
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid file ID' })
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const file = await getFileById(id)
  if (!file || file.user_id !== userId) {
    return res.status(404).json({ error: 'File not found' })
  }

  if (req.method === 'PATCH') {
    try {
      const { title, content, isPublic, hashtags, folderId, author } = req.body
      let cloudinaryUrl = file.cloudinary_url

      if (typeof content === 'string') {
        const config = await getCloudinaryConfig(userId)
        const publicId = extractPublicId(file.cloudinary_url) || `md-nest/${id}`
        const uploaded = await uploadMarkdown(content, config, publicId)
        cloudinaryUrl = uploaded.secure_url
      }

      const updated = await updateOwnedFile(id, userId, {
        title,
        author,
        isPublic,
        hashtags,
        folderId,
        cloudinaryUrl,
        fileSize: typeof content === 'string' ? content.length : undefined,
      })

      return res.status(200).json({ file: updated })
    } catch (error) {
      console.error('Error updating file:', error)
      return res.status(500).json({ error: 'Failed to update file' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const config = await getCloudinaryConfig(userId)
      const publicId = extractPublicId(file.cloudinary_url)
      if (publicId) {
        await destroyRaw(publicId, config).catch((error) => {
          console.error('Cloudinary delete failed:', error)
        })
      }

      const deleted = await deleteOwnedFile(id, userId)
      if (!deleted) {
        return res.status(404).json({ error: 'File not found' })
      }

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting file:', error)
      return res.status(500).json({ error: 'Failed to delete file' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
