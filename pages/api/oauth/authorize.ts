import type { NextApiRequest, NextApiResponse } from 'next'
import { getUser } from '../../../lib/auth'
import { getUserPlan } from '../../../lib/dbSchema'
import { createAuthCode, getOauthClient, isAllowedOauthRedirect } from '../../../lib/mcpOauth'
import { publicSiteOrigin } from '../../../lib/shareMarkdown'

function one(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function oauthResult(redirectUri: string, params: Record<string, string>) {
  const next = new URL(redirectUri)
  Object.entries(params).forEach(([key, value]) => {
    if (value) next.searchParams.set(key, value)
  })
  next.searchParams.set('iss', publicSiteOrigin())
  return next.toString()
}

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const params = req.method === 'POST' ? (req.body || {}) : req.query
  const responseType = one(params.response_type)
  const clientId = one(params.client_id)
  const redirectUri = one(params.redirect_uri)
  const state = one(params.state)
  const codeChallenge = one(params.code_challenge)
  const codeChallengeMethod = one(params.code_challenge_method)

  if (responseType !== 'code' || !clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== 'S256') {
    if (redirectUri && isAllowedOauthRedirect(redirectUri)) {
      return res.redirect(302, oauthResult(redirectUri, { error: 'invalid_request', state }))
    }
    return res.status(400).send('The app did not send a valid sign-in request.')
  }

  const client = await getOauthClient(clientId)
  if (!client || !client.redirectUris.includes(redirectUri)) {
    if (redirectUri && isAllowedOauthRedirect(redirectUri)) {
      return res.redirect(302, oauthResult(redirectUri, { error: 'invalid_client', state }))
    }
    return res.status(400).send('This app is not registered with md-nest.')
  }

  const user = await getUser(req)
  if (!user?.id) {
    const back = req.url || '/api/oauth/authorize'
    return res.redirect(302, `/login?redirect=${encodeURIComponent(back)}`)
  }

  const plan = await getUserPlan(user.id)
  if (plan !== 'pro') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(403).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Pro required</title></head>
<body style="font-family:ui-sans-serif,system-ui,sans-serif;background:#f1eee6;color:#1c1917;margin:0">
<main style="max-width:440px;margin:12vh auto;padding:28px;background:#fff;border-radius:16px">
<h1>Pro account required</h1>
<p>Sharing saves notes to your md-nest account. That account needs to be Pro.</p>
<p><a href="/pricing">See Pro</a></p>
</main></body></html>`)
  }

  if (req.method === 'POST') {
    const code = await createAuthCode({
      clientId,
      userId: user.id,
      redirectUri,
      codeChallenge,
    })
    return res.redirect(302, oauthResult(redirectUri, { code, state }))
  }

  if (req.method !== 'GET') return res.status(405).end()

  const hidden = [
    ['response_type', responseType],
    ['client_id', clientId],
    ['redirect_uri', redirectUri],
    ['state', state],
    ['code_challenge', codeChallenge],
    ['code_challenge_method', codeChallengeMethod],
  ].map(([name, value]) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}" />`).join('')

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connect to md-nest</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f1eee6; color: #1c1917; }
    main { max-width: 440px; margin: 12vh auto; padding: 28px; background: #fff; border-radius: 16px; }
    button { width: 100%; border: 0; border-radius: 999px; padding: 12px 16px; font: inherit; font-weight: 700; background: #0f766e; color: #fff; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <h1>Let ${esc(client.clientName)} share nests</h1>
    <p>Signed in as ${esc(user.email || 'your account')}.</p>
    <form method="post">${hidden}<button type="submit">Allow</button></form>
  </main>
</body>
</html>`)
}
