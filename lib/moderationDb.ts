import sql from './neonClient'
import type { ModerationAction } from './moderation'
import { DEFAULT_WARNING_MESSAGE } from './moderation'
import { sendModerationWarningEmail } from './email'

export type AdminFileRow = {
  id: string
  title: string
  author: string | null
  is_public: boolean
  user_id: string | null
  user_email: string | null
  storage_tier: string | null
  created_at: string
  view_count: number
  share_count: number
  edit_count: number
  like_count: number
  comment_count: number
  moderation_status: string
  moderation_reason: string | null
  viral_score: number
}

export type ActivityRow = {
  id: string
  kind: string
  label: string
  at: string
  file_id: string | null
  file_title: string | null
  actor_email: string | null
}

export async function recordModerationEvent(
  eventType: string,
  options: {
    fileId?: string | null
    userId?: string | null
    actorEmail?: string | null
    message?: string | null
  }
) {
  await sql`
    INSERT INTO moderation_events (event_type, file_id, user_id, actor_email, message)
    VALUES (
      ${eventType},
      ${options.fileId || null},
      ${options.userId || null},
      ${options.actorEmail || null},
      ${options.message || null}
    )
  `
}

export async function applyModerationAction(
  fileId: string,
  action: ModerationAction,
  options: {
    actorEmail?: string
    reason?: string
    warningMessage?: string
  }
) {
  const fileResult = await sql`
    SELECT id, title, user_id, is_public, moderation_status
    FROM files WHERE id = ${fileId}
  `
  const file = fileResult[0]
  if (!file) {
    throw new Error('File not found')
  }

  const reason = options.reason?.trim() || null
  const actorEmail = options.actorEmail || null

  if (action === 'remove') {
    await sql`
      UPDATE files
      SET
        moderation_status = 'removed',
        moderation_reason = ${reason},
        moderated_at = NOW(),
        moderated_by = ${actorEmail},
        is_public = false,
        updated_at = NOW()
      WHERE id = ${fileId}
    `
    await recordModerationEvent('file_removed', {
      fileId,
      userId: file.user_id,
      actorEmail,
      message: reason,
    })
    return { status: 'removed' as const }
  }

  if (action === 'private') {
    await sql`
      UPDATE files
      SET
        is_public = false,
        updated_at = NOW()
      WHERE id = ${fileId}
    `
    await recordModerationEvent('file_private', {
      fileId,
      userId: file.user_id,
      actorEmail,
      message: reason,
    })
    return { status: 'private' as const }
  }

  if (action === 'warn') {
    await sql`
      UPDATE files
      SET
        moderation_status = 'warned',
        moderation_reason = ${reason},
        moderated_at = NOW(),
        moderated_by = ${actorEmail},
        updated_at = NOW()
      WHERE id = ${fileId}
    `

    if (file.user_id) {
      const warningText = options.warningMessage?.trim() || reason || DEFAULT_WARNING_MESSAGE

      await sql`
        INSERT INTO user_warnings (user_id, file_id, message, created_by)
        VALUES (
          ${file.user_id},
          ${fileId},
          ${warningText},
          ${actorEmail}
        )
      `

      const userRows = await sql`
        SELECT email, name FROM "user" WHERE id = ${file.user_id}
      `
      const warnedUser = userRows[0]
      if (warnedUser?.email) {
        sendModerationWarningEmail({
          to: warnedUser.email,
          name: warnedUser.name,
          message: warningText,
          fileTitle: file.title,
        }).catch((error) => {
          console.error('[email] Failed to send moderation warning:', error)
        })
      }
    }

    await recordModerationEvent('user_warned', {
      fileId,
      userId: file.user_id,
      actorEmail,
      message: options.warningMessage || reason,
    })
    return { status: 'warned' as const }
  }

  await sql`
    UPDATE files
    SET
      moderation_status = 'active',
      moderation_reason = NULL,
      moderated_at = NULL,
      moderated_by = NULL,
      updated_at = NOW()
    WHERE id = ${fileId}
  `
  await recordModerationEvent('file_restored', {
    fileId,
    userId: file.user_id,
    actorEmail,
    message: reason,
  })
  return { status: 'active' as const }
}

