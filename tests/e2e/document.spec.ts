import { test, expect } from '@playwright/test'
import sql from '../../lib/neonClient'
import path from 'path'

test.describe('Document and Upload Flow', () => {
  // Run serially
  test.describe.configure({ mode: 'serial' })

  const uniqueEmail = `user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
  const password = 'Password123!'
  const fullName = 'Document Tester'
  let sharedFileId: string = ''
  let privateFileId: string = ''

  test('Guest Mode: upload a document directly and check 3-day expiry', async ({ page }) => {
    await page.goto('/')

    // 1. Enter text in SimpleMDE editor
    await page.locator('.CodeMirror').first().click()
    await page.keyboard.type('This is a guest markdown document.')

    // 2. Add title
    await page.fill('input[placeholder="Enter document title..."]', 'Guest Document Title')

    // 3. Add author acknowledgment
    await page.check('#show-author')
    await page.fill('input[placeholder="Enter your name or handle..."]', 'Guest Author')

    // 4. Click Share
    await page.click('button:has-text("Share")')

    // 5. Verify redirect to file view
    await expect(page).toHaveURL(/\/file\//, { timeout: 15000 })

    // 6. Verify in database directly to confirm the storage tier and expiry setting
    const fileId = page.url().split('/').pop()
    const dbFiles = await sql`
      SELECT expires_at, storage_tier 
      FROM files 
      WHERE id = ${fileId}
    `
    expect(dbFiles.length).toBe(1)
    expect(dbFiles[0].storage_tier).toBe('guest')
    expect(dbFiles[0].expires_at).not.toBeNull()

    const expiryTime = new Date(dbFiles[0].expires_at).getTime()
    // Expiry should be roughly 3 days from now
    const expectedExpiry = Date.now() + 3 * 24 * 60 * 60 * 1000
    expect(expiryTime).toBeGreaterThan(expectedExpiry - 60000) // Within 1 minute window
    expect(expiryTime).toBeLessThan(expectedExpiry + 60000)
  })

  test('Registered Mode: signup, create public and private documents', async ({ page }) => {
    // 1. Signup a fresh user
    await page.goto('/signup')
    await page.fill('#name', fullName)
    await page.fill('#email', uniqueEmail)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 15000 })

    // 2. Create a Public Document
    await page.locator('.CodeMirror').first().click()
    await page.keyboard.type('Public markdown content here.')
    await page.fill('input[placeholder="Enter document title..."]', 'Public Document Title')
    
    // Toggle public on
    await page.check('#is-public')
    // Fill hashtags
    await page.fill('input[placeholder="technology, ai, tutorial..."]', 'science, code')
    // Click Share
    await page.click('button:has-text("Share")')
    
    await expect(page).toHaveURL(/\/file\//, { timeout: 15000 })
    sharedFileId = page.url().split('/').pop() || ''

    // Verify public DB properties
    let dbFile = await sql`
      SELECT is_public, hashtags, storage_tier, expires_at 
      FROM files WHERE id = ${sharedFileId}
    `
    expect(dbFile[0].storage_tier).toBe('registered')
    expect(dbFile[0].is_public).toBe(true)
    expect(dbFile[0].expires_at).toBeNull()
    expect(dbFile[0].hashtags).toContain('science')

    // 3. Create a Private Document
    await page.goto('/')
    await page.locator('.CodeMirror').first().click()
    await page.keyboard.type('Private markdown content here.')
    await page.fill('input[placeholder="Enter document title..."]', 'Private Document Title')
    
    // Ensure #is-public is unchecked (default is unchecked)
    const isPublicChecked = await page.isChecked('#is-public')
    if (isPublicChecked) {
      await page.uncheck('#is-public')
    }
    
    await page.click('button:has-text("Share")')
    await expect(page).toHaveURL(/\/file\//, { timeout: 15000 })
    privateFileId = page.url().split('/').pop() || ''

    // Verify private DB properties
    dbFile = await sql`
      SELECT is_public, storage_tier, expires_at 
      FROM files WHERE id = ${privateFileId}
    `
    expect(dbFile[0].is_public).toBe(false)
    expect(dbFile[0].expires_at).toBeNull()
  })

  test('File Conversion Mode: upload test-input.txt and verify text conversion', async ({ page }) => {
    // Re-login to ensure session
    await page.goto('/login')
    await page.fill('#email', uniqueEmail)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')

    // Switch to Upload Mode
    await page.click('button:has-text("Upload File")')

    // Set input file
    const filePath = path.resolve(__dirname, '../../test-input.txt')
    await page.setInputFiles('#file-upload', filePath)

    // Wait for auto-switch back to text editor mode by checking the title value
    await expect(page.locator('input[placeholder="Enter document title..."]')).toHaveValue('test-input.txt', { timeout: 15000 })

    // Click Share to save the converted file
    await page.click('button:has-text("Share")')
    await expect(page).toHaveURL(/\/file\//, { timeout: 15000 })

    const fileId = page.url().split('/').pop()
    const dbFile = await sql`
      SELECT title, storage_tier, file_type 
      FROM files WHERE id = ${fileId}
    `
    expect(dbFile[0].title).toBe('test-input.txt')
    expect(dbFile[0].file_type).toBe('txt')
  })

  test('Shareable Link permissions: public resolves, private checks auth', async ({ page }) => {
    // Start an anonymous session by launching a new browser page context
    const context = await page.context().browser()?.newContext()
    const anonPage = await context?.newPage()
    if (!anonPage) throw new Error('Failed to open anonymous page')

    // 1. Hitting public link works
    await anonPage.goto(`/file/${sharedFileId}`)
    await expect(anonPage.locator('h1')).toContainText('Public Document Title')

    // 2. Hitting private link returns 404 (Next.js notFound redirects to 404) or shows not found
    await anonPage.goto(`/file/${privateFileId}`)
    // Verify it redirects or shows 404
    await expect(anonPage.locator('h1')).not.toContainText('Private Document Title')
    
    await anonPage.close()
    await context?.close()
  })
})
