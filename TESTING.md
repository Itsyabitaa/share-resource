# 🧪 Testing Guide for md-Nest

This document provides guidelines on how to run tests locally, understand the test database configurations, and write new unit and end-to-end (E2E) tests.

---

## 🛠️ Testing Stack

Our codebase is verified using two primary testing frameworks:
1. **Vitest + React Testing Library + JSDOM**: For unit and integration tests of hooks, helpers, React components, and utility libraries.
2. **Playwright**: For full end-to-end (E2E) verification of user journeys (editor interaction, saving, authentication redirects, and theme switching) using simulated browser instances.

---

## 📦 Running Tests Locally

Before running tests, ensure you have installed the correct devDependencies:
```bash
npm install
```

### 1. Run Unit & Integration Tests (Vitest)
To run the Vitest test suite once:
```bash
npm run test
```

To run Vitest in interactive watch mode (useful during active development):
```bash
npm run test:watch
```

### 2. Run E2E Tests (Playwright)
To execute E2E tests, you must first ensure you have the required browser binaries installed:
```bash
npx playwright install chromium
```

To run the Playwright test suite:
```bash
npm run test:e2e
```
*Note: Playwright will automatically boot up a Next.js development server on port `3000` via its `webServer` config block before executing the E2E tests.*

To run Playwright in UI mode (debugging test steps interactively):
```bash
npx playwright test --ui
```

---

## 🗄️ Database Configurations for Tests

For test environments, we enforce complete database isolation to prevent writing dummy test rows into production or development databases.

### Local PostgreSQL Setup
1. Create a dedicated testing database on your PostgreSQL host (e.g. `mdnest_test`).
2. Add a `DATABASE_URL_TEST` environment variable to your local configuration (or write it directly into `.env.local` if testing locally):
   ```env
   DATABASE_URL_TEST=postgresql://username:password@localhost:5432/mdnest_test
   ```
3. To initialize or migrate the test database schema:
   ```bash
   DATABASE_URL=$DATABASE_URL_TEST npm run migrate-fresh
   ```

### Neon Database Test Branch (Optional)
If utilizing Neon, you can spin up an isolated test branch for development:
```bash
neon branches create test
```
Use the connection string from the new test branch as your `DATABASE_URL_TEST`.

### GitHub Actions CI environment
In the GitHub Actions CI environment, the runner maps standard encrypted secrets to environment variables:
```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
```

---

## 📝 Writing New Tests

### Adding a Unit/Integration Test (Vitest)
Unit tests should reside in `tests/unit/` and follow the file naming convention `*.test.ts` or `*.test.tsx`.

Example: Testing a simple React helper component `components/Toast.tsx`
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Toast from '@/components/Toast'

describe('Toast Component', () => {
  it('renders the toast message correctly', () => {
    render(<Toast message="Successfully saved" type="success" onClose={() => {}} />)
    expect(screen.getByText('Successfully saved')).toBeInTheDocument()
  })
})
```

### Adding an E2E Test (Playwright)
E2E tests should reside in `tests/e2e/` and follow the file naming convention `*.spec.ts`.

Example: Testing a page transition
```typescript
import { test, expect } from '@playwright/test'

test('should navigate to the about page', async ({ page }) => {
  await page.goto('/')
  await page.click('text=About') // Click a link/button with text "About"
  await expect(page).toHaveURL('/about')
  await expect(page.locator('h1')).toContainText('About mdnest')
})
```
