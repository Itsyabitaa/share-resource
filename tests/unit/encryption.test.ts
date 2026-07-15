import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encrypt, decrypt, encryptSafe, decryptSafe } from '../../lib/encryption'

describe('Encryption Utilities', () => {
  const originalKey = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
  })

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey
  })

  it('performs correct round-trip encryption and decryption', () => {
    const text = 'my-secret-credentials-123!'
    const encrypted = encrypt(text)
    
    // Format should be salt:iv:tag:encrypted
    expect(encrypted).toContain(':')
    expect(encrypted.split(':').length).toBe(4)

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(text)
  })

  it('safely handles null and undefined inputs', () => {
    expect(encryptSafe(null)).toBeNull()
    expect(encryptSafe(undefined)).toBeNull()
    expect(decryptSafe(null)).toBeNull()
    expect(decryptSafe(undefined)).toBeNull()

    const text = 'safe-test'
    const encrypted = encryptSafe(text)
    expect(encrypted).not.toBeNull()
    expect(decryptSafe(encrypted)).toBe(text)
  })

  it('throws an error if ENCRYPTION_KEY is not set', () => {
    delete process.env.ENCRYPTION_KEY
    
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set')
    expect(() => decrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set')
  })

  it('throws an error for invalid encrypted data formats', () => {
    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted data format')
    expect(() => decrypt('part1:part2:part3')).toThrow('Invalid encrypted data format')
  })
})
