export const KIMEM_TRIAL_MAX = Math.max(
  1,
  parseInt(process.env.KIMEM_TRIAL_MAX || '5', 10) || 5
)

export function getPlatformGroqKey(): string | null {
  const key = process.env.KIMEM_GROQ_API_KEY || process.env.GROQ_API_KEY
  return key?.trim() || null
}

export function kimemTrialRemaining(used: number) {
  return Math.max(0, KIMEM_TRIAL_MAX - used)
}

export function canUseKimemPlatformTrial(used: number) {
  return getPlatformGroqKey() != null && used < KIMEM_TRIAL_MAX
}
