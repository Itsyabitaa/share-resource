import type { NextApiRequest, NextApiResponse } from 'next'
import { getPublicFiles, getPopularHashtags } from '../../lib/dbSchema'
import { rateLimit, clientKey } from '../../lib/rateLimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const limitCheck = rateLimit(`explore:${clientKey(req)}`, 60, 60 * 1000)
  if (!limitCheck.ok) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'Database not configured' })
    }

    const { search, hashtag, sort, page } = req.query
    const searchTerm = typeof search === 'string' ? search : undefined
    const hashtagFilter = typeof hashtag === 'string' ? hashtag : undefined
    const sortBy = typeof sort === 'string' ? sort : 'new'
    const pageNum = typeof page === 'string' ? parseInt(page, 10) || 1 : 1

    const [paged, hashtags] = await Promise.all([
      getPublicFiles({
        searchTerm,
        hashtag: hashtagFilter,
        sort: sortBy,
        page: pageNum,
        limit: 12,
      }),
      getPopularHashtags()
    ])

    res.status(200).json({
      files: paged.files,
      hashtags,
      page: paged.page,
      pages: paged.pages,
      total: paged.total,
    })
  } catch (error) {
    console.error('Error fetching explore data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
