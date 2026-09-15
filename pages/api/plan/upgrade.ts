import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { applyProStorageToUserFiles, getUserPlan, setUserPlan } from '../../../lib/dbSchema'

function canUpgrade(promoCode?: string) {
  const configuredPromo = process.env.PRO_PROMO_CODE
  if (configuredPromo && promoCode === configuredPromo) {
    return true
  }

  return process.env.ENABLE_SELF_SERVE_PRO === 'true'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await auth.api.getSession({
    headers: req.headers as any,
  })
  const userId = session?.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'Sign in to upgrade' })
  }

  const currentPlan = await getUserPlan(userId)
  if (currentPlan === 'pro') {
    return res.status(200).json({ plan: 'pro', message: 'You already have Pro.' })
  }

  const promoCode = typeof req.body?.promoCode === 'string' ? req.body.promoCode.trim() : undefined

  if (!canUpgrade(promoCode)) {
    return res.status(403).json({
      error: 'Pro upgrades are not enabled yet. Check back on the pricing page or contact support.',
    })
  }

  await setUserPlan(userId, 'pro')
  await applyProStorageToUserFiles(userId)

  return res.status(200).json({
    plan: 'pro',
    message: 'Welcome to Pro! Your documents are now stored permanently.',
  })
}
