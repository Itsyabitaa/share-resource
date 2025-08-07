import sql from '../lib/neonClient'
import { createTables } from '../lib/dbSchema'

export async function rebuildDatabase() {
  try {
    console.log('Rebuilding database...')
    
    // Drop the existing files table
    await sql`DROP TABLE IF EXISTS files CASCADE`
    console.log('Dropped existing files table')
    
    // Drop the index if it exists
    await sql`DROP INDEX IF EXISTS idx_files_created_at`
    console.log('Dropped existing index')
    
    // Create tables using the function from dbSchema.ts
    await createTables()
    console.log('Created new files table using dbSchema.ts')

    console.log('Database rebuilt successfully')
  } catch (error) {
    console.error('Error rebuilding database:', error)
    throw error
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  rebuildDatabase()
    .then(() => {
      console.log('Database rebuilding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed to rebuild database:', error)
      process.exit(1)
    })
}
