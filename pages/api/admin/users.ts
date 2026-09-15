import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { isAdminAuthorized } from '../../../lib/admin'
import { getUserPlan, searchUsers } from '../../../lib/dbSchema'

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

  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''

  try {
    const users = query ? await searchUsers(query) : []
    const withPlans = await Promise.all(
      users.map(async (user) => ({
        ...user,
        plan: await getUserPlan(user.id),
      }))
    )

    return res.status(200).json({ users: withPlans })
  } catch (error) {
    console.error('Admin users search error:', error)
    return res.status(500).json({ error: 'Failed to search users' })
  }
}
