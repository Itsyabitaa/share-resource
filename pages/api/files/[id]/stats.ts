import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../../lib/auth'
import { getAccessibleFile, getFileStats } from '../../../../lib/dbSchema'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid file ID' })
  }

  try {
    const session = await auth.api.getSession({ headers: req.headers as any })
    const file = await getAccessibleFile(id, session?.user?.id)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    const stats = await getFileStats(id)
    if (!stats) {
      return res.status(404).json({ error: 'File not found' })
    }

    if (stats.timeline.length === 0) {
      stats.timeline = [{
        id: 'created',
        kind: 'create',
        label: 'Created',
        at: stats.createdAt,
        title: file.title,
      }]
    }

    return res.status(200).json(stats)
  } catch (error) {
    console.error('Error loading file stats:', error)
    return res.status(500).json({ error: 'Failed to load document stats' })
  }
}
