import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { getUserWarnings } from '../../../lib/moderationDb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await auth.api.getSession({
    headers: req.headers as any,
  })

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const warnings = await getUserWarnings(session.user.id)
    return res.status(200).json({ warnings })
  } catch (error) {
    console.error('User warnings error:', error)
    return res.status(500).json({ error: 'Failed to load warnings' })
  }
}
