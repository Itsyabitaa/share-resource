import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../../lib/auth'
import { getAccessibleFile, incrementFileShare, incrementFileView } from '../../../../lib/dbSchema'
import { rateLimit, clientKey } from '../../../../lib/rateLimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid file ID' })
  }

  const { action } = req.body || {}
  if (action !== 'view' && action !== 'share') {
    return res.status(400).json({ error: 'Invalid action' })
  }

  try {
    const session = await auth.api.getSession({ headers: req.headers as any })
    const file = await getAccessibleFile(id, session?.user?.id)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    if (action === 'view') {
      const key = `view:${id}:${clientKey(req)}`
      const limit = rateLimit(key, 30, 60 * 1000)
      if (!limit.ok) {
        return res.status(200).json({
          viewCount: file.view_count ?? 0,
          shareCount: file.share_count ?? 0,
          counted: false,
        })
      }
      const viewCount = await incrementFileView(id)
      return res.status(200).json({
        viewCount,
        shareCount: file.share_count ?? 0,
        counted: true,
      })
    }

    const shareCount = await incrementFileShare(id)
    return res.status(200).json({
      viewCount: file.view_count ?? 0,
      shareCount,
      counted: true,
    })
  } catch (error) {
    console.error('Error tracking file activity:', error)
    return res.status(500).json({ error: 'Failed to record activity' })
  }
}
