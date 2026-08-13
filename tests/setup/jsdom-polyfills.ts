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

// Mock the legacy engine context factory for UI tests (M17)
if (typeof (globalThis as any).createLegacyAnimationEngine === 'undefined') {
  ;(globalThis as any).createLegacyAnimationEngine = () => ({
    // Mock the engine exports returned by the factory
  })
}
