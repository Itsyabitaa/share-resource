import sql from './neonClient'
import { v4 as uuidv4 } from 'uuid'
import type { StorageTier, UserPlan } from './storagePolicy'
import { isFileRemoved } from './moderation'

export async function createTables() {
  try {
    // Create files table for hybrid storage with tiered storage support
    await sql`
      CREATE TABLE IF NOT EXISTS files (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255),
        cloudinary_url TEXT NOT NULL,
        file_type VARCHAR(10) NOT NULL,
        file_size INTEGER,
        is_public BOOLEAN DEFAULT false,
        hashtags TEXT[],
        user_id UUID,
        expires_at TIMESTAMP WITH TIME ZONE,
        storage_tier VARCHAR(20) DEFAULT 'guest',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create user_credentials table for storing user's custom credentials
    await sql`
      CREATE TABLE IF NOT EXISTS user_credentials (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE,
        neon_database_url TEXT,
        cloudinary_cloud_name TEXT,
        cloudinary_api_key TEXT,
        cloudinary_api_secret TEXT,
        use_custom_credentials BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create indexes for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_files_is_public ON files(is_public)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_files_hashtags ON files USING GIN(hashtags)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id)
    `

    console.log('Database tables created successfully')
  } catch (error) {
    console.error('Error creating tables:', error)
    throw error
  }
}

export async function insertFile(
  title: string,
  cloudinaryUrl: string,
  fileType: string,
  fileSize?: number,
  author?: string,
  isPublic: boolean = false,
  hashtags: string[] = [],
  userId?: string,
  expiresAt?: Date,
  storageTier: StorageTier = 'guest',
  folderId?: string
) {
  try {
    const id = uuidv4()
    const result = await sql`
      INSERT INTO files (id, title, author, cloudinary_url, file_type, file_size, is_public, hashtags, user_id, expires_at, storage_tier, folder_id)
      VALUES (${id}, ${title}, ${author}, ${cloudinaryUrl}, ${fileType}, ${fileSize}, ${isPublic}, ${hashtags}, ${userId || null}, ${expiresAt || null}, ${storageTier}, ${folderId || null})
      RETURNING id, title, author, cloudinary_url, created_at, is_public, hashtags, user_id, expires_at, storage_tier, folder_id
    `
    await recordFileEdit(id, userId || null, title, 'create')
    return result[0]
  } catch (error) {
    console.error('Error inserting file:', error)
    throw error
  }
}

export type FileRecord = {
  id: string
  title: string
  author?: string | null
  cloudinary_url: string
  file_type: string
  file_size?: number | null
  created_at: string
  updated_at: string
  is_public: boolean
  user_id?: string | null
  expires_at?: string | null
  folder_id?: string | null
  view_count?: number
  share_count?: number
  edit_count?: number
  moderation_status?: string | null
  moderation_reason?: string | null
  moderated_at?: string | null
  moderated_by?: string | null
}

export type FileEditRecord = {
  id: string
  file_id: string
  user_id?: string | null
  title?: string | null
  edit_type: 'create' | 'content' | 'metadata'
  created_at: string
}

export type FileStats = {
  viewCount: number
  shareCount: number
  editCount: number
  createdAt: string
  updatedAt: string
  timeline: Array<{
    id: string
    kind: 'create' | 'content' | 'metadata'
    label: string
    at: string
    title?: string | null
  }>
}

export function isFileExpired(expiresAt?: string | Date | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

export function canAccessFile(
  file: Pick<FileRecord, 'is_public' | 'user_id' | 'expires_at' | 'moderation_status'>,
  userId?: string | null,
  options?: { isAdmin?: boolean }
): boolean {
  if (isFileExpired(file.expires_at)) {
    return false
  }

  if (isFileRemoved(file.moderation_status) && !options?.isAdmin) {
    return false
  }

  if (file.is_public) {
    return true
  }

  // Registered private files are owner-only. Guest files have no owner, so the
  // unguessable URL remains the capability until expiry.
  if (file.user_id) {
    return !!userId && file.user_id === userId
  }

  return true
}

export async function getFileById(id: string): Promise<FileRecord | undefined> {
  try {
    const result = await sql`
      SELECT 
        id,
        title,
        author,
        cloudinary_url,
        file_type,
        file_size,
        created_at::text as created_at,
        updated_at::text as updated_at,
        is_public,
        user_id,
        expires_at::text as expires_at,
        folder_id,
        COALESCE(view_count, 0)::int as view_count,
        COALESCE(share_count, 0)::int as share_count,
        COALESCE(edit_count, 0)::int as edit_count,
        COALESCE(moderation_status, 'active') as moderation_status,
        moderation_reason,
        moderated_at::text as moderated_at,
        moderated_by
      FROM files WHERE id = ${id}
    `
    return result[0] as FileRecord | undefined
  } catch (error) {
    console.error('Error getting file:', error)
    throw error
  }
}

export async function getAccessibleFile(id: string, userId?: string | null): Promise<FileRecord | null> {
  const file = await getFileById(id)
  if (!file || !canAccessFile(file, userId)) {
    return null
  }
  return file
}

export async function getPublicFiles(options: {
  searchTerm?: string
  hashtag?: string
  sort?: string
  page?: number
  limit?: number
} = {}) {
  try {
    const { searchTerm, hashtag, sort = 'new', page = 1, limit = 12 } = options
    const offset = Math.max(0, (page - 1) * limit)

    let queryText = `
      SELECT 
        f.id,
        f.title,
        f.author,
        f.file_type,
        f.file_size,
        f.hashtags,
        f.created_at::text as created_at,
        COALESCE(l.like_count, 0)::int as like_count,
        COALESCE(c.comment_count, 0)::int as comment_count,
        COUNT(*) OVER()::int as total_count
      FROM files f
      LEFT JOIN (
        SELECT file_id, COUNT(*)::int as like_count
        FROM likes
        GROUP BY file_id
      ) l ON f.id = l.file_id
      LEFT JOIN (
        SELECT file_id, COUNT(*)::int as comment_count
        FROM comments
        GROUP BY file_id
      ) c ON f.id = c.file_id
      WHERE f.is_public = true
        AND (f.expires_at IS NULL OR f.expires_at > NOW())
        AND COALESCE(f.moderation_status, 'active') != 'removed'
    `

    const params: any[] = []

    if (searchTerm) {
      params.push(`%${searchTerm}%`)
      queryText += ` AND (f.title ILIKE $${params.length} OR f.author ILIKE $${params.length} OR COALESCE(array_to_string(f.hashtags, ','), '') ILIKE $${params.length})`
    }

    if (hashtag) {
      params.push(hashtag)
      queryText += ` AND $${params.length} = ANY(f.hashtags)`
    }

    if (sort === 'liked') {
      queryText += ` ORDER BY like_count DESC, f.created_at DESC`
    } else if (sort === 'commented') {
      queryText += ` ORDER BY comment_count DESC, f.created_at DESC`
    } else {
      queryText += ` ORDER BY f.created_at DESC`
    }

    params.push(limit)
    queryText += ` LIMIT $${params.length}`
    params.push(offset)
    queryText += ` OFFSET $${params.length}`

    const result = await sql(queryText, params)
    const total = result[0]?.total_count || 0

    return {
      files: result,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    }
  } catch (error) {
    console.error('Error getting public files:', error)
    throw error
  }
}

export async function getPopularHashtags() {
  try {
    const result = await sql`
      SELECT 
        unnest(hashtags) as hashtag,
        COUNT(*) as count
      FROM files 
      WHERE is_public = true AND hashtags IS NOT NULL
      GROUP BY hashtag
      ORDER BY count DESC
      LIMIT 20
    `
    return result
  } catch (error) {
    console.error('Error getting popular hashtags:', error)
    throw error
  }
}

// ============================================
// LIKES FUNCTIONS
// ============================================

export async function toggleLike(fileId: string, userId: string) {
  try {
    const existing = await sql`
      SELECT id FROM likes WHERE file_id = ${fileId} AND user_id = ${userId}
    `

    if (existing.length > 0) {
      await sql`
        DELETE FROM likes WHERE file_id = ${fileId} AND user_id = ${userId}
      `
      return { liked: false }
    } else {
      await sql`
        INSERT INTO likes (file_id, user_id)
        VALUES (${fileId}, ${userId})
      `
      return { liked: true }
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    throw error
  }
}

export async function getLikeCount(fileId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*)::int as count FROM likes WHERE file_id = ${fileId}
    `
    return result[0]?.count || 0
  } catch (error) {
    console.error('Error getting like count:', error)
    throw error
  }
}

