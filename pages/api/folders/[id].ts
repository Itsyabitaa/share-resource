import type { NextApiRequest, NextApiResponse } from 'next'
import { deleteFolder, getFilesByFolder, renameFolder } from '../../../lib/dbSchema'
import { auth } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await auth.api.getSession({
    headers: req.headers as any
  })
  const userId = session?.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid folder ID' })
  }

  if (req.method === 'GET') {
    try {
      const files = await getFilesByFolder(id, userId)
      return res.status(200).json({ files })
    } catch (error) {
      console.error('Error fetching files for folder:', error)
      return res.status(500).json({ error: 'Failed to fetch files' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { name } = req.body
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Folder name is required' })
      }
      const folder = await renameFolder(id, userId, name)
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found or unauthorized' })
      }
      return res.status(200).json({ folder })
    } catch (error) {
      console.error('Error renaming folder:', error)
      return res.status(500).json({ error: 'Failed to rename folder' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const deleted = await deleteFolder(id, userId)
      if (deleted) {
        return res.status(200).json({ message: 'Folder deleted successfully' })
      } else {
        return res.status(404).json({ error: 'Folder not found or unauthorized' })
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      return res.status(500).json({ error: 'Failed to delete folder' })
    }
  }

  return res.status(405).end()
}
