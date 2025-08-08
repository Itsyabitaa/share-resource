import { config } from 'dotenv'
import { prisma } from '../lib/prisma'

// Load environment variables
config({ path: '.env.local' })

async function setupDatabase() {
  try {
    console.log('Setting up database with Prisma...')
    
    // Test the database connection
    await prisma.$connect()
    console.log('Database connection successful!')
    
    // Prisma will handle table creation through migrations
    // You can run: npm run db:push to push the schema to the database
    console.log('Database setup completed successfully!')
    console.log('Run "npm run db:push" to create tables in your database')
    
    await prisma.$disconnect()
    process.exit(0)
  } catch (error) {
    console.error('Database setup failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

setupDatabase()
