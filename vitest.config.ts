import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// Vitest config for Void Motion.
//
// M00 tests are pure TypeScript unit/contract tests over the domain types,
// legacy adapters, and the seeded random utility. They do not load the
// legacy browser app. jsdom provides a minimal DOM for any code that
// references `window`/`document` types without exercising real rendering.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@migration': fileURLToPath(new URL('./src/migration', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['tests/setup/jsdom-polyfills.ts'],
    exclude: ['legacy/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types/index.ts'],
    },
  },
})
