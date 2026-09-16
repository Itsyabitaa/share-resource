import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../../lib/auth'
import { isAdminAuthorized } from '../../../lib/admin'
import {
  addPlatformGroqKey,
  deletePlatformGroqKey,
  getEnvPlatformGroqKey,
  listPlatformGroqKeysAdmin,
  movePlatformGroqKey,
  setPlatformGroqKeyEnabled,
} from '../../../lib/platformGroqKeys'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await auth.api.getSession({
    headers: req.headers as any,
  })

  if (!isAdminAuthorized(req, session?.user?.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  if (req.method === 'GET') {
    const keys = await listPlatformGroqKeysAdmin()
    const envKey = getEnvPlatformGroqKey()
    return res.status(200).json({
      keys,
      envFallback: envKey
        ? {
            configured: true,
            keyDisplay: `${envKey.slice(0, 7)}…${envKey.slice(-4)}`,
            note: 'From GROQ_API_KEY / KIMEM_GROQ_API_KEY — used after DB keys or when pool is empty.',
          }
        : { configured: false },
    })
  }

  if (req.method === 'POST') {
    const { label, apiKey } = req.body as { label?: string; apiKey?: string }
    if (!apiKey?.trim()) {
      return res.status(400).json({ error: 'Groq API key is required' })
    }
    try {
      const key = await addPlatformGroqKey(label || null, apiKey)
      return res.status(201).json({ key })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add key'
      return res.status(400).json({ error: message })
    }
  }

  if (req.method === 'PATCH') {
    const { id, enabled, move } = req.body as {
      id?: string
      enabled?: boolean
      move?: 'up' | 'down'
    }
    if (!id) return res.status(400).json({ error: 'Key id required' })

    if (typeof enabled === 'boolean') {
      await setPlatformGroqKeyEnabled(id, enabled)
    }
    if (move === 'up' || move === 'down') {
      await movePlatformGroqKey(id, move)
    }

    const keys = await listPlatformGroqKeysAdmin()
    return res.status(200).json({ keys })
  }

  if (req.method === 'DELETE') {
    const id = (req.query.id as string) || (req.body as { id?: string })?.id
    if (!id) return res.status(400).json({ error: 'Key id required' })
    await deletePlatformGroqKey(id)
    const keys = await listPlatformGroqKeysAdmin()
    return res.status(200).json({ keys })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
