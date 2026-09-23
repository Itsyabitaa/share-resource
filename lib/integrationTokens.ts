import { createHash, randomBytes } from 'crypto'
import sql from './neonClient'

export type IntegrationTokenRow = {
  id: string
  label: string | null
  token_display: string
  created_at: string
  last_used_at: string | null
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function readBearerToken(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header
  if (!value) return null
  const match = value.match(/^Bearer\s+(\S+)$/i)
  return match?.[1]?.trim() || null
}

export async function createIntegrationToken(userId: string, label?: string) {
  const token = `mdnest_${randomBytes(24).toString('base64url')}`
  const tokenDisplay = `${token.slice(0, 14)}…${token.slice(-4)}`
  const rows = await sql`
    INSERT INTO integration_tokens (user_id, label, token_hash, token_display)
    VALUES (${userId}, ${label?.trim() || 'Claude'}, ${hashToken(token)}, ${tokenDisplay})
    RETURNING id, label, token_display, created_at::text as created_at
  `
  return { token, row: rows[0] as IntegrationTokenRow }
}

export async function listIntegrationTokens(userId: string): Promise<IntegrationTokenRow[]> {
  const rows = await sql`
    SELECT id, label, token_display, created_at::text as created_at, last_used_at::text as last_used_at
    FROM integration_tokens
    WHERE user_id = ${userId} AND revoked_at IS NULL
    ORDER BY created_at DESC
  `
  return rows as IntegrationTokenRow[]
}

export async function revokeIntegrationToken(userId: string, tokenId: string) {
  const rows = await sql`
    UPDATE integration_tokens
    SET revoked_at = NOW()
    WHERE id = ${tokenId} AND user_id = ${userId} AND revoked_at IS NULL
    RETURNING id
  `
  return rows.length > 0
}

export async function userIdForIntegrationToken(token: string) {
  const rows = await sql`
    UPDATE integration_tokens
    SET last_used_at = NOW()
    WHERE token_hash = ${hashToken(token)} AND revoked_at IS NULL
    RETURNING user_id
  `
  const userId = rows[0]?.user_id
  return typeof userId === 'string' ? userId : null
}
