import sql from '../lib/neonClient'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

async function migrateSchema() {
  try {
    console.log('Starting database schema migration...')

    // Check if the files table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'files'
      )
    `
    
    if (!tableExists[0].exists) {
      console.log('Files table does not exist. Creating new table...')
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
      console.log('Files table created successfully')
    } else {
      console.log('Files table exists. Checking for required columns...')
      
      // Check if title column exists
      const titleExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'files' 
          AND column_name = 'title'
        )
      `
      
      if (!titleExists[0].exists) {
        console.log('Adding title column...')
        await sql`ALTER TABLE files ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT 'Untitled Document'`
        console.log('Title column added successfully')
      } else {
        console.log('Title column already exists')
      }
      
      // Check if author column exists
      const authorExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'files' 
          AND column_name = 'author'
        )
      `
      
      if (!authorExists[0].exists) {
        console.log('Adding author column...')
        await sql`ALTER TABLE files ADD COLUMN author VARCHAR(255)`
        console.log('Author column added successfully')
      } else {
        console.log('Author column already exists')
      }
      
      // Check if cloudinary_url column exists
      const cloudinaryUrlExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'files' 
          AND column_name = 'cloudinary_url'
        )
      `
      
      if (!cloudinaryUrlExists[0].exists) {
        console.log('Adding cloudinary_url column...')
        await sql`ALTER TABLE files ADD COLUMN cloudinary_url TEXT`
        console.log('Cloudinary URL column added successfully')
      } else {
        console.log('Cloudinary URL column already exists')
      }
      
      // Check if file_type column exists
      const fileTypeExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'files' 
          AND column_name = 'file_type'
        )
      `
      
      if (!fileTypeExists[0].exists) {
        console.log('Adding file_type column...')
        await sql`ALTER TABLE files ADD COLUMN file_type VARCHAR(10)`
        console.log('File type column added successfully')
      } else {
        console.log('File type column already exists')
      }
      
      // Check if file_size column exists
      const fileSizeExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'files' 
          AND column_name = 'file_size'
        )
      `
      
      if (!fileSizeExists[0].exists) {
        console.log('Adding file_size column...')
        await sql`ALTER TABLE files ADD COLUMN file_size INTEGER`
        console.log('File size column added successfully')
      } else {
        console.log('File size column already exists')
      }
      
      // Check if updated_at column exists
      const updatedAtExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'files' 
          AND column_name = 'updated_at'
        )
      `
      
      if (!updatedAtExists[0].exists) {
        console.log('Adding updated_at column...')
        await sql`ALTER TABLE files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
        console.log('Updated at column added successfully')
      } else {
        console.log('Updated at column already exists')
      }
    }
    
    // Create index for faster queries if it doesn't exist
    console.log('Creating index for faster queries...')
    await sql`
      CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC)
    `
    console.log('Index created successfully')
    
    console.log('Database schema migration completed successfully!')
    
    // Show current table structure
    const tableStructure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      ORDER BY ordinal_position
    `
    
    console.log('\nCurrent table structure:')
    tableStructure.forEach((col: any) => {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? `default: ${col.column_default}` : ''}`)
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    throw error
  }
}

// Run the migration
migrateSchema()
  .then(() => {
    console.log('Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
