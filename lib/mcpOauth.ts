import { createHash, randomBytes } from 'crypto'
import sql from './neonClient'
import { readBearerToken, userIdForIntegrationToken } from './integrationTokens'
import { publicSiteOrigin } from './shareMarkdown'

let schemaReady: Promise<void> | null = null

export function ensureOauthSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS mcp_oauth_clients (
          client_id TEXT PRIMARY KEY,
          client_name TEXT,
          redirect_uris TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS mcp_oauth_codes (
          code_hash TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          redirect_uri TEXT NOT NULL,
          code_challenge TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (
          token_hash TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          user_id TEXT NOT NULL,
          client_id TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ
        )
      `
    })().catch((error) => {
      schemaReady = null
      throw error
    })
  }
  return schemaReady
}

const OAUTH_REDIRECT_HOSTS = new Set([
  'claude.ai',
  'www.claude.ai',
  'claude.com',
  'www.claude.com',
  'chatgpt.com',
  'www.chatgpt.com',
  'chat.openai.com',
])

export function isAllowedOauthRedirect(uri: string) {
  try {
    const url = new URL(uri)
    if (url.username || url.password) return false
    if (url.protocol === 'https:' && OAUTH_REDIRECT_HOSTS.has(url.hostname)) return true
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const callback = url.pathname === '/callback' || url.pathname.startsWith('/callback/')
    return url.protocol === 'http:' && loopback && callback
  } catch {
    return false
  }
}

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function pkceS256(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url')
}

export async function registerOauthClient(name: string | undefined, redirectUris: string[]) {
  await ensureOauthSchema()
  const clientId = `mdn_client_${randomBytes(18).toString('base64url')}`
  await sql`
    INSERT INTO mcp_oauth_clients (client_id, client_name, redirect_uris)
    VALUES (${clientId}, ${name || 'Claude'}, ${JSON.stringify(redirectUris)})
  `
  return clientId
}

export async function getOauthClient(clientId: string) {
  await ensureOauthSchema()
  const rows = await sql`
    SELECT client_id, client_name, redirect_uris
    FROM mcp_oauth_clients
    WHERE client_id = ${clientId}
  `
  const row = rows[0]
  if (!row) return null
  let redirectUris: string[] = []
  try {
    const parsed = JSON.parse(String(row.redirect_uris))
    if (Array.isArray(parsed)) redirectUris = parsed.filter((item) => typeof item === 'string')
  } catch {
    redirectUris = []
  }
  return {
    clientId: String(row.client_id),
    clientName: String(row.client_name || 'Claude'),
    redirectUris,
  }
}

export async function createAuthCode(options: {
  clientId: string
  userId: string
  redirectUri: string
  codeChallenge: string
}) {
  await ensureOauthSchema()
  const code = randomBytes(32).toString('base64url')
  await sql`
    INSERT INTO mcp_oauth_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, expires_at)
    VALUES (
      ${hashToken(code)},
      ${options.clientId},
      ${options.userId},
      ${options.redirectUri},
      ${options.codeChallenge},
      NOW() + INTERVAL '10 minutes'
    )
  `
  return code
}

async function issueTokenPair(userId: string, clientId: string) {
  const accessToken = `mdn_at_${randomBytes(32).toString('base64url')}`
  const refreshToken = `mdn_rt_${randomBytes(32).toString('base64url')}`
  await sql`
    INSERT INTO mcp_oauth_tokens (token_hash, kind, user_id, client_id, expires_at)
    VALUES (${hashToken(accessToken)}, 'access', ${userId}, ${clientId}, NOW() + INTERVAL '1 hour')
  `
  await sql`
    INSERT INTO mcp_oauth_tokens (token_hash, kind, user_id, client_id, expires_at)
    VALUES (${hashToken(refreshToken)}, 'refresh', ${userId}, ${clientId}, NOW() + INTERVAL '30 days')
  `
  return { accessToken, refreshToken, expiresIn: 3600 }
}

export async function exchangeAuthCode(options: {
  code: string
  clientId: string
  redirectUri: string
  codeVerifier: string
}) {
  await ensureOauthSchema()
  const rows = await sql`
    UPDATE mcp_oauth_codes
    SET used_at = NOW()
    WHERE code_hash = ${hashToken(options.code)}
      AND used_at IS NULL
      AND expires_at > NOW()
      AND client_id = ${options.clientId}
      AND redirect_uri = ${options.redirectUri}
    RETURNING user_id, code_challenge
  `
  const row = rows[0]
  if (!row) return null
  if (pkceS256(options.codeVerifier) !== String(row.code_challenge)) return null
  return issueTokenPair(String(row.user_id), options.clientId)
}

export async function refreshOauthToken(refreshToken: string, clientId: string) {
  await ensureOauthSchema()
  const rows = await sql`
    UPDATE mcp_oauth_tokens
    SET revoked_at = NOW()
    WHERE token_hash = ${hashToken(refreshToken)}
      AND kind = 'refresh'
      AND client_id = ${clientId}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    RETURNING user_id
  `
  if (!rows[0]) return null
  return issueTokenPair(String(rows[0].user_id), clientId)
}

export async function userIdForOauthAccessToken(token: string) {
  await ensureOauthSchema()
  const rows = await sql`
    SELECT user_id
    FROM mcp_oauth_tokens
    WHERE token_hash = ${hashToken(token)}
      AND kind = 'access'
      AND revoked_at IS NULL
      AND expires_at > NOW()
  `
  const userId = rows[0]?.user_id
  return typeof userId === 'string' ? userId : null
}

export async function userIdFromMcpRequest(authorization: string | string[] | undefined) {
  const token = readBearerToken(authorization)
  if (!token) return null
  if (token.startsWith('mdnest_')) return userIdForIntegrationToken(token)
  if (token.startsWith('mdn_at_')) return userIdForOauthAccessToken(token)
  return (await userIdForOauthAccessToken(token)) || (await userIdForIntegrationToken(token))
}

export function oauthMetadata() {
  const origin = publicSiteOrigin()
  return {
    protectedResource: {
      resource: `${origin}/api/mcp`,
      authorization_servers: [origin],
      scopes_supported: ['share'],
      bearer_methods_supported: ['header'],
    },
    authorizationServer: {
      issuer: origin,
      authorization_endpoint: `${origin}/api/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      authorization_response_iss_parameter_supported: true,
      scopes_supported: ['share', 'offline_access'],
    },
  }
}

export function setMcpUnauthorized(res: { setHeader: (name: string, value: string) => void }) {
  const origin = publicSiteOrigin()
  res.setHeader(
    'WWW-Authenticate',
    `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`
  )
}
