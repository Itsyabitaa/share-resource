import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  saveUserCredentials,
  getUserCredentials,
  deleteUserCredentials,
  getCloudinaryConfig,
  validateCloudinaryCredentials
} from '../../lib/userCredentials'
import sql from '../../lib/neonClient'
import { v2 as cloudinary } from 'cloudinary'

// Mock Cloudinary API ping with both named and default exports
vi.mock('cloudinary', () => {
  const mockPing = vi.fn().mockResolvedValue({ status: 'ok' })
  const mockConfig = vi.fn()
  const v2 = {
    config: mockConfig,
    api: {
      ping: mockPing
    }
  }
  return {
    v2,
    default: { v2 }
  }
})

describe('User Credentials Management', () => {
  const testUserId = '00000000-0000-0000-0000-000000000001'
  const originalKey = process.env.ENCRYPTION_KEY

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
    
    // Clean up any stale records first (foreign keys dictate order)
    await sql`DELETE FROM user_credentials WHERE user_id = ${testUserId}`
    await sql`DELETE FROM "user" WHERE id = ${testUserId}`

    // Insert user first to prevent foreign key constraint violations in user_credentials
    await sql`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      VALUES (${testUserId}, 'Test User', 'test@example.com', true, NOW(), NOW())
    `
  })

  afterEach(async () => {
    // Delete credentials first, then user due to FK constraint
    await sql`DELETE FROM user_credentials WHERE user_id = ${testUserId}`
    await sql`DELETE FROM "user" WHERE id = ${testUserId}`
    process.env.ENCRYPTION_KEY = originalKey
  })

  it('saves encrypted credentials and retrieves them decrypted', async () => {
    const dbUrl = 'postgresql://db_user:pass@localhost:5432/db'
    const cloudName = 'custom_cloud'
    const apiKey = 'custom_key'
    const apiSecret = 'custom_secret'

    // 1. Save credentials
    const saved = await saveUserCredentials(
      testUserId,
      dbUrl,
      cloudName,
      apiKey,
      apiSecret,
      true
    )

    expect(saved.userId).toBe(testUserId)
    expect(saved.neonDatabaseUrl).toBe(dbUrl)
    expect(saved.cloudinaryCloudName).toBe(cloudName)
    expect(saved.cloudinaryApiKey).toBe(apiKey)
    expect(saved.cloudinaryApiSecret).toBe(apiSecret)
    expect(saved.useCustomCredentials).toBe(true)

    // 2. Query the raw database row to assert it is actually encrypted
    const rawRow = await sql`
      SELECT neon_database_url, cloudinary_api_secret 
      FROM user_credentials 
      WHERE user_id = ${testUserId}
    `
    expect(rawRow.length).toBe(1)
    // The values in DB must be encrypted strings with AES format (colons)
    expect(rawRow[0].neon_database_url).toContain(':')
    expect(rawRow[0].cloudinary_api_secret).toContain(':')
    expect(rawRow[0].neon_database_url).not.toBe(dbUrl)

    // 3. Get credentials and verify they are decrypted
    const retrieved = await getUserCredentials(testUserId)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.neonDatabaseUrl).toBe(dbUrl)
    expect(retrieved!.cloudinaryCloudName).toBe(cloudName)

    // 4. Delete credentials
    await deleteUserCredentials(testUserId)
    const afterDelete = await getUserCredentials(testUserId)
    expect(afterDelete).toBeNull()
  })

  it('falls back to default Cloudinary config if user credentials not present or disabled', async () => {
    // 1. No credentials saved
    const config1 = await getCloudinaryConfig(testUserId)
    expect(config1.cloud_name).toBe(process.env.CLOUDINARY_CLOUD_NAME)

    // 2. Saved but disabled
    await saveUserCredentials(
      testUserId,
      'dbUrl',
      'custom_cloud',
      'custom_key',
      'custom_secret',
      false // disabled
    )
    const config2 = await getCloudinaryConfig(testUserId)
    expect(config2.cloud_name).toBe(process.env.CLOUDINARY_CLOUD_NAME)
  })

  it('validates Cloudinary credentials correctly on api ping', async () => {
    // 1. Successful ping
    const successResult = await validateCloudinaryCredentials('cloud', 'key', 'secret')
    expect(successResult.valid).toBe(true)
    expect(cloudinary.api.ping).toHaveBeenCalled()

    // 2. Failed ping
    const testError = new Error('API limit reached or bad secret')
    vi.spyOn(cloudinary.api, 'ping').mockRejectedValueOnce(testError)

    const failureResult = await validateCloudinaryCredentials('cloud', 'key', 'secret')
    expect(failureResult.valid).toBe(false)
    expect(failureResult.error).toBe('API limit reached or bad secret')
  })
})
