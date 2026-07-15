import { describe, it, expect, vi, beforeEach } from 'vitest'
import authHandler from '../../pages/api/auth/[...all]'
import type { NextApiRequest, NextApiResponse } from 'next'

// Mock better-auth's toNodeHandler to return a dummy handler
vi.mock('better-auth/node', () => {
  return {
    toNodeHandler: () => {
      return (req: any, res: any) => {
        res.status(200).json({ success: true })
      }
    }
  }
})

describe('Auth API Rate Limiting', () => {
  let mockRes: Partial<NextApiResponse>

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
  })

  it('allows requests within limit and rejects with 429 after limit is exceeded', async () => {
    // Generate a unique IP for this run so tests don't leak across runs
    const testIp = `192.168.1.${Math.floor(Math.random() * 1000)}`

    // We send 5 requests (the allowed limit)
    for (let i = 0; i < 5; i++) {
      const mockReq = {
        method: 'POST',
        url: '/api/auth/sign-in/email',
        socket: { remoteAddress: testIp },
        headers: {}
      } as unknown as NextApiRequest

      await authHandler(mockReq, mockRes as NextApiResponse)
      expect(mockRes.status).toHaveBeenLastCalledWith(200)
    }

    // The 6th request should be rate limited
    const mockReqBlocked = {
      method: 'POST',
      url: '/api/auth/sign-in/email',
      socket: { remoteAddress: testIp },
      headers: {}
    } as unknown as NextApiRequest

    await authHandler(mockReqBlocked, mockRes as NextApiResponse)
    expect(mockRes.status).toHaveBeenLastCalledWith(429)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Too many requests. Please try again later.' })

    // Other non-sign-in/sign-up requests should not be rate-limited
    const mockReqSession = {
      method: 'GET',
      url: '/api/auth/get-session',
      socket: { remoteAddress: testIp },
      headers: {}
    } as unknown as NextApiRequest

    await authHandler(mockReqSession, mockRes as NextApiResponse)
    expect(mockRes.status).toHaveBeenLastCalledWith(200)
  })
})
