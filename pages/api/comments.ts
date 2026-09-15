import type { NextApiRequest, NextApiResponse } from 'next'
import { addComment, getComments, deleteComment, getAccessibleFile } from '../../lib/dbSchema'
import { getUser } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === 'GET') {
            const { fileId } = req.query

            if (!fileId || typeof fileId !== 'string') {
                return res.status(400).json({ error: 'File ID is required' })
            }

            const user = await getUser(req)
            const file = await getAccessibleFile(fileId, user?.id)

            if (!file) {
                return res.status(404).json({ error: 'File not found' })
            }

            const comments = await getComments(fileId)
            return res.status(200).json({ comments })
        } else if (req.method === 'POST') {
            const user = await getUser(req)

            if (!user) {
                return res.status(401).json({ error: 'Authentication required' })
            }

            const { fileId, content } = req.body

            if (!fileId || !content) {
                return res.status(400).json({ error: 'File ID and content are required' })
            }

            if (content.trim().length === 0) {
                return res.status(400).json({ error: 'Comment cannot be empty' })
            }

            if (content.length > 1000) {
                return res.status(400).json({ error: 'Comment must be 1000 characters or less' })
            }

            const file = await getAccessibleFile(fileId, user.id)

            if (!file) {
                return res.status(404).json({ error: 'File not found' })
            }

            const comment = await addComment(fileId, user.id, content.trim())
            return res.status(201).json({ comment })
        } else if (req.method === 'DELETE') {
            const user = await getUser(req)

            if (!user) {
                return res.status(401).json({ error: 'Authentication required' })
            }

            const { id } = req.query

            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'Comment ID is required' })
            }

            const success = await deleteComment(id, user.id)

            if (!success) {
                return res.status(403).json({ error: 'You can only delete your own comments' })
            }

            return res.status(200).json({ success: true })
        } else {
            return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('Error in comments API:', error)
        return res.status(500).json({
            error: 'Internal server error'
        })
    }
}
