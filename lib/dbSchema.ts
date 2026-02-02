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
    let query = sql`
      SELECT 
        id,
        title,
        author,
        file_type,
        file_size,
        hashtags,
        created_at::text as created_at
      FROM files 
      WHERE is_public = true
    `

    if (searchTerm) {
      query = sql`${query} AND (
        title ILIKE ${`%${searchTerm}%`} OR 
        author ILIKE ${`%${searchTerm}%`}
      )`
    }

    if (hashtag) {
      query = sql`${query} AND ${hashtag} = ANY(hashtags)`
    }

    query = sql`${query} ORDER BY created_at DESC`

    const result = await query
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
