import {
  countFoldersByUser,
  getKimemUsesTotal,
  getPhotoConversionsUsed,
  getUserPlan,
} from './dbSchema'
import { userHasGroqApiKey } from './kimemAiCredentials'
import { resolveKimemAccess } from './resolveKimemApiKey'
import {
  FREE_MAX_FOLDERS,
  FREE_MAX_PHOTO_CONVERSIONS,
  getMaxFolders,
  getMaxPhotoConversions,
  photoConversionsRemaining,
} from './planLimits'
import type { UserPlan } from './storagePolicy'

export type UsageMeter = {
  used: number
  max: number | null
  remaining: number | null
  unlimited: boolean
  label: string
}

export type KimemUsage = {
  totalRuns: number
  trialUsed: number
  trialMax: number
  trialRemaining: number
  hasOwnGroqKey: boolean
  keySource: 'user' | 'platform' | null
  canUseKimem: boolean
  remainingLabel: string
  provider: 'groq'
}

export type UserUsageSummary = {
  plan: UserPlan
  kimem: KimemUsage | null
  photoScans: UsageMeter
  folders: UsageMeter
  freeLimits?: { maxFolders: number; maxPhotoScans: number }
}

function buildMeter(used: number, max: number | null, label: string): UsageMeter {
  const unlimited = max === null
  const remaining = unlimited ? null : Math.max(0, max - used)
  return {
    used,
    max,
    remaining,
    unlimited,
    label,
  }
}

function kimemRemainingLabel(access: Awaited<ReturnType<typeof resolveKimemAccess>>, totalRuns: number) {
  if (access.hasOwnKey) {
    return `Unlimited via your Groq key (${totalRuns} run${totalRuns === 1 ? '' : 's'} total)`
  }
  if (access.trialRemaining > 0) {
    return `${access.trialRemaining} of ${access.trialMax} md-nest trial runs left`
  }
  return 'Add a Groq API key in Settings to continue'
}

export async function getUserUsageSummary(userId: string): Promise<UserUsageSummary> {
  const plan = await getUserPlan(userId)

  const [foldersUsed, photoUsed, kimemAccess, kimemTotal, hasOwnGroqKey] = await Promise.all([
    countFoldersByUser(userId),
    getPhotoConversionsUsed(userId),
    plan === 'pro' ? resolveKimemAccess(userId) : Promise.resolve(null),
    plan === 'pro' ? getKimemUsesTotal(userId) : Promise.resolve(0),
    plan === 'pro' ? userHasGroqApiKey(userId) : Promise.resolve(false),
  ])

  const maxFolders = getMaxFolders(plan)
  const maxPhoto = getMaxPhotoConversions(plan)

  const photoScans = buildMeter(
    photoUsed,
    maxPhoto,
    plan === 'pro' ? 'Photo → markdown' : 'Photo scans (Free)'
  )
  if (plan === 'pro') {
    photoScans.unlimited = true
    photoScans.max = null
    photoScans.remaining = null
    photoScans.label = 'Photo → markdown (Pro)'
  } else if (maxPhoto !== null) {
    photoScans.remaining = photoConversionsRemaining(plan, photoUsed)
  }

  const folders = buildMeter(
    foldersUsed,
    maxFolders,
    plan === 'pro' ? 'Folders (Pro)' : 'Folders (Free)'
  )
  if (plan === 'pro') {
    folders.unlimited = true
    folders.max = null
    folders.remaining = null
  }

  let kimem: KimemUsage | null = null
  if (plan === 'pro' && kimemAccess) {
    kimem = {
      totalRuns: kimemTotal,
      trialUsed: kimemAccess.trialUsed,
      trialMax: kimemAccess.trialMax,
      trialRemaining: kimemAccess.trialRemaining,
      hasOwnGroqKey: hasOwnGroqKey,
      keySource: kimemAccess.source,
      canUseKimem: !!kimemAccess.apiKey,
      remainingLabel: kimemRemainingLabel(kimemAccess, kimemTotal),
      provider: 'groq',
    }
  }

  return {
    plan,
    kimem,
    photoScans,
    folders,
    ...(plan === 'free'
      ? { freeLimits: { maxFolders: FREE_MAX_FOLDERS, maxPhotoScans: FREE_MAX_PHOTO_CONVERSIONS } }
      : {}),
  }
}