export async function hasUserLiked(fileId: string, userId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id FROM likes WHERE file_id = ${fileId} AND user_id = ${userId}
    `
    return result.length > 0
  } catch (error) {
    console.error('Error checking user like:', error)
    throw error
  }
}

export async function getLikeStats(fileId: string, userId?: string) {
  try {
    const count = await getLikeCount(fileId)
    const userHasLiked = userId ? await hasUserLiked(fileId, userId) : false
    return { count, userHasLiked }
  } catch (error) {
    console.error('Error getting like stats:', error)
    throw error
  }
}

// ============================================
// COMMENTS FUNCTIONS
// ============================================

export async function addComment(fileId: string, userId: string, content: string) {
  try {
    const result = await sql`
      INSERT INTO comments (file_id, user_id, content)
      VALUES (${fileId}, ${userId}, ${content})
      RETURNING 
        id,
        file_id,
        user_id,
        content,
        created_at::text as created_at,
        updated_at::text as updated_at
    `
    const user = await sql`SELECT name, email FROM "user" WHERE id = ${userId}`
    return {
      ...result[0],
      author_name: user[0]?.name || user[0]?.email?.split('@')[0] || 'User',
    }
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

export async function getComments(fileId: string) {
  try {
    const result = await sql`
      SELECT 
        c.id,
        c.file_id,
        c.user_id,
        c.content,
        c.created_at::text as created_at,
        c.updated_at::text as updated_at,
        COALESCE(u.name, split_part(u.email, '@', 1), 'User') as author_name
      FROM comments c
      LEFT JOIN "user" u ON u.id = c.user_id
      WHERE c.file_id = ${fileId}
      ORDER BY c.created_at DESC
    `
    return result
  } catch (error) {
    console.error('Error getting comments:', error)
    throw error
  }
}

export async function getCommentCount(fileId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*)::int as count FROM comments WHERE file_id = ${fileId}
    `
    return result[0]?.count || 0
  } catch (error) {
    console.error('Error getting comment count:', error)
    throw error
  }
}

