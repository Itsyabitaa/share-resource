export type UserPlan = 'free' | 'pro'
export type StorageTier = 'guest' | 'free' | 'pro' | 'registered'

export const GUEST_RETENTION_DAYS = 3
export const FREE_RETENTION_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

function addDays(days: number, from = Date.now()) {
  return new Date(from + days * DAY_MS)
}

export function computeFileStorage(userPlan: UserPlan | null): {
  storageTier: StorageTier
  expiresAt: Date | null
  message: string
} {
  if (!userPlan) {
    return {
      storageTier: 'guest',
      expiresAt: addDays(GUEST_RETENTION_DAYS),
      message: `Saved temporarily (expires in ${GUEST_RETENTION_DAYS} days)`,
    }
  }

  if (userPlan === 'pro') {
    return {
      storageTier: 'pro',
      expiresAt: null,
      message: 'Saved permanently on Pro',
    }
  }

  return {
    storageTier: 'free',
    expiresAt: addDays(FREE_RETENTION_DAYS),
    message: `Saved for ${FREE_RETENTION_DAYS} days — upgrade to Pro for permanent storage`,
  }
}

export function formatExpiryLabel(expiresAt?: string | Date | null): string {
  if (!expiresAt) return 'Permanent'
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return 'Permanent'
  return `Expires ${date.toLocaleDateString()}`
}

export function daysUntilExpiry(expiresAt?: string | Date | null): number | null {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / DAY_MS)
}

export function isPermanentTier(tier?: string | null) {
  return tier === 'pro' || tier === 'registered'
}
