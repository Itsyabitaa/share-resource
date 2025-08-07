import { config } from 'dotenv'
import { createTables } from '../lib/dbSchema'

// Load environment variables
config({ path: '.env.local' })

async function setupDatabase() {
  try {
    console.log('Setting up database tables...')
    await createTables()
    console.log('Database setup completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Database setup failed:', error)
    process.exit(1)
  }
}

setupDatabase()
