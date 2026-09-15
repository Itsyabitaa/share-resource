import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { isAdminAuthorized } from '../../../lib/admin'
import { getUserByEmail, getUserPlan } from '../../../lib/dbSchema'
import { applyPlanToUser } from '../../../lib/planActions'
import type { UserPlan } from '../../../lib/storagePolicy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await auth.api.getSession({
    headers: req.headers as any,
  })

  if (!isAdminAuthorized(req, session?.user?.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  const plan = req.body?.plan === 'pro' ? 'pro' : req.body?.plan === 'free' ? 'free' : null

  if (!email || !plan) {
    return res.status(400).json({ error: 'email and plan (free|pro) are required' })
  }

  try {
    const user = await getUserByEmail(email)
    if (!user) {
      return res.status(404).json({ error: 'No user found with that email' })
    }

    await applyPlanToUser(user.id, plan as UserPlan)
    const updatedPlan = await getUserPlan(user.id)

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: updatedPlan,
      },
      message: plan === 'pro'
        ? `${user.email} is now on Pro.`
        : `${user.email} is back on Free (30-day storage).`,
    })
  } catch (error) {
    console.error('Admin set-plan error:', error)
    return res.status(500).json({ error: 'Failed to update plan' })
  }
}
