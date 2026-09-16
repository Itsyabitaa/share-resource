import sql from './neonClient'
import { getUserGroqApiKey } from './kimemAiCredentials'
import { getUserUsageSummary, type UserUsageSummary } from './usageSummary'
import { KIMEM_TRIAL_MAX } from './kimemTrial'

export type AdminUserApiListItem = {
  kimemUsesTotal: number
  kimemTrialUsed: number
  kimemTrialMax: number
  photoConversionsUsed: number
  hasGroqKey: boolean
  groqKeyDisplay: string | null
}

export type AdminUserApiDetail = {
  userId: string
  email: string
  name: string | null
  groqApiKey: string | null
  groqKeyDisplay: string | null
  usage: UserUsageSummary
}

export async function getAdminUserApiListItems(
  userIds: string[]
): Promise<Map<string, AdminUserApiListItem>> {
  const map = new Map<string, AdminUserApiListItem>()
  if (userIds.length === 0) return map

  for (const id of userIds) {
    const rows = await sql`
      SELECT
        u.id,
        COALESCE(u.kimem_uses_total, 0)::int AS kimem_uses_total,
        COALESCE(u.kimem_trial_uses, 0)::int AS kimem_trial_uses,
        COALESCE(u.photo_conversions_used, 0)::int AS photo_conversions_used,
        uc.groq_key_display,
        (uc.groq_api_key IS NOT NULL OR uc.openai_api_key IS NOT NULL) AS has_groq_key
      FROM "user" u
      LEFT JOIN user_credentials uc ON uc.user_id = u.id
      WHERE u.id = ${id}
    `
    const row = rows[0]
    if (!row) continue
    map.set(id, {
      kimemUsesTotal: Number(row.kimem_uses_total ?? 0),
      kimemTrialUsed: Number(row.kimem_trial_uses ?? 0),
      kimemTrialMax: KIMEM_TRIAL_MAX,
      photoConversionsUsed: Number(row.photo_conversions_used ?? 0),
      hasGroqKey: !!row.has_groq_key,
      groqKeyDisplay: (row.groq_key_display as string | null) || null,
    })
  }

  return map
}

export async function getAdminUserApiDetail(userId: string): Promise<AdminUserApiDetail | null> {
  const userRows = await sql`
    SELECT id, email, name FROM "user" WHERE id = ${userId}
  `
  if (userRows.length === 0) return null

  const user = userRows[0]
  const [groqApiKey, usage, listItems] = await Promise.all([
    getUserGroqApiKey(userId),
    getUserUsageSummary(userId),
    getAdminUserApiListItems([userId]),
  ])

  const list = listItems.get(userId)

  return {
    userId,
    email: user.email as string,
    name: user.name as string | null,
    groqApiKey: groqApiKey?.trim() || null,
    groqKeyDisplay: list?.groqKeyDisplay || (groqApiKey ? `${groqApiKey.slice(0, 7)}…${groqApiKey.slice(-4)}` : null),
    usage,
  }
}
