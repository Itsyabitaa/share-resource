import type { NextApiRequest, NextApiResponse } from 'next'
import sql from '../../lib/neonClient'
import cloudinary from '../../lib/cloudinary'

function isCleanupAuthorized(req: NextApiRequest) {
    const authHeader = req.headers.authorization
    const cronSecret = process.env.CLEANUP_CRON_SECRET || process.env.CRON_SECRET
    const isProduction = process.env.NODE_ENV === 'production'

    if (!cronSecret) {
        return !isProduction
    }

    return authHeader === `Bearer ${cronSecret}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const cronSecret = process.env.CLEANUP_CRON_SECRET || process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production' && !cronSecret) {
        console.error('CLEANUP_CRON_SECRET (or CRON_SECRET) is not configured')
        return res.status(503).json({ error: 'Cleanup is not configured' })
    }

    if (!isCleanupAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
        console.log('Starting cleanup of expired files...')

        const expiredFiles = await sql`
      SELECT id, cloudinary_url, title, created_at, expires_at
      FROM files
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `

        console.log(`Found ${expiredFiles.length} expired files to delete`)

        let deletedCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (const file of expiredFiles) {
            try {
                const url = file.cloudinary_url
                const publicIdMatch = url.match(/\/md-nest\/([^/]+)\.txt$/)

                if (publicIdMatch) {
                    const publicId = `md-nest/${publicIdMatch[1]}`
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
                    console.log(`Deleted from Cloudinary: ${publicId}`)
                }

                await sql`
          DELETE FROM files WHERE id = ${file.id}
        `

                deletedCount++
                console.log(`Deleted file: ${file.title} (ID: ${file.id})`)
            } catch (error) {
                errorCount++
                const errorMsg = `Failed to delete file ${file.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
                errors.push(errorMsg)
                console.error(errorMsg)
            }
        }

        console.log(`Cleanup completed: ${deletedCount} deleted, ${errorCount} errors`)

        return res.status(200).json({
            success: true,
            message: 'Cleanup completed',
            stats: {
                totalExpired: expiredFiles.length,
                deleted: deletedCount,
                errors: errorCount,
            },
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (error) {
        console.error('Cleanup error:', error)
        return res.status(500).json({
            error: 'Cleanup failed',
        })
    }
}
