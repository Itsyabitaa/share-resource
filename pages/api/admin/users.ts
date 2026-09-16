import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { isAdminAuthorized } from '../../../lib/admin'
import { getUserPlan, listAdminUsers } from '../../../lib/dbSchema'
import { getAdminUserApiListItems } from '../../../lib/adminUserApi'
import { KIMEM_TRIAL_MAX } from '../../../lib/kimemTrial'

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
  const providerRaw = typeof req.query.provider === 'string' ? req.query.provider : 'all'
  const activityRaw = typeof req.query.activity === 'string' ? req.query.activity : 'all'

  const provider =
    providerRaw === 'google' || providerRaw === 'email' ? providerRaw : 'all'
  const activity =
    activityRaw === 'has_docs' || activityRaw === 'verified' ? activityRaw : 'all'

  try {
    const users = await listAdminUsers({ query, provider, activity, limit: 40 })
    const apiItems = await getAdminUserApiListItems(users.map(u => u.id))
    const withPlans = await Promise.all(
      users.map(async (user) => {
        const api = apiItems.get(user.id)
        return {
          ...user,
          plan: await getUserPlan(user.id),
          apiUsage: api || {
            kimemUsesTotal: 0,
            kimemTrialUsed: 0,
            kimemTrialMax: KIMEM_TRIAL_MAX,
            photoConversionsUsed: 0,
            hasGroqKey: false,
            groqKeyDisplay: null,
          },
        }
      })
    )

    return res.status(200).json({ users: withPlans })
  } catch (error) {
    console.error('Admin users search error:', error)
    return res.status(500).json({ error: 'Failed to search users' })
  }
}
