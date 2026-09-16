require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function setup() {
  console.log('Applying non-destructive schema (CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)...')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
      name TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      image TEXT
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      "expiresAt" TIMESTAMP NOT NULL,
      token TEXT NOT NULL UNIQUE,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      "idToken" TEXT,
      "accessTokenExpiresAt" TIMESTAMP,
      "refreshTokenExpiresAt" TIMESTAMP,
      scope TEXT,
      password TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`ALTER TABLE account ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" TIMESTAMP`)
  await pool.query(`ALTER TABLE account ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP`)
  await pool.query(`ALTER TABLE account ADD COLUMN IF NOT EXISTS scope TEXT`)
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'account' AND column_name = 'expiresAt'
      ) THEN
        UPDATE account
        SET "accessTokenExpiresAt" = "expiresAt"
        WHERE "accessTokenExpiresAt" IS NULL
          AND "expiresAt" IS NOT NULL;
      END IF;
    END $$;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      "expiresAt" TIMESTAMP NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
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
  `)

  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_tier VARCHAR(20) DEFAULT 'guest'`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS hashtags TEXT[]`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free'`)
  await pool.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE`)
  await pool.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS photo_conversions_used INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS kimem_trial_uses INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS kimem_uses_total INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE user_credentials ADD COLUMN IF NOT EXISTS openai_api_key TEXT`)
  await pool.query(`ALTER TABLE user_credentials ADD COLUMN IF NOT EXISTS groq_api_key TEXT`)

  // Apply 30-day retention to legacy signed-in files that were stored permanently.
  await pool.query(`
    UPDATE files f
    SET
      expires_at = f.created_at + INTERVAL '30 days',
      storage_tier = 'free'
    WHERE f.user_id IS NOT NULL
      AND f.expires_at IS NULL
      AND f.storage_tier IN ('registered', 'free')
      AND NOT EXISTS (
        SELECT 1 FROM "user" u WHERE u.id = f.user_id AND u.plan = 'pro'
      )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS file_edits (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
      title VARCHAR(255),
      edit_type VARCHAR(20) NOT NULL DEFAULT 'content',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_credentials (
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
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS likes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(file_id, user_id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      content TEXT NOT NULL CHECK (char_length(content) <= 1000),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  await pool.query('CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_files_is_public ON files(is_public)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_files_hashtags ON files USING GIN(hashtags)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_likes_file_id ON likes(file_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_file_id ON comments(file_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_account_user_id ON account("userId")')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_account_provider ON account("providerId", "accountId")')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_file_edits_file_id ON file_edits(file_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_file_edits_created_at ON file_edits(created_at DESC)')

  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'active'`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS moderation_reason TEXT`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE`)
  await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS moderated_by TEXT`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      event_type VARCHAR(40) NOT NULL,
      file_id UUID REFERENCES files(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
      actor_email TEXT,
      message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_warnings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      file_id UUID REFERENCES files(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  await pool.query('CREATE INDEX IF NOT EXISTS idx_files_moderation_status ON files(moderation_status)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_moderation_events_created_at ON moderation_events(created_at DESC)')
  await pool.query('CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON user_warnings(user_id)')

  console.log('Schema is up to date. No tables were dropped.')
  await pool.end()
}

setup().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
