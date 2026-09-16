import type { UserPlan } from './storagePolicy'

export const FREE_MAX_FOLDERS = 1
export const FREE_MAX_PHOTO_CONVERSIONS = 3

export type PlanUsage = {
  plan: UserPlan | null
  foldersUsed: number
  photoConversionsUsed: number
}

export function getMaxFolders(plan: UserPlan | null) {
  if (plan === 'pro') return null
  if (plan === 'free') return FREE_MAX_FOLDERS
  return 0
}

export function getMaxPhotoConversions(plan: UserPlan | null) {
  if (plan === 'pro') return null
  if (plan === 'free') return FREE_MAX_PHOTO_CONVERSIONS
  return 0
}

export function canCreateFolder(plan: UserPlan | null, foldersUsed: number) {
  const max = getMaxFolders(plan)
  if (max === null) return true
  return foldersUsed < max
}

export function canUsePhotoConversion(plan: UserPlan | null, photoConversionsUsed: number) {
  const max = getMaxPhotoConversions(plan)
  if (max === null) return true
  if (max === 0) return false
  return photoConversionsUsed < max
}

export function folderLimitMessage(plan: UserPlan | null) {
  if (plan === 'free') {
    return `Free plan includes ${FREE_MAX_FOLDERS} folder. Upgrade to Pro for unlimited folders.`
  }
  return 'Sign in to create folders.'
}

export function photoConversionLimitMessage(plan: UserPlan | null, used: number) {
  const max = getMaxPhotoConversions(plan)
  if (plan === 'free' && max !== null && used >= max) {
    return `You have used all ${FREE_MAX_PHOTO_CONVERSIONS} photo conversions on the Free plan. Upgrade to Pro for unlimited scans.`
  }
  if (!plan) {
    return 'Sign in to convert photos to markdown.'
  }
  return 'Photo conversion is not available on your plan.'
}

export function photoConversionsRemaining(plan: UserPlan | null, used: number) {
  const max = getMaxPhotoConversions(plan)
  if (max === null) return null
  return Math.max(0, max - used)
}
