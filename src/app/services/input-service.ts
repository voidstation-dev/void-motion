import { callLegacyRuntime } from '@/engine/legacy/legacy-runtime-bridge'

const ACCEPTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'image/webp',
])

export const inputService = {
  addImages(files: FileList | readonly File[]): number {
    let accepted = 0
    for (const file of Array.from(files)) {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) continue
      callLegacyRuntime('loadImageFile', file)
      accepted++
    }
    return accepted
  },
}