export type AdminDashboardStats = {
  users: number
  files: number
  public_files: number
  removed_files: number
  warned_files: number
  total_views: number
  total_shares: number
  total_warnings: number
}

export type AdminAnalytics = AdminDashboardStats & {
  pro_users: number
  free_users: number
  verified_users: number
  google_users: number
  email_users: number
  users_7d: number
  users_30d: number
  guest_files: number
  signed_in_files: number
  private_files: number
  active_files: number
  pro_tier_files: number
  free_tier_files: number
  guest_tier_files: number
  files_7d: number
  files_30d: number
  total_edits: number
  total_likes: number
  total_comments: number
  moderation_events: number
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [stats] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM "user") as users,
      (SELECT COUNT(*)::int FROM files) as files,
      (SELECT COUNT(*)::int FROM files WHERE is_public = true AND COALESCE(moderation_status, 'active') != 'removed') as public_files,
      (SELECT COUNT(*)::int FROM files WHERE moderation_status = 'removed') as removed_files,
      (SELECT COUNT(*)::int FROM files WHERE moderation_status = 'warned') as warned_files,
      (SELECT COALESCE(SUM(view_count), 0)::int FROM files) as total_views,
      (SELECT COALESCE(SUM(share_count), 0)::int FROM files) as total_shares,
      (SELECT COUNT(*)::int FROM user_warnings) as total_warnings
  `
  return stats as AdminDashboardStats
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const [stats] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM "user") as users,
      (SELECT COUNT(*)::int FROM files) as files,
      (SELECT COUNT(*)::int FROM files WHERE is_public = true AND COALESCE(moderation_status, 'active') != 'removed') as public_files,
      (SELECT COUNT(*)::int FROM files WHERE moderation_status = 'removed') as removed_files,
      (SELECT COUNT(*)::int FROM files WHERE moderation_status = 'warned') as warned_files,
      (SELECT COALESCE(SUM(view_count), 0)::int FROM files) as total_views,
      (SELECT COALESCE(SUM(share_count), 0)::int FROM files) as total_shares,
      (SELECT COUNT(*)::int FROM user_warnings) as total_warnings,
      (SELECT COUNT(*)::int FROM "user" WHERE COALESCE(plan, 'free') = 'pro') as pro_users,
      (SELECT COUNT(*)::int FROM "user" WHERE COALESCE(plan, 'free') != 'pro') as free_users,
      (SELECT COUNT(*)::int FROM "user" WHERE "emailVerified" = true) as verified_users,
      (SELECT COUNT(*)::int FROM "user" u WHERE EXISTS (
        SELECT 1 FROM account a WHERE a."userId" = u.id AND a."providerId" = 'google'
      )) as google_users,
      (SELECT COUNT(*)::int FROM "user" u WHERE NOT EXISTS (
        SELECT 1 FROM account a WHERE a."userId" = u.id AND a."providerId" = 'google'
      )) as email_users,
      (SELECT COUNT(*)::int FROM "user" WHERE "createdAt" >= NOW() - INTERVAL '7 days') as users_7d,
      (SELECT COUNT(*)::int FROM "user" WHERE "createdAt" >= NOW() - INTERVAL '30 days') as users_30d,
      (SELECT COUNT(*)::int FROM files WHERE user_id IS NULL) as guest_files,
      (SELECT COUNT(*)::int FROM files WHERE user_id IS NOT NULL) as signed_in_files,
      (SELECT COUNT(*)::int FROM files WHERE is_public = false) as private_files,
      (SELECT COUNT(*)::int FROM files WHERE COALESCE(moderation_status, 'active') = 'active') as active_files,
      (SELECT COUNT(*)::int FROM files WHERE COALESCE(storage_tier, 'guest') = 'pro') as pro_tier_files,
      (SELECT COUNT(*)::int FROM files WHERE storage_tier = 'free') as free_tier_files,
      (SELECT COUNT(*)::int FROM files WHERE user_id IS NULL OR COALESCE(storage_tier, 'guest') = 'guest') as guest_tier_files,
      (SELECT COUNT(*)::int FROM files WHERE created_at >= NOW() - INTERVAL '7 days') as files_7d,
      (SELECT COUNT(*)::int FROM files WHERE created_at >= NOW() - INTERVAL '30 days') as files_30d,
      (SELECT COALESCE(SUM(edit_count), 0)::int FROM files) as total_edits,
      (SELECT COUNT(*)::int FROM likes) as total_likes,
      (SELECT COUNT(*)::int FROM comments) as total_comments,
      (SELECT COUNT(*)::int FROM moderation_events) as moderation_events
  `
  return stats as AdminAnalytics
}

