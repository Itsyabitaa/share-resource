import { getUserGroqApiKey } from './kimemAiCredentials'
import {
  canUseKimemPlatformTrial,
  getPlatformGroqKey,
  kimemTrialRemaining,
  KIMEM_TRIAL_MAX,
} from './kimemTrial'
import { getKimemTrialUses } from './dbSchema'

export type KimemKeySource = 'user' | 'platform'

export type KimemAccess = {
  apiKey: string | null
  source: KimemKeySource | null
  hasOwnKey: boolean
  trialUsed: number
  trialMax: number
  trialRemaining: number
  platformConfigured: boolean
  blockedReason?: string
}

export async function resolveKimemAccess(userId: string): Promise<KimemAccess> {
  const [userKey, trialUsed] = await Promise.all([
    getUserGroqApiKey(userId),
    getKimemTrialUses(userId),
  ])

  const platformConfigured = !!getPlatformGroqKey()
  const trialMax = KIMEM_TRIAL_MAX
  const trialRemaining = kimemTrialRemaining(trialUsed)
  const hasOwnKey = !!userKey?.trim()

  if (hasOwnKey) {
    return {
      apiKey: userKey!,
      source: 'user',
      hasOwnKey: true,
      trialUsed,
      trialMax,
      trialRemaining,
      platformConfigured,
    }
  }

  if (canUseKimemPlatformTrial(trialUsed)) {
    return {
      apiKey: getPlatformGroqKey()!,
      source: 'platform',
      hasOwnKey: false,
      trialUsed,
      trialMax,
      trialRemaining,
      platformConfigured,
    }
  }

  let blockedReason =
    'Your Kimem AI trial is finished. Add your own Groq API key in Settings to keep working.'
  if (!platformConfigured) {
    blockedReason =
      'Kimem AI needs a Groq API key. Add yours in Settings — or ask the site admin to enable the shared trial (GROQ_API_KEY).'
  }

  return {
    apiKey: null,
    source: null,
    hasOwnKey: false,
    trialUsed,
    trialMax,
    trialRemaining: 0,
    platformConfigured,
    blockedReason,
  }
}
