import { test, expect } from '@playwright/test'

test('homepage renders and shows main features', async ({ page }) => {
  await page.goto('/')
  // Verify main header on homepage
  await expect(page.locator('h1')).toContainText('md-Nest')
})
