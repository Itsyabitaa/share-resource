import sql from './neonClient'

export async function createTables() {
  try {
    // Create files table for hybrid storage
    await sql`
      CREATE TABLE IF NOT EXISTS files (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        cloudinary_url TEXT NOT NULL,
        file_type VARCHAR(10) NOT NULL,
        file_size INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create index for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC)
    `

    console.log('Database tables created successfully')
  } catch (error) {
    console.error('Error creating tables:', error)
    throw error
  }
}

export async function insertFile(title: string, cloudinaryUrl: string, fileType: string, fileSize?: number) {
  try {
    const result = await sql`
      INSERT INTO files (title, cloudinary_url, file_type, file_size)
      VALUES (${title}, ${cloudinaryUrl}, ${fileType}, ${fileSize})
      RETURNING id, title, cloudinary_url, created_at
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
