import { expect, test } from '@playwright/test'

test('editor boots with the production runtime and branded metadata', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')

  await expect(page).toHaveTitle(/Void Motion/)
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByLabel(/canvas surface|khung vẽ/i)).toBeVisible()
  await expect(page.locator('meta[name="creator"]')).toHaveAttribute('content', 'Void Station')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://void-motion-phong-vus-projects-82e2aa07.vercel.app/',
  )

  const runtime = page.locator('iframe[src^="/legacy/index.html"]')
  await expect(runtime).toHaveCount(1)
  await expect
    .poll(() => page.frames().some((frame) => frame.url().includes('/legacy/index.html')))
    .toBe(true)
  expect(errors).toEqual([])
})

test('public navigation and SEO endpoints resolve', async ({ page, request }) => {
  await page.goto('/')

  await expect(
    page.locator('a[href="https://github.com/voidstation-dev/void-motion"]'),
  ).toHaveCount(1)
  await expect(
    page.locator('a[href="https://github.com/voidstation-dev/void-motion/issues"]'),
  ).toHaveCount(1)

  for (const route of ['/tutorial', '/about', '/privacy']) {
    const response = await page.goto(route)
    expect(response?.ok()).toBe(true)
    await expect(page).toHaveTitle(/Void Motion/)
  }

  for (const asset of ['/robots.txt', '/sitemap.xml', '/og-image.png', '/legacy/index.html']) {
    const response = await request.get(asset)
    expect(response.ok(), `${asset} should resolve`).toBe(true)
  }
})

test('compact layout exposes both editor docks', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-only layout assertion')
  await page.goto('/')

  await page.getByRole('button', { name: /open animation settings|mở thiết lập/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /open layers panel|mở bảng lớp/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
