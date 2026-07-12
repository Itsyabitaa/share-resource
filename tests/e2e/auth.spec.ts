import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  const uniqueEmail = `user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
  const password = 'Password123!'
  const fullName = 'E2E Test User'

  test('Signup successfully and redirects to home page', async ({ page }) => {
    await page.goto('/signup')
    
    // Fill signup form
    await page.fill('#name', fullName)
    await page.fill('#email', uniqueEmail)
    await page.fill('#password', password)
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Verify signup success toast or redirection to homepage
    await expect(page).toHaveURL('/', { timeout: 15000 })
    
    // Header should now show the user's name
    await expect(page.locator('header')).toContainText('Profile')
  })

  test('Login fails with invalid password, succeeds with correct password', async ({ page }) => {
    // 1. Invalid login
    await page.goto('/login')
    await page.fill('#email', uniqueEmail)
    await page.fill('#password', 'WrongPassword123!')
    await page.click('button[type="submit"]')
    
    // Verify toast error is visible
    const toast = page.locator('div', { hasText: 'Login failed' })
    await expect(toast.first()).toBeVisible({ timeout: 5000 })

    // 2. Successful login
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    
    // Redirects to homepage
    await expect(page).toHaveURL('/', { timeout: 15000 })
    await expect(page.locator('header')).toContainText('Profile')
  })

  test('Logout terminates the session and redirects correctly', async ({ page }) => {
    // Navigate to settings (protected route) after logging in
    await page.goto('/login')
    await page.fill('#email', uniqueEmail)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')

    // Navigate to settings
    await page.goto('/settings')
    await expect(page).toHaveURL('/settings')

    // Click Profile to open dropdown
    await page.click('button:has-text("Profile")')

    // Click Sign Out
    await page.click('button:has-text("Sign Out")')

    // Redirect to homepage or login page due to settings auth gate redirecting
    await expect(page).toHaveURL('/login', { timeout: 15000 })
    
    // If we try to access settings again, it should redirect to login
    await page.goto('/settings')
    await expect(page).toHaveURL('/login')
  })

  test('Session persistence across reloads', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', uniqueEmail)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
    
    // Reload the page
    await page.reload()
    
    // Verify session still exists
    await expect(page.locator('header')).toContainText('Profile')
  })
})
