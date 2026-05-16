// Fresh database migration - drops all tables and recreates them
// This includes both the files table, Better Auth tables, and tiered storage
// Usage: node scripts/migrate-fresh.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateFresh() {
  try {
    console.log('🗑️  Dropping all existing tables...\n');

    // Drop all tables (in correct order due to foreign keys)
    await pool.query('DROP TABLE IF EXISTS comments CASCADE');
    console.log('  ✓ Dropped comments table');

    await pool.query('DROP TABLE IF EXISTS likes CASCADE');
    console.log('  ✓ Dropped likes table');

    await pool.query('DROP TABLE IF EXISTS session CASCADE');
    console.log('  ✓ Dropped session table');

    await pool.query('DROP TABLE IF EXISTS account CASCADE');
    console.log('  ✓ Dropped account table');

    await pool.query('DROP TABLE IF EXISTS verification CASCADE');
    console.log('  ✓ Dropped verification table');

    await pool.query('DROP TABLE IF EXISTS user_credentials CASCADE');
    console.log('  ✓ Dropped user_credentials table');

    await pool.query('DROP TABLE IF EXISTS files CASCADE');
    console.log('  ✓ Dropped files table');

    await pool.query('DROP TABLE IF EXISTS folders CASCADE');
    console.log('  ✓ Dropped folders table');

    await pool.query('DROP TABLE IF EXISTS "user" CASCADE');
    console.log('  ✓ Dropped user table');

    console.log('\n🔨 Creating fresh tables...\n');

    // Create user table (Better Auth)
    await pool.query(`
      CREATE TABLE "user" (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        name TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        image TEXT
      )
    `);
    console.log('  ✓ Created user table');

    // Create session table (Better Auth)
    await pool.query(`
      CREATE TABLE session (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created session table');

    // Create account table (Better Auth - for OAuth)
    await pool.query(`
      CREATE TABLE account (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "expiresAt" TIMESTAMP,
        password TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created account table');

    // Create verification table (Better Auth)
    await pool.query(`
      CREATE TABLE verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created verification table');

    // Create folders table
    await pool.query(`
      CREATE TABLE folders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created folders table');

    // Create files table (your app) with tiered storage support
    await pool.query(`
      CREATE TABLE files (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255),
        cloudinary_url TEXT NOT NULL,
        file_type VARCHAR(10) NOT NULL,
        file_size INTEGER,
        is_public BOOLEAN DEFAULT false,
        hashtags TEXT[],
        user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        storage_tier VARCHAR(20) DEFAULT 'guest',
        folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created files table (with tiered storage and folders)');

    // Create user_credentials table for storing encrypted user credentials
    await pool.query(`
      CREATE TABLE user_credentials (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        neon_database_url TEXT,
        cloudinary_cloud_name TEXT,
        cloudinary_api_key TEXT,
        cloudinary_api_secret TEXT,
        use_custom_credentials BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created user_credentials table');

    // Create likes table
    await pool.query(`
      CREATE TABLE likes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(file_id, user_id)
      )
    `);
    console.log('  ✓ Created likes table');

    // Create comments table
    await pool.query(`
      CREATE TABLE comments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        content TEXT NOT NULL CHECK (char_length(content) <= 1000),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created comments table');

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_is_public ON files(is_public)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_hashtags ON files USING GIN(hashtags)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_session_user_id ON session("userId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_account_user_id ON account("userId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_likes_file_id ON likes(file_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_file_id ON comments(file_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id)');
    console.log('  ✓ Created indexes');

    console.log('\n✅ Fresh migration completed successfully!');
    console.log('\nDatabase is now ready with:');
    console.log('  • User authentication tables (user, session, account, verification)');
    console.log('  • Folders table for user workspaces');
    console.log('  • Files table with tiered storage and folder support');
    console.log('  • User credentials table (encrypted storage for custom Neon/Cloudinary)');
    console.log('  • Likes and comments tables (social features)');
    console.log('  • All necessary indexes');
    console.log('\n📝 Next steps:');
    console.log('  1. Make sure ENCRYPTION_KEY is set in your .env.local');
    console.log('  2. Test guest uploads (3-day expiry)');
    console.log('  3. Test registered user uploads (permanent storage)');
    console.log('  4. Set up cleanup cron job for production');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

migrateFresh();
