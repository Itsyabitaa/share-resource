import sql from './neonClient'
import { decryptSafe, encryptSafe } from './encryption'
import { buildApiKeyDisplay } from './keyDisplay'

function pickStoredKey(row: Record<string, unknown>): string | null {
  const groq = row.groq_api_key as string | null | undefined
  if (groq) return decryptSafe(groq)
  const legacy = row.openai_api_key as string | null | undefined
  if (legacy) return decryptSafe(legacy)
  return null
}

export async function getUserGroqApiKey(userId: string): Promise<string | null> {
  const result = await sql`
    SELECT groq_api_key, openai_api_key FROM user_credentials WHERE user_id = ${userId}
  `
  if (result.length === 0) return null
  return pickStoredKey(result[0] as Record<string, unknown>)
}

export async function userHasGroqApiKey(userId: string): Promise<boolean> {
  const key = await getUserGroqApiKey(userId)
  return !!key?.trim()
}

export async function saveUserGroqApiKey(userId: string, apiKey: string | null): Promise<void> {
  const encrypted = apiKey ? encryptSafe(apiKey) : null
  const keyDisplay = apiKey ? buildApiKeyDisplay(apiKey) : null

  const existing = await sql`
    SELECT id FROM user_credentials WHERE user_id = ${userId}
  `

  if (existing.length > 0) {
    await sql`
      UPDATE user_credentials
      SET groq_api_key = ${encrypted},
          groq_key_display = ${keyDisplay},
          openai_api_key = NULL,
          updated_at = NOW()
      WHERE user_id = ${userId}
    `
    return
  }

  await sql`
    INSERT INTO user_credentials (user_id, groq_api_key, groq_key_display, use_custom_credentials)
    VALUES (${userId}, ${encrypted}, ${keyDisplay}, false)
  `
}

export async function deleteUserGroqApiKey(userId: string): Promise<void> {
  await sql`
    UPDATE user_credentials
    SET groq_api_key = NULL,
        groq_key_display = NULL,
        openai_api_key = NULL,
        updated_at = NOW()
    WHERE user_id = ${userId}
  `
}
