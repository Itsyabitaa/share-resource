import type { NextApiRequest, NextApiResponse } from 'next'
import { exchangeAuthCode, refreshOauthToken } from '../../../lib/mcpOauth'

function field(body: Record<string, unknown>, key: string) {
  const value = body?.[key]
  return typeof value === 'string' ? value : ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'invalid_request' })

  const body = (req.body || {}) as Record<string, unknown>
  const grantType = field(body, 'grant_type')
  const clientId = field(body, 'client_id')
  if (!clientId) return res.status(400).json({ error: 'invalid_request' })

  if (grantType === 'authorization_code') {
    const issued = await exchangeAuthCode({
      code: field(body, 'code'),
      clientId,
      redirectUri: field(body, 'redirect_uri'),
      codeVerifier: field(body, 'code_verifier'),
    })
    if (!issued) return res.status(400).json({ error: 'invalid_grant' })
    return res.status(200).json({
      access_token: issued.accessToken,
      token_type: 'Bearer',
      expires_in: issued.expiresIn,
      refresh_token: issued.refreshToken,
      scope: 'share',
    })
  }

  if (grantType === 'refresh_token') {
    const issued = await refreshOauthToken(field(body, 'refresh_token'), clientId)
    if (!issued) return res.status(400).json({ error: 'invalid_grant' })
    return res.status(200).json({
      access_token: issued.accessToken,
      token_type: 'Bearer',
      expires_in: issued.expiresIn,
      refresh_token: issued.refreshToken,
      scope: 'share',
    })
  }

  return res.status(400).json({ error: 'unsupported_grant_type' })
}
