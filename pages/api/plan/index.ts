import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import {
  countFoldersByUser,
  getPhotoConversionsUsed,
  getUserPlan,
} from '../../../lib/dbSchema'
import {
  FREE_MAX_FOLDERS,
  FREE_MAX_PHOTO_CONVERSIONS,
  getMaxFolders,
  getMaxPhotoConversions,
  photoConversionsRemaining,
} from '../../../lib/planLimits'
import { FREE_RETENTION_DAYS, GUEST_RETENTION_DAYS } from '../../../lib/storagePolicy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await auth.api.getSession({
    headers: req.headers as any,
  })

  if (!session?.user?.id) {
    return res.status(200).json({
      plan: null,
      retentionDays: GUEST_RETENTION_DAYS,
      isPermanent: false,
      limits: {
        maxFolders: 0,
        foldersUsed: 0,
        maxPhotoConversions: 0,
        photoConversionsUsed: 0,
        photoConversionsRemaining: 0,
      },
    })
  }

  const userId = session.user.id
  const [plan, foldersUsed, photoConversionsUsed] = await Promise.all([
    getUserPlan(userId),
    countFoldersByUser(userId),
    getPhotoConversionsUsed(userId),
  ])

  const maxFolders = getMaxFolders(plan)
  const maxPhotoConversions = getMaxPhotoConversions(plan)

  return res.status(200).json({
    plan,
    retentionDays: plan === 'pro' ? null : FREE_RETENTION_DAYS,
    isPermanent: plan === 'pro',
    limits: {
      maxFolders,
      foldersUsed,
      maxPhotoConversions,
      photoConversionsUsed,
      photoConversionsRemaining: photoConversionsRemaining(plan, photoConversionsUsed),
      freeMaxFolders: FREE_MAX_FOLDERS,
      freeMaxPhotoConversions: FREE_MAX_PHOTO_CONVERSIONS,
    },
  })
}
