import sql from './neonClient'

import { v4 as uuidv4 } from 'uuid'

export async function createTables() {
  try {
    // Create files table for hybrid storage
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
  hashtags: string[] = []
) {
  try {
    const id = uuidv4()
    const result = await sql`
      INSERT INTO files (id, title, author, cloudinary_url, file_type, file_size, is_public, hashtags)
      VALUES (${id}, ${title}, ${author}, ${cloudinaryUrl}, ${fileType}, ${fileSize}, ${isPublic}, ${hashtags})
      RETURNING id, title, author, cloudinary_url, created_at, is_public, hashtags
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
