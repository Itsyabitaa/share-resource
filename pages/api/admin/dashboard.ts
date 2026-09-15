import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { isAdminAuthorized } from '../../../lib/admin'
import {
  getAdminActivity,
  getAdminDashboardStats,
  getViralPosts,
} from '../../../lib/moderationDb'

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

  try {
    const [stats, viralPosts, activity] = await Promise.all([
      getAdminDashboardStats(),
      getViralPosts(15),
      getAdminActivity(50),
    ])

    return res.status(200).json({ stats, viralPosts, activity })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return res.status(500).json({ error: 'Failed to load dashboard' })
  }
}
