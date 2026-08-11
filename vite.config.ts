import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { serveLegacy } from './vite-plugins/serve-legacy'

// Vite config for Void Motion.
//
// M01: the React application shell is wired up via @vitejs/plugin-react. The
// legacy reference app under `legacy/` is served as plain static files at
// `/legacy` via a custom dev-server middleware, and is NOT part of the Vite
// module graph. No engine behavior is migrated yet — the shell renders
// placeholder regions.
export default defineConfig({
  plugins: [react(), serveLegacy()],
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
  },
  server: {
    // Allow serving the legacy reference app alongside the new shell.
    fs: {
      strict: false,
    },
  },
  // The legacy app is a golden reference served as static assets, not bundled.
  publicDir: false,
})
