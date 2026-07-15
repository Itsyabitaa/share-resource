import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import handler from '../../pages/api/cleanup'
import sql from '../../lib/neonClient'
import cloudinary from '../../lib/cloudinary'
import type { NextApiRequest, NextApiResponse } from 'next'

// Mock Cloudinary uploader destroy method
vi.mock('../../lib/cloudinary', () => ({
  default: {
    uploader: {
      destroy: vi.fn().mockResolvedValue({ result: 'ok' })
    }
  }
}))

describe('Cleanup Cron API Route', () => {
  let expiredFileId: string = ''
  let activeFileId: string = ''
  let permanentFileId: string = ''

  beforeEach(async () => {
    vi.clearAllMocks()

    // 1. Seed expired guest file
    const res1 = await sql`
      INSERT INTO files (id, title, author, cloudinary_url, file_type, file_size, is_public, storage_tier, expires_at)
      VALUES (
        gen_random_uuid(),
        'Expired Guest Doc',
        'Guest',
        'https://res.cloudinary.com/dummy/raw/upload/v1/md-nest/expired123.md',
        'md',
        100,
        false,
        'guest',
        NOW() - INTERVAL '1 hour'
      )
      RETURNING id
    `
    expiredFileId = res1[0].id

    // 2. Seed active guest file (expires in 2 days)
    const res2 = await sql`
      INSERT INTO files (id, title, author, cloudinary_url, file_type, file_size, is_public, storage_tier, expires_at)
      VALUES (
        gen_random_uuid(),
        'Active Guest Doc',
        'Guest',
        'https://res.cloudinary.com/dummy/raw/upload/v1/md-nest/active123.md',
        'md',
        200,
        false,
        'guest',
        NOW() + INTERVAL '2 days'
      )
      RETURNING id
    `
    activeFileId = res2[0].id

    // 3. Seed permanent registered file (no expiry)
    const res3 = await sql`
      INSERT INTO files (id, title, author, cloudinary_url, file_type, file_size, is_public, storage_tier, expires_at)
      VALUES (
        gen_random_uuid(),
        'Permanent Doc',
        'User',
        'https://res.cloudinary.com/dummy/raw/upload/v1/md-nest/permanent123.md',
        'md',
        300,
        false,
        'registered',
        NULL
      )
      RETURNING id
    `
    permanentFileId = res3[0].id
  })

  afterEach(async () => {
    // Clean up database records
    await sql`
      DELETE FROM files 
      WHERE id IN (${expiredFileId}, ${activeFileId}, ${permanentFileId})
    `
  })

  // Helper to create mock request and response
  const createMockReqRes = (method: string, headers: Record<string, string>) => {
    const req = {
      method,
      headers
    } as unknown as NextApiRequest

    let statusVal = 200
    let jsonVal: any = null

    const res = {
      status: (code: number) => {
        statusVal = code
        return res
      },
      json: (data: any) => {
        jsonVal = data
        return res
      }
    } as unknown as NextApiResponse

    return {
      req,
      res,
      getStatus: () => statusVal,
      getJson: () => jsonVal
    }
  }

  it('rejects non-POST methods with 405', async () => {
    const { req, res, getStatus, getJson } = createMockReqRes('GET', {})
    await handler(req, res)

    expect(getStatus()).toBe(405)
    expect(getJson().error).toBe('Method not allowed')
  })

  it('rejects unauthorized requests when CLEANUP_CRON_SECRET is set', async () => {
    // Temporarily set cron secret env variable
    const originalSecret = process.env.CLEANUP_CRON_SECRET
    process.env.CLEANUP_CRON_SECRET = 'SuperSecretToken'

    const { req, res, getStatus } = createMockReqRes('POST', {
      authorization: 'Bearer WrongToken'
    })
    await handler(req, res)

    expect(getStatus()).toBe(401)

    // Restore env variable
    process.env.CLEANUP_CRON_SECRET = originalSecret
  })

  it('successfully cleans up expired files and leaves active ones', async () => {
    const originalSecret = process.env.CLEANUP_CRON_SECRET
    process.env.CLEANUP_CRON_SECRET = 'SuperSecretToken'

    const { req, res, getStatus, getJson } = createMockReqRes('POST', {
      authorization: 'Bearer SuperSecretToken'
    })

    await handler(req, res)

    expect(getStatus()).toBe(200)
    expect(getJson().success).toBe(true)
    expect(getJson().stats.totalExpired).toBeGreaterThanOrEqual(1)

    // Cloudinary destroy should be called for the expired file public ID
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('md-nest/expired123', {
      resource_type: 'raw'
    })

    // Verify expired file is deleted from database
    const dbExpired = await sql`SELECT id FROM files WHERE id = ${expiredFileId}`
    expect(dbExpired.length).toBe(0)

    // Verify active file remains in database
    const dbActive = await sql`SELECT id FROM files WHERE id = ${activeFileId}`
    expect(dbActive.length).toBe(1)

    // Verify permanent file remains in database
    const dbPermanent = await sql`SELECT id FROM files WHERE id = ${permanentFileId}`
    expect(dbPermanent.length).toBe(1)

    process.env.CLEANUP_CRON_SECRET = originalSecret
  })
})
