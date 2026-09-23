import type { NextApiRequest, NextApiResponse } from 'next'
import { readBearerToken, userIdForIntegrationToken } from '../../../lib/integrationTokens'
import { shareMarkdown } from '../../../lib/shareMarkdown'
import { clientKey, rateLimit } from '../../../lib/rateLimit'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = readBearerToken(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Bearer token required' })

  const userId = await userIdForIntegrationToken(token)
  if (!userId) return res.status(401).json({ error: 'Invalid or revoked token' })

  const limit = rateLimit(`integration-share:${userId}:${clientKey(req)}`, 40, 15 * 60 * 1000)
  if (!limit.ok) return res.status(429).json({ error: 'Too many shares. Try again later.' })

  const content = typeof req.body?.content === 'string'
    ? req.body.content
    : typeof req.body?.markdown === 'string'
      ? req.body.markdown
      : ''
  const title = typeof req.body?.title === 'string' ? req.body.title : undefined
  const author = typeof req.body?.author === 'string' ? req.body.author : undefined
  const isPublic = req.body?.isPublic !== false && req.body?.is_public !== false

  try {
    const shared = await shareMarkdown({ userId, content, title, author, isPublic })
    return res.status(200).json(shared)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Share failed'
    if (message === 'Content is required') return res.status(400).json({ error: message })
    console.error('Integration share error:', error)
    return res.status(500).json({ error: 'Could not share this document' })
  }
}
