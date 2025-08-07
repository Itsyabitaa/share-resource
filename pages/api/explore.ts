import type { NextApiRequest, NextApiResponse } from 'next'
import { getPublicFiles, getPopularHashtags } from '../../lib/dbSchema'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not configured')
      return res.status(500).json({ 
        error: 'Database not configured',
        details: 'Please set up your DATABASE_URL environment variable'
      })
    }

    const { search, hashtag } = req.query
    
    const searchTerm = typeof search === 'string' ? search : undefined
    const hashtagFilter = typeof hashtag === 'string' ? hashtag : undefined

    console.log('Fetching explore data with:', { searchTerm, hashtagFilter })

    const [files, hashtags] = await Promise.all([
      getPublicFiles(searchTerm, hashtagFilter),
      getPopularHashtags()
    ])

    console.log('Successfully fetched:', { filesCount: files.length, hashtagsCount: hashtags.length })

    res.status(200).json({
      files,
      hashtags
    })
  } catch (error) {
    console.error('Error fetching explore data:', error)
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDatabaseError = errorMessage.includes('DATABASE_URL') || errorMessage.includes('connection')
    
    res.status(500).json({ 
      error: isDatabaseError ? 'Database connection error' : 'Internal server error',
      details: errorMessage
    })
  }
}
