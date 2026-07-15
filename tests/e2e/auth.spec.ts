import { test, expect } from '@playwright/test'

test('Full Authentication Lifecycle', async ({ page }) => {
  const uniqueEmail = `user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
  const password = 'Password123!'
  const fullName = 'E2E Test User'

  // 1. Signup Flow
  await page.goto('/signup')
  await page.fill('#name', fullName)
  await page.fill('#email', uniqueEmail)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  
  // Verify signup success and landing
  await expect(page).toHaveURL('/', { timeout: 15000 })
  await expect(page.locator('button:has-text("Profile")')).toBeVisible({ timeout: 10000 })

  // 2. Session Persistence on Reload
  await page.reload()
  await expect(page.locator('button:has-text("Profile")')).toBeVisible({ timeout: 5000 })

  // 3. Settings Accessibility (Protected Route)
  await page.goto('/settings')
  await expect(page).toHaveURL('/settings')

  // 4. Logout Flow
  await page.click('button:has-text("Profile")')
  await page.click('button:has-text("Sign Out")')
  await expect(page).toHaveURL('/', { timeout: 15000 })
  await expect(page.locator('button:has-text("Sign In")')).toBeVisible({ timeout: 10000 })

  // 5. Protected Route Gate Redirect
  await page.goto('/settings')
  await expect(page).toHaveURL('/login', { timeout: 10000 })

  // 6. Login Validation (Incorrect Password)
  await page.fill('#email', uniqueEmail)
  await page.fill('#password', 'IncorrectPass123!')
  await page.click('button[type="submit"]')
  await expect(page.locator('text=/Invalid/i').first()).toBeVisible({ timeout: 5000 })

  // 7. Login Validation (Correct Password)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/', { timeout: 15000 })
  await expect(page.locator('button:has-text("Profile")')).toBeVisible({ timeout: 10000 })
})
