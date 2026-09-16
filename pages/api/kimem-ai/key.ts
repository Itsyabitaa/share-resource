import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { getUserPlan } from '../../../lib/dbSchema'
import {
  deleteUserGroqApiKey,
  saveUserGroqApiKey,
  userHasGroqApiKey,
} from '../../../lib/kimemAiCredentials'
import { validateGroqApiKey, GROQ_API_KEYS_URL, KIMEM_AI_NAME } from '../../../lib/kimemAi'
import { resolveKimemAccess } from '../../../lib/resolveKimemApiKey'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await auth.api.getSession({ headers: req.headers as any })
  const userId = session?.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'Sign in required.' })
  }

  const plan = await getUserPlan(userId)
  if (plan !== 'pro') {
    return res.status(403).json({ error: 'Kimem AI is available on Pro only.' })
  }

  if (req.method === 'GET') {
    const access = await resolveKimemAccess(userId)
    const hasKey = await userHasGroqApiKey(userId)
    return res.status(200).json({
      hasKey,
      hasOwnKey: access.hasOwnKey,
      keySource: access.source,
      canUseKimem: !!access.apiKey,
      trialUsed: access.trialUsed,
      trialMax: access.trialMax,
      trialRemaining: access.trialRemaining,
      platformConfigured: access.platformConfigured,
      apiKeysUrl: GROQ_API_KEYS_URL,
      provider: 'groq',
      assistantName: KIMEM_AI_NAME,
      blockedReason: access.blockedReason,
    })
  }

  if (req.method === 'POST') {
    const { apiKey, validateOnly } = req.body as { apiKey?: string; validateOnly?: boolean }

    if (!apiKey?.trim()) {
      return res.status(400).json({ error: 'Paste your Groq API key.' })
    }

    const trimmed = apiKey.trim()
    const validation = await validateGroqApiKey(trimmed)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Invalid API key' })
    }

    if (validateOnly) {
      return res.status(200).json({ valid: true })
    }

    await saveUserGroqApiKey(userId, trimmed)
    return res.status(200).json({ success: true, hasKey: true })
  }

  if (req.method === 'DELETE') {
    await deleteUserGroqApiKey(userId)
    return res.status(200).json({ success: true, hasKey: false })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
