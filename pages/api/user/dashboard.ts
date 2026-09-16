import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { getUserPlan } from '../../../lib/dbSchema'
import { getUserDashboard } from '../../../lib/userDashboard'
import { getUserUsageSummary } from '../../../lib/usageSummary'

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
    const [dashboard, plan, usage] = await Promise.all([
      getUserDashboard(session.user.id),
      getUserPlan(session.user.id),
      getUserUsageSummary(session.user.id),
    ])

    return res.status(200).json({
      ...dashboard,
      plan,
      usage,
      user: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    })
  } catch (error) {
    console.error('User dashboard error:', error)
    return res.status(500).json({ error: 'Failed to load dashboard' })
  }
}
