/**
 * Vite dev-server plugin: serve the frozen legacy Inkplainer reference app
 * at `/legacy` so it stays accessible alongside the new React shell.
 *
 * The legacy app is plain static files (index.html + animations.js + images/);
 * it must NOT enter the Vite module graph or be transformed. This plugin wires
 * a `connect` middleware that serves `legacy/` as a static directory rooted at
 * `/legacy`, with the correct content types, and only during `vite dev`
 * (not `vite build`).
 */
import type { Plugin } from 'vite'
import { resolve, extname } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import { readFileSync } from 'node:fs'

const LEGACY_ROOT = resolve(process.cwd(), 'legacy')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
}

/**
 * Serve the `legacy/` directory at `/legacy` during `vite dev`. The legacy
 * app's own relative paths (`animations.js`, `images/`, `pages/`) resolve
 * against `/legacy/` so it runs unchanged.
 */
export function serveLegacy(): Plugin {
  return {
    name: 'void-motion:serve-legacy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        // Only handle paths under /legacy.
        if (!url.startsWith('/legacy') && url !== '/legacy') {
          next()
          return
        }
        // Strip the /legacy prefix and any query string.
        const relRaw = url.replace(/^\/legacy/, '').split('?')[0]
        let rel = relRaw ?? ''
        if (rel === '' || rel === '/') rel = '/index.html'
        // Decode percent-encoded path segments (e.g. "Coordinate Mapper Tool").
        rel = decodeURIComponent(rel)
        const filePath = resolve(LEGACY_ROOT, '.' + rel)
        // Guard against path traversal outside legacy/.
        if (!filePath.startsWith(LEGACY_ROOT)) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }
        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          // Fall through to Vite for a 404 / SPA fallback.
          next()
          return
        }
        const ext = extname(filePath)
        const mime = MIME[ext] ?? 'application/octet-stream'
        try {
          const body = readFileSync(filePath)
          res.setHeader('Content-Type', mime)
          res.statusCode = 200
          res.end(body)
        } catch {
          next()
        }
      })
    },
  }
}
