import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derives a key from the encryption key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256')
}

/**
 * Encrypts a string using AES-256-GCM
 * @param text - The text to encrypt
 * @returns Encrypted string in format: salt:iv:tag:encrypted
 */
export function encrypt(text: string): string {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable is not set')
    }

    const salt = crypto.randomBytes(SALT_LENGTH)
    const key = deriveKey(process.env.ENCRYPTION_KEY, salt)
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const tag = cipher.getAuthTag()

    // Return format: salt:iv:tag:encrypted
    return [
        salt.toString('hex'),
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted
    ].join(':')
}

/**
 * Decrypts a string encrypted with the encrypt function
 * @param encryptedData - The encrypted string in format: salt:iv:tag:encrypted
 * @returns Decrypted string
 */
export function decrypt(encryptedData: string): string {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable is not set')
    }

    const parts = encryptedData.split(':')
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format')
    }

    const [saltHex, ivHex, tagHex, encrypted] = parts

    const salt = Buffer.from(saltHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')

    const key = deriveKey(process.env.ENCRYPTION_KEY, salt)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
}

/**
 * Safely encrypts a value, returns null if value is null/undefined
 */
export function encryptSafe(value: string | null | undefined): string | null {
    if (!value) return null
    return encrypt(value)
}

/**
 * Safely decrypts a value, returns null if value is null/undefined
 */
export function decryptSafe(value: string | null | undefined): string | null {
    if (!value) return null
    return decrypt(value)
}
