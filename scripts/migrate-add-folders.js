require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateAddFolders() {
  try {
    console.log('🔄 Starting non-destructive migration...\n');

    // Create folders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created folders table (if not exists)');

    // Add folder_id to files table
    await pool.query(`
      ALTER TABLE files 
      ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL
    `);
    console.log('  ✓ Added folder_id column to files table (if not exists)');

    // Add index for folder_id in files table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id)');
    console.log('  ✓ Created index on files(folder_id)');

    // Add index for user_id in folders table
    await pool.query('CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id)');
    console.log('  ✓ Created index on folders(user_id)');

    console.log('\n✅ Migration completed successfully!');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

migrateAddFolders();