export async function getViralPosts(limit = 12): Promise<AdminFileRow[]> {
  const rows = await sql`
    SELECT
      f.id,
      f.title,
      f.author,
      f.is_public,
      f.user_id,
      u.email as user_email,
      f.storage_tier,
      f.created_at::text as created_at,
      COALESCE(f.view_count, 0)::int as view_count,
      COALESCE(f.share_count, 0)::int as share_count,
      COALESCE(f.edit_count, 0)::int as edit_count,
      COALESCE(l.like_count, 0)::int as like_count,
      COALESCE(c.comment_count, 0)::int as comment_count,
      COALESCE(f.moderation_status, 'active') as moderation_status,
      f.moderation_reason,
      (
        COALESCE(f.view_count, 0)
        + COALESCE(f.share_count, 0) * 3
        + COALESCE(l.like_count, 0) * 2
        + COALESCE(c.comment_count, 0) * 2
      )::int as viral_score
    FROM files f
    LEFT JOIN "user" u ON u.id = f.user_id
    LEFT JOIN (
      SELECT file_id, COUNT(*)::int as like_count FROM likes GROUP BY file_id
    ) l ON l.file_id = f.id
    LEFT JOIN (
      SELECT file_id, COUNT(*)::int as comment_count FROM comments GROUP BY file_id
    ) c ON c.file_id = f.id
    WHERE COALESCE(f.moderation_status, 'active') != 'removed'
    ORDER BY viral_score DESC, f.created_at DESC
    LIMIT ${limit}
  `
  return rows as AdminFileRow[]
}

export async function getAdminActivity(limit = 40): Promise<ActivityRow[]> {
  const rows = await sql`
    SELECT * FROM (
      SELECT
        me.id::text as id,
        me.event_type as kind,
        COALESCE(me.message, me.event_type) as label,
        me.created_at::text as at,
        me.file_id::text as file_id,
        f.title as file_title,
        me.actor_email
      FROM moderation_events me
      LEFT JOIN files f ON f.id = me.file_id

      UNION ALL

      SELECT
        fe.id::text as id,
        ('edit_' || fe.edit_type) as kind,
        COALESCE('Edited: ' || fe.title, 'Document edited') as label,
        fe.created_at::text as at,
        fe.file_id::text as file_id,
        fe.title as file_title,
        u.email as actor_email
      FROM file_edits fe
      LEFT JOIN "user" u ON u.id = fe.user_id

      UNION ALL

      SELECT
        f.id::text as id,
        'file_created' as kind,
        'New document: ' || f.title as label,
        f.created_at::text as at,
        f.id::text as file_id,
        f.title as file_title,
        u.email as actor_email
      FROM files f
      LEFT JOIN "user" u ON u.id = f.user_id
    ) activity
    ORDER BY at DESC
    LIMIT ${limit}
  `
  return rows as ActivityRow[]
}

export type AdminFileStatusFilter =
  | 'all'
  | 'active'
  | 'warned'
  | 'removed'
  | 'public'
  | 'private'
  | 'guest'

export type AdminFileSort = 'newest' | 'oldest' | 'viral' | 'views' | 'shares'

const adminFileSortClause: Record<AdminFileSort, string> = {
  newest: 'f.created_at DESC',
  oldest: 'f.created_at ASC',
  viral: 'viral_score DESC, f.created_at DESC',
  views: 'view_count DESC, f.created_at DESC',
  shares: 'share_count DESC, f.created_at DESC',
}

