import sql from '../lib/neonClient'

/**
 * Migration script to add tiered storage support
 * This adds user_id, expires_at, and storage_tier columns to the files table
 * and creates the user_credentials table
 */
async function migrate() {
    try {
        console.log('Starting tiered storage migration...')

        // Add new columns to files table
        console.log('Adding new columns to files table...')

        await sql`
      ALTER TABLE files 
      ADD COLUMN IF NOT EXISTS user_id UUID,
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS storage_tier VARCHAR(20) DEFAULT 'guest'
    `

        console.log('✓ Added user_id, expires_at, and storage_tier columns')

        // Create user_credentials table
        console.log('Creating user_credentials table...')

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

        console.log('✓ Created user_credentials table')

        // Create indexes
        console.log('Creating indexes...')

        await sql`
      CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)
    `

        await sql`
      CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at)
    `

        await sql`
      CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id)
    `

        console.log('✓ Created indexes')

        // Migrate existing data (set all existing files as guest with 3-day expiry)
        console.log('Migrating existing data...')

        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 3)

        await sql`
      UPDATE files 
      SET 
        storage_tier = 'guest',
        expires_at = ${expiryDate}
      WHERE storage_tier IS NULL
    `

        console.log('✓ Migrated existing files to guest tier with 3-day expiry')

        console.log('\n✅ Migration completed successfully!')
        console.log('\nNext steps:')
        console.log('1. Generate an encryption key: openssl rand -hex 32')
        console.log('2. Add ENCRYPTION_KEY to your .env.local file')
        console.log('3. Optionally add CLEANUP_CRON_SECRET for the cleanup endpoint')
        console.log('4. Set up a cron job to call /api/cleanup daily')

    } catch (error) {
        console.error('❌ Migration failed:', error)
        throw error
    } finally {
        process.exit(0)
    }
}

migrate()
