import { prisma } from './prisma'

export async function createTables() {
  try {
    // Prisma will handle table creation through migrations
    // This function is kept for backward compatibility
    console.log('Database tables will be created through Prisma migrations')
  } catch (error) {
    console.error('Error creating tables:', error)
    throw error
  }
}

export async function insertFile(
  title: string, 
  cloudinaryUrl: string, 
  fileType: string, 
  fileSize?: number, 
  author?: string,
  isPublic: boolean = false,
  hashtags: string[] = []
) {
  try {
    const file = await prisma.file.create({
      data: {
        title,
        author,
        cloudinaryUrl,
        fileType,
        fileSize,
        isPublic,
        hashtags
      },
      select: {
        id: true,
        title: true,
        author: true,
        cloudinaryUrl: true,
        createdAt: true,
        isPublic: true,
        hashtags: true
      }
    })
    return file
  } catch (error) {
    console.error('Error inserting file:', error)
    throw error
  }
}

export async function getFileById(id: string) {
  try {
    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        cloudinaryUrl: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true
      }
    })
    return file
  } catch (error) {
    console.error('Error getting file:', error)
    throw error
  }
}

export async function getAllFiles() {
  try {
    const files = await prisma.file.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return files
  } catch (error) {
    console.error('Error getting all files:', error)
    throw error
  }
}

export async function getPublicFiles(searchTerm?: string, hashtag?: string) {
  try {
    const where: any = {
      isPublic: true
    }

    // Add search conditions
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { author: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    // Add hashtag filter
    if (hashtag) {
      where.hashtags = {
        has: hashtag
      }
    }

    const files = await prisma.file.findMany({
      where,
      select: {
        id: true,
        title: true,
        author: true,
        fileType: true,
        fileSize: true,
        hashtags: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return files
  } catch (error) {
    console.error('Error getting public files:', error)
    throw error
  }
}

export async function getPopularHashtags() {
  try {
    // Prisma doesn't have direct support for unnest, so we'll use a raw query
    // This is a limitation of Prisma, but we can work around it
    const result = await prisma.$queryRaw`
      SELECT 
        unnest(hashtags) as hashtag,
        COUNT(*) as count
      FROM files 
      WHERE is_public = true AND hashtags IS NOT NULL
      GROUP BY hashtag
      ORDER BY count DESC
      LIMIT 20
    `
    return result as Array<{ hashtag: string; count: number }>
  } catch (error) {
    console.error('Error getting popular hashtags:', error)
    throw error
  }
}
