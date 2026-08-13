import i18n, { i18nReady } from '@/i18n'

await i18nReady
await i18n.loadNamespaces(['info', 'tutorial'])

/**
 * Vitest setup — jsdom DOM polyfills for Radix primitives (M02).
 *
 * jsdom does not implement `ResizeObserver` or `IntersectionObserver`, but
 * Radix scroll-area / slider / select primitives use them at mount. Provide
 * no-op implementations so component smoke tests render without throwing.
 * These polyfills affect tests only; the real app uses the browser built-ins.
 */

class ResizeObserverStub {
  observe(): void {
    // no-op
  }
  unobserve(): void {
    // no-op
  }
  disconnect(): void {
    // no-op
  }
}

class IntersectionObserverStub {
  observe(): void {
    // no-op
  }
  unobserve(): void {
    // no-op
  }
  disconnect(): void {
    // no-op
  }
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  root = null
  rootMargin = '0px'
  thresholds = []
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver
}

// Radix portals render into a portal root. jsdom provides document.body.
// Some primitives call `scrollIntoView` on mount — jsdom has no layout.
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {
    // no-op
  }
}

// jsdom ships a canvas `getContext` placeholder that reports a not-implemented
// error to stderr. UI tests only need a deterministic no-op 2D surface.
if (typeof HTMLCanvasElement !== 'undefined') {
  const gradient = { addColorStop: () => undefined }
  const context = new Proxy(
    {
      canvas: document.createElement('canvas'),
      measureText: (value: string) => ({ width: value.length * 8 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      createPattern: () => null,
      getImageData: (_x: number, _y: number, width: number, height: number) => ({
        data: new Uint8ClampedArray(Math.max(0, width * height * 4)),
        width,
        height,
      }),
    } as Record<string, unknown>,
    {
      get(target, property) {
        if (property in target) return target[property as string]
        return () => undefined
      },
      set(target, property, value) {
        target[property as string] = value
        return true
      },
    },
  )
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => context,
  })
}

// Mock the legacy engine context factory for UI tests (M17)
if (typeof (globalThis as any).createLegacyAnimationEngine === 'undefined') {
  ;(globalThis as any).createLegacyAnimationEngine = () => ({
    // Mock the engine exports returned by the factory
  })
}
