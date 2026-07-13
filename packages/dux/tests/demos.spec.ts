import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __vaneFirstPaint?: {
      background: string
      display: string
    }
  }
}

async function captureFirstPaint(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const inspect = () => {
      const main = document.querySelector('main')

      if (main === null) {
        requestAnimationFrame(inspect)
        return
      }

      const style = getComputedStyle(main)
      window.__vaneFirstPaint = { background: style.backgroundColor, display: style.display }
    }

    requestAnimationFrame(inspect)
  })
}

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
  await captureFirstPaint(page)

  page.on('response', (response) => {
    if (response.request().resourceType() === 'stylesheet')
      stylesheetResponses.push({ url: response.url(), status: response.status() })
  })

  await page.goto('http://127.0.0.1:3100', { waitUntil: 'networkidle' })

  expect(stylesheetResponses.length).toBeGreaterThan(0)
  expect(stylesheetResponses.filter(response => response.status >= 400)).toEqual([])
  expect(stylesheetResponses.some(response => response.url.includes('.vane.css'))).toBe(false)
  expect(await page.evaluate(() => window.__vaneFirstPaint)).toMatchObject({ display: 'block' })
  expect((await page.evaluate(() => window.__vaneFirstPaint))?.background).not.toBe('rgba(0, 0, 0, 0)')
  await expect(page.locator('main')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

  const refract = page.getByRole('button', { name: 'Refract', exact: true })
  const brandInput = page.getByLabel('Pick the brand color')
  const brandBefore = await refract.evaluate(element => getComputedStyle(element).backgroundColor)
  expect(await page.locator('html').evaluate(element => element.style.getPropertyValue('--prism-color-brand'))).toBe('')
  await expect(brandInput).toHaveValue('#735fe9')
  expect(await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Pick the brand color"]')!
    const authored = getComputedStyle(document.documentElement).getPropertyValue('--prism-color-brand')
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const pixel = (color: string) => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      return [...context.getImageData(0, 0, 1, 1).data]
    }

    return pixel(input.value).join(',') === pixel(authored).join(',')
  })).toBe(true)
  await brandInput.fill('#d13c63')
  await expect.poll(() => refract.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(brandBefore)
  expect(await page.locator('html').evaluate(element => element.style.getPropertyValue('--prism-color-brand'))).toBe('#d13c63')

  await refract.click()
  await expect(page.getByRole('button', { name: 'Refracted 1×', exact: true })).toBeVisible()
  await expect(page.getByText('Click event received')).toBeVisible()

  await page.getByLabel('Pill radius').check()
  await expect(page.getByText('brand · md · pill')).toBeVisible()

  await page.getByLabel(/Progress/).fill('84')
  await expect(page.getByText('84 / 100')).toBeVisible()

  const openDialog = page.getByRole('button', { name: 'Open dialog' })
  await openDialog.click()
  const dialog = page.getByRole('dialog', { name: 'An anatomy at work' })
  await expect(dialog).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(openDialog).toBeFocused()

  const tokensTab = page.getByRole('tab', { name: 'Tokens' })
  await tokensTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Recipes' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('precompiled classes')

  await page.getByRole('button', { name: /Scheme:/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark')
  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})

test('Nuxt lab remains operable and semantically connected at phone and desktop widths', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)

  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto('http://127.0.0.1:3100', { waitUntil: 'networkidle' })

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62')

    const semanticFailures = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id)
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
      const unnamedButtons = [...document.querySelectorAll('button')]
        .filter(button => !button.textContent?.trim() && !button.getAttribute('aria-label'))
        .length
      const unlabelledInputs = [...document.querySelectorAll('input, select')]
        .filter((control) => {
          const input = control as HTMLInputElement
          return input.labels?.length === 0 && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')
        })
        .length
      return { duplicateIds, unnamedButtons, unlabelledInputs }
    })

    expect(semanticFailures).toEqual({ duplicateIds: [], unnamedButtons: 0, unlabelledInputs: 0 })
  }

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

test('comparison lab has no horizontal clipping at phone or desktop widths', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)

  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.locator('[data-lane]')).toHaveCount(5)
  }

  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})
