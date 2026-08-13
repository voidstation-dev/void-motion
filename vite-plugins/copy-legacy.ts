import type { Plugin } from 'vite'
import { cp, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

/** Copy the isolated animation runtime into the final Vite artifact. */
export function copyLegacyRuntime(): Plugin {
  return {
    name: 'void-motion:copy-legacy-runtime',
    apply: 'build',
    async closeBundle() {
      const source = resolve(process.cwd(), 'legacy')
      const target = resolve(process.cwd(), 'dist/legacy')
      await rm(target, { force: true, recursive: true })
      await mkdir(target, { recursive: true })
      await cp(source, target, { recursive: true })
    },
  }
}
