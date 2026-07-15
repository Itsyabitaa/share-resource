import { describe, it, expect, vi, beforeEach } from 'vitest'
import saveHandler from '../../pages/api/save'
import type { NextApiRequest, NextApiResponse } from 'next'

describe('File Upload Hardening API', () => {
  let mockRes: Partial<NextApiResponse>

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      end: vi.fn()
    }
  })

  it('/api/save rejects content larger than 5MB with 413 Payload Too Large', async () => {
    // Generate content larger than 5MB (5.1MB)
    const largeContent = 'a'.repeat(5.1 * 1024 * 1024)

    const mockReq = {
      method: 'POST',
      body: {
        content: largeContent,
        title: 'Large Doc'
      },
      headers: {}
    } as unknown as NextApiRequest

    await saveHandler(mockReq, mockRes as NextApiResponse)

    expect(mockRes.status).toHaveBeenCalledWith(413)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'File size exceeds maximum limit of 5MB'
    })
  })
})
