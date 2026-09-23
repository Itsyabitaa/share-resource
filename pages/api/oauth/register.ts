import type { NextApiRequest, NextApiResponse } from 'next'
import { isAllowedOauthRedirect, registerOauthClient } from '../../../lib/mcpOauth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'invalid_request' })

  const redirectUris = Array.isArray(req.body?.redirect_uris)
    ? req.body.redirect_uris.filter((item: unknown) => typeof item === 'string')
    : []

  if (redirectUris.length === 0 || redirectUris.some((uri: string) => !isAllowedOauthRedirect(uri))) {
    return res.status(400).json({
      error: 'invalid_redirect_uri',
      error_description: 'Redirect URI must be the Claude connector callback.',
    })
  }

  const clientName = typeof req.body?.client_name === 'string' ? req.body.client_name : 'Claude'
  const clientId = await registerOauthClient(clientName, redirectUris)

  return res.status(201).json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  })
}
