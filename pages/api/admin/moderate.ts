import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { isAdminAuthorized } from '../../../lib/admin'
import type { ModerationAction } from '../../../lib/moderation'
import { applyModerationAction } from '../../../lib/moderationDb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await auth.api.getSession({
    headers: req.headers as any,
  })

  if (!isAdminAuthorized(req, session?.user?.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const fileId = typeof req.body?.fileId === 'string' ? req.body.fileId.trim() : ''
  const action = req.body?.action as ModerationAction
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined
  const warningMessage = typeof req.body?.warningMessage === 'string' ? req.body.warningMessage : undefined

  if (!fileId || !['remove', 'private', 'warn', 'restore'].includes(action)) {
    return res.status(400).json({ error: 'fileId and valid action are required' })
  }

  try {
    const result = await applyModerationAction(fileId, action, {
      actorEmail: session?.user?.email || undefined,
      reason,
      warningMessage,
    })

    return res.status(200).json({
      success: true,
      ...result,
      message: `Moderation action "${action}" applied.`,
    })
  } catch (error) {
    console.error('Moderation error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Moderation failed',
    })
  }
}