export async function deleteComment(commentId: string, userId: string) {
  try {
    const result = await sql`
      DELETE FROM comments 
      WHERE id = ${commentId} AND user_id = ${userId}
      RETURNING id
    `
    return result.length > 0
  } catch (error) {
    console.error('Error deleting comment:', error)
    throw error
  }
}

export async function getSocialStats(fileId: string, userId?: string) {
  try {
    const [likeCount, commentCount, userHasLiked] = await Promise.all([
      getLikeCount(fileId),
      getCommentCount(fileId),
      userId ? hasUserLiked(fileId, userId) : Promise.resolve(false)
    ])
    return { likeCount, commentCount, userHasLiked }
  } catch (error) {
    console.error('Error getting social stats:', error)
    throw error
  }
}

// ============================================
// FOLDERS FUNCTIONS
// ============================================

export async function createFolder(name: string, userId: string) {
  try {
    const id = uuidv4()
    const result = await sql`
      INSERT INTO folders (id, name, user_id)
      VALUES (${id}, ${name}, ${userId})
      RETURNING id, name, user_id, created_at::text as created_at
    `
    return result[0]
  } catch (error) {
    console.error('Error creating folder:', error)
    throw error
  }
}

export async function getFoldersByUser(userId: string) {
  try {
    const result = await sql`
      SELECT 
        id,
        name,
        user_id,
        created_at::text as created_at,
        updated_at::text as updated_at
      FROM folders 
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
    `
    return result
  } catch (error) {
    console.error('Error getting folders:', error)
    throw error
  }
}

export async function renameFolder(folderId: string, userId: string, name: string) {
  try {
    const result = await sql`
      UPDATE folders
      SET name = ${name.trim()}, updated_at = NOW()
      WHERE id = ${folderId} AND user_id = ${userId}
      RETURNING id, name, user_id, created_at::text as created_at
    `
    return result[0] || null
  } catch (error) {
    console.error('Error renaming folder:', error)
    throw error
  }
}

