import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { getUserPlan } from '../../../lib/dbSchema'
import { FREE_RETENTION_DAYS, GUEST_RETENTION_DAYS } from '../../../lib/storagePolicy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await auth.api.getSession({
    headers: req.headers as any,
  })

  if (!session?.user?.id) {
    return res.status(200).json({
      plan: null,
      retentionDays: GUEST_RETENTION_DAYS,
      isPermanent: false,
    })
  }

  const plan = await getUserPlan(session.user.id)

  return res.status(200).json({
    plan,
    retentionDays: plan === 'pro' ? null : FREE_RETENTION_DAYS,
    isPermanent: plan === 'pro',
  })
}
