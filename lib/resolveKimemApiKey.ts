import { getUserGroqApiKey } from './kimemAiCredentials'
import { hasPlatformGroqConfigured } from './platformGroqKeys'
import { canUseKimemPlatformTrial, kimemTrialRemaining, KIMEM_TRIAL_MAX } from './kimemTrial'
import { getKimemTrialUses } from './dbSchema'

export type KimemKeySource = 'user' | 'platform'

export type KimemAccess = {
  apiKey: string | null
  source: KimemKeySource | null
  usePlatformPool: boolean
  hasOwnKey: boolean
  trialUsed: number
  trialMax: number
  trialRemaining: number
  platformConfigured: boolean
  canUseKimem: boolean
  blockedReason?: string
}

export async function resolveKimemAccess(userId: string): Promise<KimemAccess> {
  const [userKey, trialUsed, platformConfigured] = await Promise.all([
    getUserGroqApiKey(userId),
    getKimemTrialUses(userId),
    hasPlatformGroqConfigured(),
  ])

  const trialMax = KIMEM_TRIAL_MAX
  const trialRemaining = kimemTrialRemaining(trialUsed)
  const hasOwnKey = !!userKey?.trim()

  if (hasOwnKey) {
    return {
      apiKey: userKey!,
      source: 'user',
      usePlatformPool: false,
      hasOwnKey: true,
      trialUsed,
      trialMax,
      trialRemaining,
      platformConfigured,
      canUseKimem: true,
    }
  }

  const trialOk = await canUseKimemPlatformTrial(trialUsed)
  if (trialOk) {
    return {
      apiKey: null,
      source: 'platform',
      usePlatformPool: true,
      hasOwnKey: false,
      trialUsed,
      trialMax,
      trialRemaining,
      platformConfigured,
      canUseKimem: true,
    }
  }

  let blockedReason =
    'Your Kimem AI trial is finished. Add your own Groq API key in Settings to keep working.'
  if (!platformConfigured) {
    blockedReason =
      'Kimem AI needs a Groq API key. Add yours in Settings — or ask the site admin to add platform keys.'
  }

  return {
    apiKey: null,
    source: null,
    usePlatformPool: false,
    hasOwnKey: false,
    trialUsed,
    trialMax,
    trialRemaining: 0,
    platformConfigured,
    canUseKimem: false,
    blockedReason,
  }
}