export async function updateOwnedFile(
  fileId: string,
  userId: string,
  updates: {
    title?: string
    author?: string
    isPublic?: boolean
    hashtags?: string[]
    folderId?: string | null
    cloudinaryUrl?: string
    fileSize?: number
  }
) {
  const current = await sql`SELECT * FROM files WHERE id = ${fileId} AND user_id = ${userId}`
  if (current.length === 0) return null

  const title = updates.title ?? current[0].title
  const author = updates.author ?? current[0].author
  const isPublic = updates.isPublic ?? current[0].is_public
  const hashtags = updates.hashtags ?? current[0].hashtags ?? []
  const folderId = updates.folderId === undefined ? current[0].folder_id : updates.folderId
  const cloudinaryUrl = updates.cloudinaryUrl ?? current[0].cloudinary_url
  const fileSize = updates.fileSize ?? current[0].file_size

  const contentChanged =
    updates.cloudinaryUrl !== undefined && updates.cloudinaryUrl !== current[0].cloudinary_url
  const metadataChanged =
    (updates.title !== undefined && updates.title !== current[0].title) ||
    (updates.author !== undefined && updates.author !== current[0].author) ||
    (updates.isPublic !== undefined && updates.isPublic !== current[0].is_public) ||
    (updates.hashtags !== undefined && JSON.stringify(updates.hashtags) !== JSON.stringify(current[0].hashtags ?? []))

  const result = await sql`
    UPDATE files
    SET
      title = ${title},
      author = ${author},
      is_public = ${isPublic},
      hashtags = ${hashtags},
      folder_id = ${folderId},
      cloudinary_url = ${cloudinaryUrl},
      file_size = ${fileSize},
      updated_at = NOW(),
      edit_count = CASE
        WHEN ${contentChanged || metadataChanged} THEN COALESCE(edit_count, 0) + 1
        ELSE COALESCE(edit_count, 0)
      END
    WHERE id = ${fileId} AND user_id = ${userId}
    RETURNING
      id, title, author, cloudinary_url, is_public, hashtags, folder_id, user_id,
      created_at::text as created_at, updated_at::text as updated_at,
      COALESCE(view_count, 0)::int as view_count,
      COALESCE(share_count, 0)::int as share_count,
      COALESCE(edit_count, 0)::int as edit_count
  `

  if (result[0]) {
    if (contentChanged) {
      await recordFileEdit(fileId, userId, title, 'content')
    } else if (metadataChanged) {
      await recordFileEdit(fileId, userId, title, 'metadata')
    }
  }

  return result[0]
}

export async function recordFileEdit(
  fileId: string,
  userId: string | null,
  title: string | undefined,
  editType: 'create' | 'content' | 'metadata'
) {
  try {
    await sql`
      INSERT INTO file_edits (file_id, user_id, title, edit_type)
      VALUES (${fileId}, ${userId}, ${title || null}, ${editType})
    `
  } catch (error) {
    console.error('Error recording file edit:', error)
  }
}

export async function incrementFileView(fileId: string): Promise<number> {
  const result = await sql`
    UPDATE files
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = ${fileId}
    RETURNING COALESCE(view_count, 0)::int as view_count
  `
  return result[0]?.view_count ?? 0
}

export async function incrementFileShare(fileId: string): Promise<number> {
  const result = await sql`
    UPDATE files
    SET share_count = COALESCE(share_count, 0) + 1
    WHERE id = ${fileId}
    RETURNING COALESCE(share_count, 0)::int as share_count
  `
  return result[0]?.share_count ?? 0
}

function timelineLabel(kind: string, editIndex: number): string {
  if (kind === 'create') return 'Created'
  if (kind === 'metadata') return editIndex > 0 ? `${ordinal(editIndex)} settings update` : 'Settings updated'
  if (editIndex === 1) return '1st edit'
  if (editIndex === 2) return '2nd edit'
  if (editIndex === 3) return '3rd edit'
  return `${editIndex}th edit`
}

