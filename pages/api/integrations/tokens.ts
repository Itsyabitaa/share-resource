import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import {
  createIntegrationToken,
  listIntegrationTokens,
  revokeIntegrationToken,
} from '../../../lib/integrationTokens'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await auth.api.getSession({
    headers: req.headers as any,
  })
  const userId = session?.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Sign in required' })
  }

  if (req.method === 'GET') {
    const tokens = await listIntegrationTokens(userId)
    return res.status(200).json({ tokens })
  }

  if (req.method === 'POST') {
    const label = typeof req.body?.label === 'string' ? req.body.label : 'Claude'
    const created = await createIntegrationToken(userId, label)
    return res.status(200).json({
      token: created.token,
      row: created.row,
      message: 'Copy this token now. It will not be shown again.',
    })
  }

  if (req.method === 'DELETE') {
    const id = typeof req.body?.id === 'string' ? req.body.id : ''
    if (!id) return res.status(400).json({ error: 'Token id is required' })
    const revoked = await revokeIntegrationToken(userId, id)
    if (!revoked) return res.status(404).json({ error: 'Token not found' })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
