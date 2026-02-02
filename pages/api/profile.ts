import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../lib/auth'
import sql from '../../lib/neonClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Check authentication
        const session = await auth.api.getSession({
            headers: req.headers as any
        })
        const userId = session?.user?.id

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        if (req.method === 'GET') {
            // Get current profile
            const result = await sql`
        SELECT name, email FROM "user" WHERE id = ${userId}
      `

            if (result.length === 0) {
                return res.status(404).json({ error: 'User not found' })
            }

            return res.status(200).json({
                name: result[0].name || '',
                email: result[0].email
            })
        }

        if (req.method === 'PUT') {
            // Update profile name
            const { name } = req.body

            if (!name || typeof name !== 'string') {
                return res.status(400).json({ error: 'Name is required' })
            }

            await sql`
        UPDATE "user" 
        SET name = ${name.trim()}, "updatedAt" = NOW()
        WHERE id = ${userId}
      `

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                name: name.trim()
            })
        }

        return res.status(405).json({ error: 'Method not allowed' })
    } catch (error) {
        console.error('Profile API error:', error)
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}
