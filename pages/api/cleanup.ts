import type { NextApiRequest, NextApiResponse } from 'next'
import sql from '../../lib/neonClient'
import cloudinary from '../../lib/cloudinary'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Optional: Add authentication/secret to prevent unauthorized cleanup
        const authHeader = req.headers.authorization
        const cronSecret = process.env.CLEANUP_CRON_SECRET

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        console.log('Starting cleanup of expired files...')

        // Find all expired files
        const expiredFiles = await sql`
      SELECT id, cloudinary_url, title, created_at, expires_at
      FROM files
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `

        console.log(`Found ${expiredFiles.length} expired files to delete`)

        let deletedCount = 0
        let errorCount = 0
        const errors: string[] = []

        // Delete each expired file
        for (const file of expiredFiles) {
            try {
                // Extract public_id from Cloudinary URL
                const url = file.cloudinary_url
                const publicIdMatch = url.match(/\/md-nest\/([^/]+)\.txt$/)

                if (publicIdMatch) {
                    const publicId = `md-nest/${publicIdMatch[1]}`

                    // Delete from Cloudinary
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
                    console.log(`Deleted from Cloudinary: ${publicId}`)
                }

                // Delete from database
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
            details: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}
