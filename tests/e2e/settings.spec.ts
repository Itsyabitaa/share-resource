import { test, expect } from '@playwright/test'

test.describe('Settings and Custom Credentials Flow', () => {
  const uniqueEmail = `settings-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
  const password = 'Password123!'
  const fullName = 'Settings Tester'

  test('Update profile name, validate Cloudinary, and save custom credentials', async ({ page }) => {
    // 1. Sign up a fresh user
    await page.goto('/signup')
    await page.fill('#name', fullName)
    await page.fill('#email', uniqueEmail)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 15000 })

    // 2. Navigate to settings page
    await page.goto('/settings')
    await expect(page).toHaveURL('/settings')

    // 3. Verify display name input autofilled with signup name
    const nameInput = page.locator('input[placeholder="Enter your name"]')
    await expect(nameInput).toHaveValue(fullName)

    // 4. Update profile name
    await nameInput.fill('Settings Tester Updated')
    await page.click('button:has-text("Save Profile")')

    // Verify profile updated toast
    await expect(page.locator('text=Profile updated successfully!')).toBeVisible({ timeout: 5000 })

    // 5. Toggle Custom Credentials
    const checkbox = page.locator('input[type="checkbox"]')
    await checkbox.check()

    // 6. Enter credentials (using default valid Cloudinary credentials from .env.local to test real ping)
    // Cloudinary credentials
    const cloudNameInput = page.locator('input[placeholder="your-cloud-name"]')
    const apiKeyInput = page.locator('input[placeholder="123456789012345"]')
    const apiSecretInput = page.locator('input[placeholder="••••••••••••••••"]')

    // We can extract them from process.env since playwright.config.ts loads .env.local
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dtwtxadvb'
    const apiKey = process.env.CLOUDINARY_API_KEY || '613417221388679'
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'cejOHhHRuE5en8xlENPKwS6tuT8'

    await cloudNameInput.fill(cloudName)
    await apiKeyInput.fill(apiKey)
    await apiSecretInput.fill(apiSecret)

    // 7. Validate Credentials
    await page.click('button:has-text("Validate Cloudinary Credentials")')
    await expect(page.locator('text=Cloudinary credentials are valid!')).toBeVisible({ timeout: 10000 })

    // 8. Save Settings
    await page.click('button:has-text("Save Settings")')
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible({ timeout: 5000 })

    // Verify Delete button becomes visible
    const deleteBtn = page.locator('button:has-text("Delete Credentials")')
    await expect(deleteBtn).toBeVisible()

    // 9. Revert/Delete Credentials
    // Playwright handles dialog automatically if we dismiss/accept it
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete your custom credentials?')
      dialog.accept()
    })
    await deleteBtn.click()

    // Verify credentials deleted toast
    await expect(page.locator('text=Credentials deleted successfully')).toBeVisible({ timeout: 5000 })
    await expect(deleteBtn).not.toBeVisible()
  })
})
