import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { isAdminAuthorized } from '../../../lib/admin'
import { getAdminUserApiDetail } from '../../../lib/adminUserApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await auth.api.getSession({
    headers: req.headers as any,
  })

  if (!isAdminAuthorized(req, session?.user?.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : ''
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  try {
    const detail = await getAdminUserApiDetail(userId)
    if (!detail) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.status(200).json({ detail })
  } catch (error) {
    console.error('Admin user API usage error:', error)
    return res.status(500).json({ error: 'Failed to load user API usage' })
  }
}
