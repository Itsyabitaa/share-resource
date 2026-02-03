import type { NextApiRequest, NextApiResponse } from 'next'
import { toggleLike, getLikeStats } from '../../lib/dbSchema'
import { getUser } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === 'POST') {
            // Toggle like (add or remove)
            const user = await getUser(req)

            if (!user) {
                return res.status(401).json({ error: 'Authentication required' })
            }

            const { fileId } = req.body

            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' })
            }

            const result = await toggleLike(fileId, user.id)
            const stats = await getLikeStats(fileId, user.id)

            return res.status(200).json({
                liked: result.liked,
                likeCount: stats.count,
                userHasLiked: stats.userHasLiked
            })
        } else if (req.method === 'GET') {
            // Get like stats
            const { fileId } = req.query

            if (!fileId || typeof fileId !== 'string') {
                return res.status(400).json({ error: 'File ID is required' })
            }

            const user = await getUser(req)
            const stats = await getLikeStats(fileId, user?.id)

            return res.status(200).json({
                likeCount: stats.count,
                userHasLiked: stats.userHasLiked
            })
        } else {
            return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('Error in likes API:', error)
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}