function ordinal(n: number): string {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

export async function getFileStats(fileId: string): Promise<FileStats | null> {
  try {
    const file = await getFileById(fileId)
    if (!file) return null

    const edits = await sql`
      SELECT
        id,
        file_id,
        user_id,
        title,
        edit_type,
        created_at::text as created_at
      FROM file_edits
      WHERE file_id = ${fileId}
      ORDER BY created_at ASC
    ` as FileEditRecord[]

    let contentEditNum = 0
    let metadataEditNum = 0
    const timeline = edits.map((entry) => {
      let label = 'Edited'
      if (entry.edit_type === 'create') {
        label = 'Created'
      } else if (entry.edit_type === 'content') {
        contentEditNum += 1
        label = timelineLabel('content', contentEditNum)
      } else if (entry.edit_type === 'metadata') {
        metadataEditNum += 1
        label = timelineLabel('metadata', metadataEditNum)
      }

      return {
        id: entry.id,
        kind: entry.edit_type,
        label,
        at: entry.created_at,
        title: entry.title,
      }
    })

    return {
      viewCount: file.view_count ?? 0,
      shareCount: file.share_count ?? 0,
      editCount: file.edit_count ?? 0,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
      timeline,
    }
  } catch (error) {
    console.error('Error getting file stats:', error)
    throw error
  }
}

export async function deleteOwnedFile(fileId: string, userId: string) {
  const result = await sql`
    DELETE FROM files WHERE id = ${fileId} AND user_id = ${userId}
    RETURNING id
  `
  return result.length > 0
}

export async function deleteFolder(folderId: string, userId: string) {
  try {
    // files inside the folder will have their folder_id set to NULL due to ON DELETE SET NULL
    // or if we wanted to delete them, we could, but SET NULL is safer.
    // wait, the foreign key says: REFERENCES folders(id) ON DELETE SET NULL.
    // So this is correct.
    const result = await sql`
      DELETE FROM folders 
      WHERE id = ${folderId} AND user_id = ${userId}
      RETURNING id
    `
    return result.length > 0
  } catch (error) {
    console.error('Error deleting folder:', error)
    throw error
  }
}

export async function getFilesByFolder(folderId: string, userId: string) {
  try {
    const result = await sql`
      SELECT 
        id,
        title,
        author,
        file_type,
        file_size,
        hashtags,
        created_at::text as created_at,
        folder_id
      FROM files 
      WHERE folder_id = ${folderId} AND user_id = ${userId}
      ORDER BY created_at DESC
    `
    return result
  } catch (error) {
    console.error('Error getting files by folder:', error)
    throw error
  }
}

export async function getAllUserFiles(userId: string) {
  try {
    const result = await sql`
      SELECT 
        id,
        title,
        author,
        file_type,
        file_size,
        hashtags,
        created_at::text as created_at,
        folder_id,
        is_public,
        expires_at::text as expires_at,
        storage_tier
      FROM files 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `
    return result
  } catch (error) {
    console.error('Error getting all user files:', error)
    throw error
  }
}

function isMissingPlanColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /column "plan"/i.test(message) || /does not exist/i.test(message)
}

export async function resolveOwnedFolderId(
  folderId: unknown,
  userId?: string
): Promise<string | undefined> {
  if (!userId || typeof folderId !== 'string' || !folderId.trim()) {
    return undefined
  }

  const result = await sql`
    SELECT id FROM folders WHERE id = ${folderId} AND user_id = ${userId}
  `
  return result[0]?.id
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  try {
    const result = await sql`
      SELECT plan FROM "user" WHERE id = ${userId}
    `
    return result[0]?.plan === 'pro' ? 'pro' : 'free'
  } catch (error) {
    if (isMissingPlanColumn(error)) {
      console.warn('user.plan column missing — defaulting to free. Run npm run db:setup.')
      return 'free'
    }
    throw error
  }
}

export async function setUserPlan(userId: string, plan: UserPlan) {
  await sql`
    UPDATE "user"
    SET plan = ${plan}, "updatedAt" = NOW()
    WHERE id = ${userId}
  `
}

export async function applyProStorageToUserFiles(userId: string) {
  await sql`
    UPDATE files
    SET expires_at = NULL, storage_tier = 'pro', updated_at = NOW()
    WHERE user_id = ${userId}
  `
}

export async function applyFreeStorageToUserFiles(userId: string) {
  await sql`
    UPDATE files
    SET
      expires_at = created_at + INTERVAL '30 days',
      storage_tier = 'free',
      updated_at = NOW()
    WHERE user_id = ${userId}
  `
}

export async function getUserByEmail(email: string) {
  const result = await sql`
    SELECT id, email, name FROM "user" WHERE LOWER(email) = LOWER(${email.trim()})
  `
  return result[0] as { id: string; email: string; name: string | null } | undefined
}

export async function searchUsers(query: string, limit = 25) {
  const pattern = `%${query.trim()}%`
  const result = await sql`
    SELECT id, email, name, "createdAt"::text as created_at
    FROM "user"
    WHERE email ILIKE ${pattern} OR COALESCE(name, '') ILIKE ${pattern}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `
  return result as Array<{ id: string; email: string; name: string | null; created_at: string }>
}

export async function listRecentUsers(limit = 30) {
  const result = await sql`
    SELECT id, email, name, "createdAt"::text as created_at
    FROM "user"
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `
  return result as Array<{ id: string; email: string; name: string | null; created_at: string }>
}