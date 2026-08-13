import { access, readFile, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'
import console from 'node:console'

const requiredFiles = [
  'dist/index.html',
  'dist/favicon.svg',
  'dist/og-image.png',
  'dist/robots.txt',
  'dist/sitemap.xml',
  'dist/site.webmanifest',
  'dist/legacy/index.html',
  'dist/legacy/animations.js',
  'dist/legacy/images/hand1-720p.png',
]

const missing = []
for (const file of requiredFiles) {
  try {
    await access(resolve(file), constants.R_OK)
  } catch {
    missing.push(file)
  }
}

if (missing.length > 0) {
  throw new Error(
    `Production artifact is incomplete:\n${missing.map((file) => `- ${file}`).join('\n')}`,
  )
}

const index = await readFile(resolve('dist/index.html'), 'utf8')
for (const marker of ['Void Motion', 'Void Station', 'og:image', 'application/ld+json']) {
  if (!index.includes(marker)) throw new Error(`dist/index.html is missing SEO marker: ${marker}`)
}

const legacyStats = await stat(resolve('dist/legacy'))
if (!legacyStats.isDirectory()) throw new Error('dist/legacy must be a directory')

console.log(`Production artifact verified: ${requiredFiles.length} required files present`)
