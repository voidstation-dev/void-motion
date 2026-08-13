import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { serveLegacy } from './vite-plugins/serve-legacy'
import { copyLegacyRuntime } from './vite-plugins/copy-legacy'

// Vite config for Void Motion.
//
// M01: the React application shell is wired up via @vitejs/plugin-react. The
// legacy reference app under `legacy/` is served as plain static files at
// `/legacy` via a custom dev-server middleware, and is NOT part of the Vite
// module graph. No engine behavior is migrated yet — the shell renders
// placeholder regions.
export default defineConfig({
  plugins: [react(), serveLegacy(), copyLegacyRuntime()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@migration': fileURLToPath(new URL('./src/migration', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/legacy/animations.js')) return 'legacy-engine'
          if (id.includes('/node_modules/react') || id.includes('/node_modules/scheduler')) {
            return 'react-vendor'
          }
          if (id.includes('/node_modules/@radix-ui') || id.includes('/node_modules/lucide-react')) {
            return 'ui-vendor'
          }
          if (id.includes('/node_modules/i18next') || id.includes('/node_modules/react-i18next')) {
            return 'i18n-vendor'
          }
        },
      },
    },
  },
  server: {
    // Allow serving the legacy reference app alongside the new shell.
    fs: {
      strict: false,
    },
  },
  // SEO/PWA files are copied from public/. The animation runtime is copied by
  // copyLegacyRuntime so production and preview builds remain self-contained.
  publicDir: 'public',
})
