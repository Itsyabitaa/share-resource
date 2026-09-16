import { hasPlatformGroqConfigured } from './platformGroqKeys'

export const KIMEM_TRIAL_MAX = Math.max(
  1,
  parseInt(process.env.KIMEM_TRIAL_MAX || '5', 10) || 5
)

export function kimemTrialRemaining(used: number) {
  return Math.max(0, KIMEM_TRIAL_MAX - used)
}

export async function canUseKimemPlatformTrial(used: number) {
  if (used >= KIMEM_TRIAL_MAX) return false
  return hasPlatformGroqConfigured()
}
