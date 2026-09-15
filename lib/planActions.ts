import {
  applyFreeStorageToUserFiles,
  applyProStorageToUserFiles,
  setUserPlan,
} from './dbSchema'
import type { UserPlan } from './storagePolicy'

export async function applyPlanToUser(userId: string, plan: UserPlan) {
  await setUserPlan(userId, plan)

  if (plan === 'pro') {
    await applyProStorageToUserFiles(userId)
    return
  }

  await applyFreeStorageToUserFiles(userId)
}
