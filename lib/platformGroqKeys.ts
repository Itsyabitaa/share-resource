import sql from './neonClient'
import { encryptSafe, decryptSafe } from './encryption'
import { validateGroqApiKey } from './kimemAi'
import { buildApiKeyDisplay } from './keyDisplay'

const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000

export type PlatformGroqKeyRow = {
  id: string
  label: string | null
  keyDisplay: string
  sortOrder: number
  enabled: boolean
  useCount: number
  lastUsedAt: string | null
  lastErrorAt: string | null
  lastError: string | null
  cooldownUntil: string | null
  createdAt: string
}

export function getEnvPlatformGroqKey(): string | null {
  const key = process.env.KIMEM_GROQ_API_KEY || process.env.GROQ_API_KEY
  return key?.trim() || null
}

export async function countActivePlatformGroqKeys(): Promise<number> {
  const result = await sql`
    SELECT COUNT(*)::int AS count
    FROM platform_groq_keys
    WHERE enabled = true
      AND (cooldown_until IS NULL OR cooldown_until <= NOW())
  `
  return result[0]?.count ?? 0
}

export async function hasPlatformGroqConfigured(): Promise<boolean> {
  const count = await countActivePlatformGroqKeys()
  if (count > 0) return true
  return !!getEnvPlatformGroqKey()
}

export async function listPlatformGroqKeysAdmin(): Promise<PlatformGroqKeyRow[]> {
  const result = await sql`
    SELECT
      id,
      label,
      key_display,
      sort_order,
      enabled,
      use_count,
      last_used_at::text AS last_used_at,
      last_error_at::text AS last_error_at,
      last_error,
      cooldown_until::text AS cooldown_until,
      created_at::text AS created_at
    FROM platform_groq_keys
    ORDER BY sort_order ASC, created_at ASC
  `

  return result.map(row => ({
    id: row.id as string,
    label: row.label as string | null,
    keyDisplay: row.key_display as string,
    sortOrder: Number(row.sort_order),
    enabled: !!row.enabled,
    useCount: Number(row.use_count ?? 0),
    lastUsedAt: row.last_used_at as string | null,
    lastErrorAt: row.last_error_at as string | null,
    lastError: row.last_error as string | null,
    cooldownUntil: row.cooldown_until as string | null,
    createdAt: row.created_at as string,
  }))
}

export async function addPlatformGroqKey(label: string | null, apiKey: string): Promise<PlatformGroqKeyRow> {
  const trimmed = apiKey.trim()
  const validation = await validateGroqApiKey(trimmed)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid Groq API key')
  }

  const maxOrder = await sql`
    SELECT COALESCE(MAX(sort_order), -1)::int AS max_order FROM platform_groq_keys
  `
  const sortOrder = (maxOrder[0]?.max_order ?? -1) + 1

  const result = await sql`
    INSERT INTO platform_groq_keys (
      label,
      api_key_encrypted,
      key_display,
      sort_order
    )
    VALUES (
      ${label?.trim() || null},
      ${encryptSafe(trimmed)},
      ${buildApiKeyDisplay(trimmed)},
      ${sortOrder}
    )
    RETURNING
      id,
      label,
      key_display,
      sort_order,
      enabled,
      use_count,
      last_used_at::text AS last_used_at,
      last_error_at::text AS last_error_at,
      last_error,
      cooldown_until::text AS cooldown_until,
      created_at::text AS created_at
  `

  const row = result[0]
  return {
    id: row.id as string,
    label: row.label as string | null,
    keyDisplay: row.key_display as string,
    sortOrder: Number(row.sort_order),
    enabled: !!row.enabled,
    useCount: 0,
    lastUsedAt: null,
    lastErrorAt: null,
    lastError: null,
    cooldownUntil: null,
    createdAt: row.created_at as string,
  }
}

export async function deletePlatformGroqKey(id: string): Promise<void> {
  await sql`DELETE FROM platform_groq_keys WHERE id = ${id}`
}

export async function setPlatformGroqKeyEnabled(id: string, enabled: boolean): Promise<void> {
  await sql`
    UPDATE platform_groq_keys
    SET enabled = ${enabled}, updated_at = NOW()
    WHERE id = ${id}
  `
}

export async function movePlatformGroqKey(id: string, direction: 'up' | 'down'): Promise<void> {
  const rows = await listPlatformGroqKeysAdmin()
  const index = rows.findIndex(r => r.id === id)
  if (index < 0) return
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= rows.length) return

  const a = rows[index]
  const b = rows[swapIndex]

  await sql`
    UPDATE platform_groq_keys SET sort_order = ${b.sortOrder}, updated_at = NOW() WHERE id = ${a.id}
  `
  await sql`
    UPDATE platform_groq_keys SET sort_order = ${a.sortOrder}, updated_at = NOW() WHERE id = ${b.id}
  `
}

export type PlatformGroqKeyCandidate = {
  id: string
  apiKey: string
}

/** DB keys first (priority order), then optional env fallback. */
export async function getPlatformGroqKeyPool(): Promise<PlatformGroqKeyCandidate[]> {
  const result = await sql`
    SELECT id, api_key_encrypted
    FROM platform_groq_keys
    WHERE enabled = true
      AND (cooldown_until IS NULL OR cooldown_until <= NOW())
    ORDER BY sort_order ASC, created_at ASC
  `

  const pool: PlatformGroqKeyCandidate[] = result.map(row => ({
    id: row.id as string,
    apiKey: decryptSafe(row.api_key_encrypted as string) || '',
  })).filter(entry => entry.apiKey.trim())

  const envKey = getEnvPlatformGroqKey()
  if (envKey) {
    pool.push({ id: 'env', apiKey: envKey })
  }

  return pool
}

export async function recordPlatformGroqKeySuccess(id: string): Promise<void> {
  if (id === 'env') return
  await sql`
    UPDATE platform_groq_keys
    SET
      use_count = use_count + 1,
      last_used_at = NOW(),
      last_error = NULL,
      updated_at = NOW()
    WHERE id = ${id}
  `
}

export async function recordPlatformGroqKeyFailure(
  id: string,
  errorMessage: string,
  options?: { disable?: boolean; cooldownMs?: number }
): Promise<void> {
  if (id === 'env') return

  const cooldownMs = options?.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const disable = options?.disable ?? false

  if (disable) {
    await sql`
      UPDATE platform_groq_keys
      SET
        enabled = false,
        last_error_at = NOW(),
        last_error = ${errorMessage.slice(0, 500)},
        updated_at = NOW()
      WHERE id = ${id}
    `
    return
  }

  await sql`
    UPDATE platform_groq_keys
    SET
      last_error_at = NOW(),
      last_error = ${errorMessage.slice(0, 500)},
      cooldown_until = NOW() + (${Math.max(1, Math.floor(cooldownMs / 1000))} * INTERVAL '1 second'),
      updated_at = NOW()
    WHERE id = ${id}
  `
}

