const { neon } = require('@neondatabase/serverless')
const { config } = require('dotenv')

// Load environment variables
config({ path: '.env.local' })

async function rebuildDatabase() {
  try {
    console.log('Rebuilding database...')
    
    // Get the database URL from environment variable
    const sql = neon(process.env.DATABASE_URL)
    
    // Drop the existing files table
    await sql`DROP TABLE IF EXISTS files CASCADE`
    console.log('Dropped existing files table')
    
    // Drop the index if it exists
    await sql`DROP INDEX IF EXISTS idx_files_created_at`
    console.log('Dropped existing index')
    
    // Create files table with the complete schema from dbSchema.ts
    await sql`
      CREATE TABLE files (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255),
        cloudinary_url TEXT NOT NULL,
        file_type VARCHAR(10) NOT NULL,
        file_size INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    console.log('Created new files table')

    // Create index for faster queries
    await sql`
      CREATE INDEX idx_files_created_at ON files(created_at DESC)
    `
    console.log('Created index')

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
