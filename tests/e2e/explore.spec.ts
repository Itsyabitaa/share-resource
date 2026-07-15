import { test, expect } from '@playwright/test'
import sql from '../../lib/neonClient'

test.describe('Explore and Hashtag Search Flow', () => {
  // Configure tests to run serially in a single worker to prevent parallel workers from double-seeding the DB
  test.describe.configure({ mode: 'serial' })

  let publicFileId1: string = ''
  let publicFileId2: string = ''
  let privateFileId: string = ''

  test.beforeAll(async () => {
    // Clean up any old files from previous tests
    await sql`DELETE FROM files WHERE title LIKE 'Explore %'`

    // Seed test files directly to Neon DB
    const res1 = await sql`
      INSERT INTO files (id, title, author, cloudinary_url, file_type, file_size, is_public, hashtags, storage_tier)
      VALUES (
        gen_random_uuid(), 
        'Explore Public Doc 1', 
        'Nature Explorer', 
        'https://res.cloudinary.com/dummy-url/doc1', 
        'md', 
        1024, 
        true, 
        ARRAY['nature', 'earth'], 
        'registered'
      )
      RETURNING id
    `
    publicFileId1 = res1[0].id

    const res2 = await sql`
      INSERT INTO files (id, title, author, cloudinary_url, file_type, file_size, is_public, hashtags, storage_tier)
      VALUES (
        gen_random_uuid(), 
        'Explore Public Doc 2', 
        'Sun Gazer', 
        'https://res.cloudinary.com/dummy-url/doc2', 
        'md', 
        2048, 
        true, 
        ARRAY['nature', 'sun'], 
        'registered'
      )
      RETURNING id
    `
    publicFileId2 = res2[0].id

    const res3 = await sql`
      INSERT INTO files (id, title, author, cloudinary_url, file_type, file_size, is_public, hashtags, storage_tier)
      VALUES (
        gen_random_uuid(), 
        'Explore Private Doc 3', 
        'Secret Agent', 
        'https://res.cloudinary.com/dummy-url/doc3', 
        'md', 
        512, 
        false, 
        ARRAY['secret'], 
        'registered'
      )
      RETURNING id
    `
    privateFileId = res3[0].id
  })

  test.afterAll(async () => {
    // Clean up seeded test files
    await sql`DELETE FROM files WHERE id IN (${publicFileId1}, ${publicFileId2}, ${privateFileId})`
  })

  test('Assert public document visibility vs private document exclusion', async ({ page }) => {
    await page.goto('/explore')

    // Public documents should be visible
    await expect(page.locator('text=Explore Public Doc 1').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Explore Public Doc 2').first()).toBeVisible({ timeout: 5000 })

    // Private document should NOT be visible
    await expect(page.locator('text=Explore Private Doc 3')).not.toBeVisible()
  })

  test('Verify search bar filter functionality', async ({ page }) => {
    await page.goto('/explore')

    // Search by title
    const searchInput = page.locator('input[placeholder="Search documents by title or author..."]')
    await searchInput.fill('Explore Public Doc 1')

    // Doc 1 should be visible, Doc 2 should disappear
    await expect(page.locator('text=Explore Public Doc 1').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Explore Public Doc 2')).not.toBeVisible()

    // Clear search and query by author
    await searchInput.fill('Sun Gazer')
    await expect(page.locator('text=Explore Public Doc 2').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Explore Public Doc 1')).not.toBeVisible()
  })

  test('Verify hashtag clicking filters correctly', async ({ page }) => {
    await page.goto('/explore')

    // Verify hashtags list has nature, earth, and sun tags
    // The button has format #earth (1)
    const earthBtn = page.locator('button:has-text("#earth")').first()
    await expect(earthBtn).toBeVisible({ timeout: 5000 })

    // Click #earth tag
    await earthBtn.click()

    // Explore Public Doc 1 has tag 'earth', Public Doc 2 does not.
    await expect(page.locator('text=Explore Public Doc 1').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Explore Public Doc 2')).not.toBeVisible()

    // De-select hashtag by clicking again
    await earthBtn.click()
    await expect(page.locator('text=Explore Public Doc 2').first()).toBeVisible({ timeout: 5000 })
  })
})
