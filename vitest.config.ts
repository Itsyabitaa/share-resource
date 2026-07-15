import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**',
      '**/playwright-report/**',
      '**/test-results/**'
    ],
    coverage: {
      provider: 'v8',
      include: ['lib/**', 'utils/**'],
      exclude: [
        'lib/ThemeContext.tsx',
        'lib/SidebarContext.tsx',
        'lib/auth-client.ts',
        'lib/auth.ts',
        'lib/theme.ts',
        'lib/supabaseClient.ts',
        'lib/cloudinary.ts'
      ],
      reporter: ['text', 'json', 'html']
    }
  },
})
