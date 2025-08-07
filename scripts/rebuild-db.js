const { neon } = require('@neondatabase/serverless')
const { config } = require('dotenv')

// Load environment variables
config({ path: '.env.local' })

async function createTables(sql) {
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

async function rebuildDatabase() {
  try {
    console.log('Rebuilding database...')
    
    // Get the database URL from environment variable
    const sql = neon(process.env.DATABASE_URL)
    
    // Drop the existing files table
    await sql`DROP TABLE IF EXISTS files CASCADE`
    console.log('Dropped existing files table')
    
    // Drop the indexes if they exist
    await sql`DROP INDEX IF EXISTS idx_files_created_at`
    await sql`DROP INDEX IF EXISTS idx_files_is_public`
    await sql`DROP INDEX IF EXISTS idx_files_hashtags`
    console.log('Dropped existing indexes')
    
    // Create files table with the complete schema
    await createTables(sql)
    
    console.log('Database rebuilt successfully')
  } catch (error) {
    console.error('Error rebuilding database:', error)
    throw error
  }
}

// Run the function
rebuildDatabase()
  .then(() => {
    console.log('Database rebuilding completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to rebuild database:', error)
    process.exit(1)
  })