export async function listAdminFiles(options: {
  query?: string
  status?: AdminFileStatusFilter
  sort?: AdminFileSort
  limit?: number
}): Promise<AdminFileRow[]> {
  const query = options.query?.trim() || ''
  const status = options.status || 'all'
  const sort = options.sort || 'newest'
  const limit = options.limit ?? 50
  const pattern = `%${query}%`
  const hasQuery = query.length > 0
  const orderBy = adminFileSortClause[sort] || adminFileSortClause.newest

  const rows = await sql(
    `
    SELECT
      f.id,
      f.title,
      f.author,
      f.is_public,
      f.user_id,
      u.email as user_email,
      f.storage_tier,
      f.created_at::text as created_at,
      COALESCE(f.view_count, 0)::int as view_count,
      COALESCE(f.share_count, 0)::int as share_count,
      COALESCE(f.edit_count, 0)::int as edit_count,
      COALESCE(l.like_count, 0)::int as like_count,
      COALESCE(c.comment_count, 0)::int as comment_count,
      COALESCE(f.moderation_status, 'active') as moderation_status,
      f.moderation_reason,
      (
        COALESCE(f.view_count, 0)
        + COALESCE(f.share_count, 0) * 3
        + COALESCE(l.like_count, 0) * 2
        + COALESCE(c.comment_count, 0) * 2
      )::int as viral_score
    FROM files f
    LEFT JOIN "user" u ON u.id = f.user_id
    LEFT JOIN (
      SELECT file_id, COUNT(*)::int as like_count FROM likes GROUP BY file_id
    ) l ON l.file_id = f.id
    LEFT JOIN (
      SELECT file_id, COUNT(*)::int as comment_count FROM comments GROUP BY file_id
    ) c ON c.file_id = f.id
    WHERE
      (
        $1 = false
        OR f.title ILIKE $2
        OR COALESCE(f.author, '') ILIKE $2
        OR COALESCE(u.email, '') ILIKE $2
      )
      AND (
        $3 = 'all'
        OR ($3 = 'active' AND COALESCE(f.moderation_status, 'active') = 'active')
        OR ($3 = 'warned' AND f.moderation_status = 'warned')
        OR ($3 = 'removed' AND f.moderation_status = 'removed')
        OR ($3 = 'public' AND f.is_public = true)
        OR ($3 = 'private' AND f.is_public = false)
        OR ($3 = 'guest' AND f.user_id IS NULL)
      )
    ORDER BY ${orderBy}
    LIMIT $4
    `,
    [hasQuery, pattern, status, limit]
  )

  return rows as AdminFileRow[]
}

export async function searchAdminFiles(query: string, limit = 30): Promise<AdminFileRow[]> {
  const pattern = `%${query.trim()}%`
  const rows = await sql`
    SELECT
      f.id,
      f.title,
      f.author,
      f.is_public,
      f.user_id,
      u.email as user_email,
      f.storage_tier,
      f.created_at::text as created_at,
      COALESCE(f.view_count, 0)::int as view_count,
      COALESCE(f.share_count, 0)::int as share_count,
      COALESCE(f.edit_count, 0)::int as edit_count,
      COALESCE(l.like_count, 0)::int as like_count,
      COALESCE(c.comment_count, 0)::int as comment_count,
      COALESCE(f.moderation_status, 'active') as moderation_status,
      f.moderation_reason,
      (
        COALESCE(f.view_count, 0)
        + COALESCE(f.share_count, 0) * 3
        + COALESCE(l.like_count, 0) * 2
        + COALESCE(c.comment_count, 0) * 2
      )::int as viral_score
    FROM files f
    LEFT JOIN "user" u ON u.id = f.user_id
    LEFT JOIN (
      SELECT file_id, COUNT(*)::int as like_count FROM likes GROUP BY file_id
    ) l ON l.file_id = f.id
    LEFT JOIN (
      SELECT file_id, COUNT(*)::int as comment_count FROM comments GROUP BY file_id
    ) c ON c.file_id = f.id
    WHERE f.title ILIKE ${pattern}
      OR COALESCE(f.author, '') ILIKE ${pattern}
      OR COALESCE(u.email, '') ILIKE ${pattern}
    ORDER BY f.created_at DESC
    LIMIT ${limit}
  `
  return rows as AdminFileRow[]
}

export async function getUserWarnings(userId: string) {
  const rows = await sql`
    SELECT
      w.id,
      w.message,
      w.created_at::text as created_at,
      w.file_id,
      f.title as file_title
    FROM user_warnings w
    LEFT JOIN files f ON f.id = w.file_id
    WHERE w.user_id = ${userId}
    ORDER BY w.created_at DESC
    LIMIT 20
  `
  return rows
}
