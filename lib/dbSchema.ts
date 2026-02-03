import sql from './neonClient'
import { v4 as uuidv4 } from 'uuid'

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
  storageTier: 'guest' | 'registered' = 'guest'
) {
  try {
    const id = uuidv4()
    const result = await sql`
      INSERT INTO files (id, title, author, cloudinary_url, file_type, file_size, is_public, hashtags, user_id, expires_at, storage_tier)
      VALUES (${id}, ${title}, ${author}, ${cloudinaryUrl}, ${fileType}, ${fileSize}, ${isPublic}, ${hashtags}, ${userId || null}, ${expiresAt || null}, ${storageTier})
      RETURNING id, title, author, cloudinary_url, created_at, is_public, hashtags, user_id, expires_at, storage_tier
    `
    return result[0]
  } catch (error) {
    console.error('Error inserting file:', error)
    throw error
  }
}

export async function getFileById(id: string) {
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
        updated_at::text as updated_at
      FROM files WHERE id = ${id}
    `
    return result[0]
  } catch (error) {
    console.error('Error getting file:', error)
    throw error
  }
}

export async function getAllFiles() {
  try {
    const result = await sql`
      SELECT * FROM files ORDER BY created_at DESC
    `
    return result
  } catch (error) {
    console.error('Error getting all files:', error)
    throw error
  }
}

export async function getPublicFiles(searchTerm?: string, hashtag?: string) {
  try {
    // Build the base query with social stats
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
        COALESCE(c.comment_count, 0)::int as comment_count
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
    `

    const params: any[] = []

    if (searchTerm) {
      params.push(`%${searchTerm}%`)
      queryText += ` AND (f.title ILIKE $${params.length} OR f.author ILIKE $${params.length})`
    }

    if (hashtag) {
      params.push(hashtag)
      queryText += ` AND $${params.length} = ANY(f.hashtags)`
    }

    queryText += ` ORDER BY f.created_at DESC`

    // Execute query with parameters
    const result = params.length > 0
      ? await sql(queryText, params)
      : await sql(queryText)

    return result
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
    return result[0]
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

export async function getComments(fileId: string) {
  try {
    const result = await sql`
      SELECT 
        id,
        file_id,
        user_id,
        content,
        created_at::text as created_at,
        updated_at::text as updated_at
      FROM comments 
      WHERE file_id = ${fileId}
      ORDER BY created_at DESC
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