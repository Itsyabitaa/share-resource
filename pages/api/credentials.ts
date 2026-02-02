import type { NextApiRequest, NextApiResponse } from 'next'
import { auth } from '../../lib/auth'
import {
    getUserCredentials,
    saveUserCredentials,
    deleteUserCredentials,
    validateCloudinaryCredentials,
} from '../../lib/userCredentials'

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

        switch (req.method) {
            case 'GET':
                return handleGet(userId, res)
            case 'POST':
                return handlePost(userId, req, res)
            case 'DELETE':
                return handleDelete(userId, res)
            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error) {
        console.error('Credentials API error:', error)
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}

async function handleGet(userId: string, res: NextApiResponse) {
    try {
        const credentials = await getUserCredentials(userId)

        if (!credentials) {
            return res.status(200).json({
                hasCredentials: false,
                useCustomCredentials: false,
            })
        }

        // Return status without exposing actual credentials
        return res.status(200).json({
            hasCredentials: true,
            useCustomCredentials: credentials.useCustomCredentials,
            hasNeonUrl: !!credentials.neonDatabaseUrl,
            hasCloudinaryConfig:
                !!credentials.cloudinaryCloudName &&
                !!credentials.cloudinaryApiKey &&
                !!credentials.cloudinaryApiSecret,
        })
    } catch (error) {
        console.error('Error getting credentials:', error)
        return res.status(500).json({ error: 'Failed to get credentials' })
    }
}

async function handlePost(userId: string, req: NextApiRequest, res: NextApiResponse) {
    try {
        const {
            neonDatabaseUrl,
            cloudinaryCloudName,
            cloudinaryApiKey,
            cloudinaryApiSecret,
            useCustomCredentials,
            validateOnly = false,
        } = req.body

        // If validation only, validate Cloudinary credentials
        if (validateOnly) {
            if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
                return res.status(400).json({ error: 'Missing Cloudinary credentials' })
            }

            const validation = await validateCloudinaryCredentials(
                cloudinaryCloudName,
                cloudinaryApiKey,
                cloudinaryApiSecret
            )

            return res.status(200).json(validation)
        }

        // Save credentials
        const savedCredentials = await saveUserCredentials(
            userId,
            neonDatabaseUrl || null,
            cloudinaryCloudName || null,
            cloudinaryApiKey || null,
            cloudinaryApiSecret || null,
            useCustomCredentials || false
        )

        return res.status(200).json({
            success: true,
            message: 'Credentials saved successfully',
            useCustomCredentials: savedCredentials.useCustomCredentials,
        })
    } catch (error) {
        console.error('Error saving credentials:', error)
        return res.status(500).json({ error: 'Failed to save credentials' })
    }
}

async function handleDelete(userId: string, res: NextApiResponse) {
    try {
        await deleteUserCredentials(userId)

        return res.status(200).json({
            success: true,
            message: 'Credentials deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting credentials:', error)
        return res.status(500).json({ error: 'Failed to delete credentials' })
    }
}
