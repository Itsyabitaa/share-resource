import type { NextApiRequest, NextApiResponse } from 'next'
import { getAllUserFiles } from '../../../lib/dbSchema'
import { auth } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const session = await auth.api.getSession({
    headers: req.headers as any
  })
  const userId = session?.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const files = await getAllUserFiles(userId)
    return res.status(200).json({ files })
  } catch (error) {
    console.error('Error fetching all user files:', error)
    return res.status(500).json({ error: 'Failed to fetch files' })
  }
}
