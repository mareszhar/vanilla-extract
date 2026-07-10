import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

function captureBrowserErrors(page: Page): string[] {
  const failures: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error')
      failures.push(`console: ${message.text()}`)
  })
  page.on('pageerror', error => failures.push(`page: ${error.message}`))
  page.on('requestfailed', (request) => {
    failures.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`)
  })

  return failures
}

test('Nuxt interaction lab paints with CSS and every control responds', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)
  const stylesheetResponses: Array<{ url: string, status: number }> = []

  page.on('response', (response) => {
    if (response.request().resourceType() === 'stylesheet')
      stylesheetResponses.push({ url: response.url(), status: response.status() })
  })

  await page.goto('http://127.0.0.1:3100', { waitUntil: 'networkidle' })

  expect(stylesheetResponses.length).toBeGreaterThan(0)
  expect(stylesheetResponses.filter(response => response.status >= 400)).toEqual([])
  expect(stylesheetResponses.some(response => response.url.includes('.vane.css'))).toBe(false)
  await expect(page.locator('main')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

  const refract = page.getByRole('button', { name: 'Refract', exact: true })
  await refract.click()
  await expect(page.getByRole('button', { name: 'Refracted 1×', exact: true })).toBeVisible()
  await expect(page.getByText('Click event received')).toBeVisible()

  await page.getByLabel('Pill radius').check()
  await expect(page.getByText('brand · md · pill')).toBeVisible()

  await page.getByLabel(/Progress/).fill('84')
  await expect(page.getByText('84 / 100')).toBeVisible()

  await page.getByRole('button', { name: 'Open dialog' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /Close/ }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.getByRole('button', { name: /Scheme:/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark')
  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})

test('comparison lanes stay functional, visible, and live-themed', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })

  const lanes = page.locator('[data-lane]')
  await expect(lanes).toHaveCount(5)

  const laneIds = ['sfc', 'tailwind', 'panda', 'extract', 'vane'] as const
  await expect(page.getByRole('button', { name: 'Refract', exact: true })).toHaveCount(5)
  for (const lane of laneIds)
    await page.locator(`[data-lane="${lane}"]`).getByRole('button', { name: 'Refract', exact: true }).click()
  await expect(page.getByText(/5 total/)).toBeVisible()

  for (const lane of laneIds) {
    const progress = page.locator(`[data-lane="${lane}"] [role="progressbar"]`)
    await expect(progress).toBeVisible()
    const box = await progress.boundingBox()
    expect(box?.height, `${lane} progress must have a real height`).toBeGreaterThan(0)
  }

  const vaneButton = page.locator('[data-lane="vane"] button').first()
  const before = await vaneButton.evaluate(element => getComputedStyle(element).backgroundColor)
  await page.getByLabel('Live vane-dux brand color').fill('#d13c63')
  await expect.poll(() => vaneButton.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(before)

  await vaneButton.hover()
  const hover = await vaneButton.evaluate(element => getComputedStyle(element).backgroundColor)
  expect(hover).not.toBe(before)
  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})
