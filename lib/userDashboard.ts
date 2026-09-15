import sql from './neonClient'

export type UserDashboardFile = {
  id: string
  title: string
  is_public: boolean
  created_at: string
  view_count: number
  share_count: number
  expires_at: string | null
  moderation_status: string | null
}

export type UserDashboardActivity = {
  id: string
  label: string
  at: string
  file_id: string
  file_title: string | null
}

export type UserDashboardStats = {
  total_files: number
  public_files: number
  private_files: number
  folder_count: number
  total_views: number
  total_shares: number
  total_edits: number
  expiring_soon: number
  expiring_soon_list: UserDashboardFile[]
}

export async function getUserDashboard(userId: string) {
  const [statsRows, folderRows, recentFiles, topFiles, activityRows] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int as total_files,
          COUNT(*) FILTER (WHERE is_public = true)::int as public_files,
          COUNT(*) FILTER (WHERE is_public = false)::int as private_files,
          COALESCE(SUM(view_count), 0)::int as total_views,
          COALESCE(SUM(share_count), 0)::int as total_shares,
          COALESCE(SUM(edit_count), 0)::int as total_edits,
          COUNT(*) FILTER (
            WHERE expires_at IS NOT NULL
              AND expires_at > NOW()
              AND expires_at <= NOW() + INTERVAL '7 days'
          )::int as expiring_soon
        FROM files
        WHERE user_id = ${userId}
      `,
      sql`
        SELECT COUNT(*)::int as folder_count
        FROM folders
        WHERE user_id = ${userId}
      `,
      sql`
        SELECT
          id,
          title,
          is_public,
          created_at::text as created_at,
          COALESCE(view_count, 0)::int as view_count,
          COALESCE(share_count, 0)::int as share_count,
          expires_at::text as expires_at,
          COALESCE(moderation_status, 'active') as moderation_status
        FROM files
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 6
      `,
      sql`
        SELECT
          id,
          title,
          is_public,
          created_at::text as created_at,
          COALESCE(view_count, 0)::int as view_count,
          COALESCE(share_count, 0)::int as share_count,
          expires_at::text as expires_at,
          COALESCE(moderation_status, 'active') as moderation_status
        FROM files
        WHERE user_id = ${userId}
          AND COALESCE(moderation_status, 'active') != 'removed'
        ORDER BY view_count DESC, share_count DESC
        LIMIT 5
      `,
      sql`
        SELECT
          fe.id::text as id,
          COALESCE('Edited: ' || fe.title, 'Document updated') as label,
          fe.created_at::text as at,
          fe.file_id::text as file_id,
          f.title as file_title
        FROM file_edits fe
        JOIN files f ON f.id = fe.file_id
        WHERE fe.user_id = ${userId}
        ORDER BY fe.created_at DESC
        LIMIT 8
      `,
    ])

  let warningCount = 0
  try {
    const warningRows = await sql`
      SELECT COUNT(*)::int as warning_count
      FROM user_warnings
      WHERE user_id = ${userId}
    `
    warningCount = warningRows[0]?.warning_count ?? 0
  } catch {
    warningCount = 0
  }

  const expiringSoonList = await sql`
    SELECT
      id,
      title,
      is_public,
      created_at::text as created_at,
      COALESCE(view_count, 0)::int as view_count,
      COALESCE(share_count, 0)::int as share_count,
      expires_at::text as expires_at,
      COALESCE(moderation_status, 'active') as moderation_status
    FROM files
    WHERE user_id = ${userId}
      AND expires_at IS NOT NULL
      AND expires_at > NOW()
      AND expires_at <= NOW() + INTERVAL '7 days'
    ORDER BY expires_at ASC
    LIMIT 5
  `

  const stats: UserDashboardStats = {
    ...(statsRows[0] as Omit<UserDashboardStats, 'folder_count' | 'expiring_soon_list'>),
    folder_count: folderRows[0]?.folder_count ?? 0,
    expiring_soon_list: expiringSoonList as UserDashboardFile[],
  }

  return {
    stats,
    recentFiles: recentFiles as UserDashboardFile[],
    topFiles: topFiles as UserDashboardFile[],
    activity: activityRows as UserDashboardActivity[],
    warningCount,
  }
}
