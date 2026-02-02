import sql from './neonClient'
import { encrypt, decrypt, encryptSafe, decryptSafe } from './encryption'
import { v2 as cloudinary } from 'cloudinary'

export interface UserCredentials {
    id: string
    userId: string
    neonDatabaseUrl: string | null
    cloudinaryCloudName: string | null
    cloudinaryApiKey: string | null
    cloudinaryApiSecret: string | null
    useCustomCredentials: boolean
    createdAt: string
    updatedAt: string
}

export interface CloudinaryConfig {
    cloud_name: string
    api_key: string
    api_secret: string
}

/**
 * Get user credentials (decrypted)
 */
export async function getUserCredentials(userId: string): Promise<UserCredentials | null> {
    try {
        const result = await sql`
      SELECT 
        id,
        user_id,
        neon_database_url,
        cloudinary_cloud_name,
        cloudinary_api_key,
        cloudinary_api_secret,
        use_custom_credentials,
        created_at::text as created_at,
        updated_at::text as updated_at
      FROM user_credentials 
      WHERE user_id = ${userId}
    `

        if (result.length === 0) {
            return null
        }

        const row = result[0]

        return {
            id: row.id,
            userId: row.user_id,
            neonDatabaseUrl: decryptSafe(row.neon_database_url),
            cloudinaryCloudName: decryptSafe(row.cloudinary_cloud_name),
            cloudinaryApiKey: decryptSafe(row.cloudinary_api_key),
            cloudinaryApiSecret: decryptSafe(row.cloudinary_api_secret),
            useCustomCredentials: row.use_custom_credentials,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }
    } catch (error) {
        console.error('Error getting user credentials:', error)
        throw error
    }
}

/**
 * Save or update user credentials (encrypted)
 */
export async function saveUserCredentials(
    userId: string,
    neonDatabaseUrl: string | null,
    cloudinaryCloudName: string | null,
    cloudinaryApiKey: string | null,
    cloudinaryApiSecret: string | null,
    useCustomCredentials: boolean
): Promise<UserCredentials> {
    try {
        // Encrypt credentials
        const encryptedNeonUrl = encryptSafe(neonDatabaseUrl)
        const encryptedCloudName = encryptSafe(cloudinaryCloudName)
        const encryptedApiKey = encryptSafe(cloudinaryApiKey)
        const encryptedApiSecret = encryptSafe(cloudinaryApiSecret)

        // Check if credentials already exist
        const existing = await sql`
      SELECT id FROM user_credentials WHERE user_id = ${userId}
    `

        let result

        if (existing.length > 0) {
            // Update existing credentials
            result = await sql`
        UPDATE user_credentials 
        SET 
          neon_database_url = ${encryptedNeonUrl},
          cloudinary_cloud_name = ${encryptedCloudName},
          cloudinary_api_key = ${encryptedApiKey},
          cloudinary_api_secret = ${encryptedApiSecret},
          use_custom_credentials = ${useCustomCredentials},
          updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING 
          id,
          user_id,
          neon_database_url,
          cloudinary_cloud_name,
          cloudinary_api_key,
          cloudinary_api_secret,
          use_custom_credentials,
          created_at::text as created_at,
          updated_at::text as updated_at
      `
        } else {
            // Insert new credentials
            result = await sql`
        INSERT INTO user_credentials (
          user_id,
          neon_database_url,
          cloudinary_cloud_name,
          cloudinary_api_key,
          cloudinary_api_secret,
          use_custom_credentials
        )
        VALUES (${userId}, ${encryptedNeonUrl}, ${encryptedCloudName}, ${encryptedApiKey}, ${encryptedApiSecret}, ${useCustomCredentials})
        RETURNING 
          id,
          user_id,
          neon_database_url,
          cloudinary_cloud_name,
          cloudinary_api_key,
          cloudinary_api_secret,
          use_custom_credentials,
          created_at::text as created_at,
          updated_at::text as updated_at
      `
        }

        const row = result[0]

        return {
            id: row.id,
            userId: row.user_id,
            neonDatabaseUrl: decryptSafe(row.neon_database_url),
            cloudinaryCloudName: decryptSafe(row.cloudinary_cloud_name),
            cloudinaryApiKey: decryptSafe(row.cloudinary_api_key),
            cloudinaryApiSecret: decryptSafe(row.cloudinary_api_secret),
            useCustomCredentials: row.use_custom_credentials,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }
    } catch (error) {
        console.error('Error saving user credentials:', error)
        throw error
    }
}

/**
 * Delete user credentials
 */
export async function deleteUserCredentials(userId: string): Promise<void> {
    try {
        await sql`
      DELETE FROM user_credentials WHERE user_id = ${userId}
    `
    } catch (error) {
        console.error('Error deleting user credentials:', error)
        throw error
    }
}

/**
 * Get Cloudinary configuration for a user
 * Returns custom config if available and enabled, otherwise default config
 */
export async function getCloudinaryConfig(userId?: string): Promise<CloudinaryConfig> {
    // Default configuration
    const defaultConfig: CloudinaryConfig = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
        api_key: process.env.CLOUDINARY_API_KEY!,
        api_secret: process.env.CLOUDINARY_API_SECRET!,
    }

    // If no userId, return default
    if (!userId) {
        return defaultConfig
    }

    try {
        const credentials = await getUserCredentials(userId)

        // If user has custom credentials enabled and all fields are set, use them
        if (
            credentials?.useCustomCredentials &&
            credentials.cloudinaryCloudName &&
            credentials.cloudinaryApiKey &&
            credentials.cloudinaryApiSecret
        ) {
            return {
                cloud_name: credentials.cloudinaryCloudName,
                api_key: credentials.cloudinaryApiKey,
                api_secret: credentials.cloudinaryApiSecret,
            }
        }

        // Otherwise, return default
        return defaultConfig
    } catch (error) {
        console.error('Error getting Cloudinary config:', error)
        // On error, return default config
        return defaultConfig
    }
}

/**
 * Create a Cloudinary instance with user-specific or default configuration
 */
export async function getCloudinaryInstance(userId?: string) {
    const config = await getCloudinaryConfig(userId)

    // Create a new Cloudinary instance with the config
    const instance = cloudinary
    instance.config(config)

    return instance
}

/**
 * Validate Cloudinary credentials by attempting to ping the API
 */
export async function validateCloudinaryCredentials(
    cloudName: string,
    apiKey: string,
    apiSecret: string
): Promise<{ valid: boolean; error?: string }> {
    try {
        // Create a temporary Cloudinary instance
        const testInstance = cloudinary
        testInstance.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
        })

        // Try to ping the API
        await testInstance.api.ping()

        return { valid: true }
    } catch (error: any) {
        return {
            valid: false,
            error: error.message || 'Invalid Cloudinary credentials',
        }
    }
}
