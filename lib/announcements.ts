import sql from './neonClient'
import type {
  AnnouncementAudience,
  AnnouncementColor,
  AnnouncementDisplay,
  AnnouncementPlacement,
  SiteAnnouncement,
} from './announcementTypes'

let schemaReady: Promise<void> | null = null

function asText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function ensureAnnouncementSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS site_announcements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          display TEXT NOT NULL DEFAULT 'banner',
          color TEXT NOT NULL DEFAULT 'teal',
          placement TEXT NOT NULL DEFAULT 'top',
          audience TEXT NOT NULL DEFAULT 'all',
          cta_label TEXT,
          cta_url TEXT,
          guide_steps TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
      const existing = await sql`SELECT id FROM site_announcements LIMIT 1`
      if (existing.length === 0) {
        await sql`
          INSERT INTO site_announcements (
            title, message, enabled, display, color, placement, audience, cta_label, guide_steps
          ) VALUES (
            'Share from Claude',
            'Turn a Claude note into your md-nest link. You own every note you allow.',
            TRUE,
            'both',
            'teal',
            'top',
            'pro',
            'Try it',
            ${[
              'In Claude, open Customize, then Connectors, then Add custom connector.',
              'Paste https://mdnest.vercel.app/api/mcp',
              'Select Sign in now.',
              'Select Register automatically.',
              'Click Add, then Connect.',
              'Sign in with this md-nest account and click Allow Claude.',
              'In a chat, type: Share this document to md-nest.',
              'Click Allow. The link is public and saved to your account.',
            ].join('\n')}
          )
        `
      }
    })().catch((error) => {
      schemaReady = null
      throw error
    })
  }
  return schemaReady
}

function mapRow(row: Record<string, unknown>): SiteAnnouncement {
  const steps = asText(row.guide_steps)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return {
    id: String(row.id),
    title: String(row.title),
    message: String(row.message),
    enabled: row.enabled === true || row.enabled === 't' || row.enabled === 'true',
    display: oneOf(row.display, ['banner', 'popup', 'both'] as const, 'banner'),
    color: oneOf(row.color, ['teal', 'amber', 'rose', 'ink'] as const, 'teal'),
    placement: oneOf(row.placement, ['top', 'bottom'] as const, 'top'),
    audience: oneOf(row.audience, ['all', 'guests', 'signed_in', 'free', 'pro'] as const, 'all'),
    ctaLabel: row.cta_label ? String(row.cta_label) : null,
    ctaUrl: row.cta_url ? String(row.cta_url) : null,
    guideSteps: steps,
  }
}

export async function listAnnouncements(enabledOnly = false): Promise<SiteAnnouncement[]> {
  await ensureAnnouncementSchema()
  const rows = enabledOnly
    ? await sql`SELECT * FROM site_announcements WHERE enabled = TRUE ORDER BY updated_at DESC`
    : await sql`SELECT * FROM site_announcements ORDER BY updated_at DESC`
  return (rows as Record<string, unknown>[]).map(mapRow)
}

export type AnnouncementInput = {
  id?: string
  title: string
  message: string
  enabled: boolean
  display: AnnouncementDisplay
  color: AnnouncementColor
  placement: AnnouncementPlacement
  audience: AnnouncementAudience
  ctaLabel?: string
  ctaUrl?: string
  guideSteps?: string
}

export async function saveAnnouncement(input: AnnouncementInput) {
  await ensureAnnouncementSchema()
  const display = oneOf(input.display, ['banner', 'popup', 'both'] as const, 'banner')
  const color = oneOf(input.color, ['teal', 'amber', 'rose', 'ink'] as const, 'teal')
  const placement = oneOf(input.placement, ['top', 'bottom'] as const, 'top')
  const audience = oneOf(input.audience, ['all', 'guests', 'signed_in', 'free', 'pro'] as const, 'all')
  const title = input.title.trim()
  const message = input.message.trim()
  if (!title || !message) throw new Error('Title and message are required')
  const guide = (input.guideSteps || '').trim()
  const ctaLabel = input.ctaLabel?.trim() || null
  const ctaUrl = input.ctaUrl?.trim() || null

  if (input.id) {
    const rows = await sql`
      UPDATE site_announcements
      SET title = ${title},
          message = ${message},
          enabled = ${input.enabled},
          display = ${display},
          color = ${color},
          placement = ${placement},
          audience = ${audience},
          cta_label = ${ctaLabel},
          cta_url = ${ctaUrl},
          guide_steps = ${guide || null},
          updated_at = NOW()
      WHERE id = ${input.id}
      RETURNING *
    `
    if (!rows[0]) throw new Error('Announcement not found')
    return mapRow(rows[0] as Record<string, unknown>)
  }

  const rows = await sql`
    INSERT INTO site_announcements (
      title, message, enabled, display, color, placement, audience, cta_label, cta_url, guide_steps
    ) VALUES (
      ${title}, ${message}, ${input.enabled}, ${display}, ${color},
      ${placement}, ${audience}, ${ctaLabel}, ${ctaUrl}, ${guide || null}
    )
    RETURNING *
  `
  return mapRow(rows[0] as Record<string, unknown>)
}

export async function setAnnouncementEnabled(id: string, enabled: boolean) {
  await ensureAnnouncementSchema()
  const rows = await sql`
    UPDATE site_announcements SET enabled = ${enabled}, updated_at = NOW() WHERE id = ${id} RETURNING *
  `
  if (!rows[0]) throw new Error('Announcement not found')
  return mapRow(rows[0] as Record<string, unknown>)
}

export async function deleteAnnouncement(id: string) {
  await ensureAnnouncementSchema()
  const rows = await sql`DELETE FROM site_announcements WHERE id = ${id} RETURNING id`
  return rows.length > 0
}
