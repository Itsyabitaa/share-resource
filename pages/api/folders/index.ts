import type { NextApiRequest, NextApiResponse } from 'next'
import { getFoldersByUser, createFolder } from '../../../lib/dbSchema'
import { auth } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await auth.api.getSession({
    headers: req.headers as any
  })
  const userId = session?.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const folders = await getFoldersByUser(userId)
      return res.status(200).json({ folders })
    } catch (error) {
      console.error('Error fetching folders:', error)
      return res.status(500).json({ error: 'Failed to fetch folders' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { name } = req.body
      if (!name) {
        return res.status(400).json({ error: 'Folder name is required' })
      }
      const folder = await createFolder(name, userId)
      return res.status(201).json({ folder })
    } catch (error) {
      console.error('Error creating folder:', error)
      return res.status(500).json({ error: 'Failed to create folder' })
    }
  }

  return res.status(405).end()
}
