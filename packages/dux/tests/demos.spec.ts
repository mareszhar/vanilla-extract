import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __vaneFirstPaint?: {
      background: string
      display: string
    }
    __phase5StyleWrites?: number
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

test('Prism studio paints with CSS and projects every system decision', async ({ page }) => {
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

  const root = page.locator('#prism-studio')
  const hue = page.getByRole('slider', { name: 'Palette hue' })
  const radius = page.getByRole('slider', { name: 'Radius seed' })
  const metric = page.locator('article').filter({ hasText: '12,480' })
  const brandBefore = await root.evaluate(element => getComputedStyle(element).getPropertyValue('--prism-color-brand'))
  const radiusBefore = await metric.evaluate(element => getComputedStyle(element).borderRadius)

  await expect(hue).toHaveValue('285')
  await hue.fill('180')
  await expect.poll(() => root.evaluate(element => getComputedStyle(element).getPropertyValue('--prism-color-brand'))).not.toBe(brandBefore)
  expect(await root.evaluate(element => element.getAttribute('style'))).toMatch(/--prism-v-[\w-]+: oklch\(62% 0\.205 180\)/)

  await expect(radius).toHaveValue('14')
  await radius.fill('4')
  await expect.poll(() => metric.evaluate(element => getComputedStyle(element).borderRadius)).not.toBe(radiusBefore)

  await page.getByRole('button', { name: 'dark', exact: true }).click()
  await expect(root).toHaveAttribute('data-scheme', 'dark')

  await page.getByLabel('Density').selectOption('compact')
  await expect(root).toHaveAttribute('data-density', 'compact')
  expect(await root.evaluate(element => getComputedStyle(element).getPropertyValue('--prism-space-md').trim())).toBe('.75rem')

  await page.getByLabel('Elevation').selectOption('overlay')
  await expect(root).toHaveAttribute('data-elevation', 'overlay')
  await page.getByLabel('Typeface').selectOption('mono')
  await expect(root).toHaveCSS('font-family', /SFMono-Regular/)
  await page.getByRole('button', { name: 'springy', exact: true }).click()
  await expect(root).toHaveAttribute('data-motion', 'springy')

  await page.getByRole('button', { name: 'New report' }).click()
  await expect(page.getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '79')

  const openDialog = page.getByRole('button', { name: 'Inspect system' })
  await openDialog.click()
  const dialog = page.getByRole('dialog', { name: 'One coherent system' })
  await expect(dialog).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(openDialog).toBeFocused()

  const axesTab = page.getByRole('tab', { name: 'Axes' })
  await axesTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Cases' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('explicit dark/compact intersection')

  const persisted = await page.reload({ waitUntil: 'networkidle' })
  const persistedHtml = await persisted!.text()
  expect(persistedHtml).toContain('data-scheme="dark"')
  expect(persistedHtml).toContain('data-density="compact"')
  expect(persistedHtml).toMatch(/--prism-v-[\w-]+:oklch\(62% 0\.205 180\)/)
  await expect(hue).toHaveValue('180')
  await expect(root).toHaveAttribute('data-elevation', 'overlay')

  await page.getByRole('button', { name: 'Reset authored defaults' }).click()
  await expect(hue).toHaveValue('285')
  await expect(root).not.toHaveAttribute('data-scheme')
  await expect(root).not.toHaveAttribute('data-density')
  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})

test('Prism studio remains operable at phone, widget-container, and desktop widths', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 820, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('http://127.0.0.1:3100', { waitUntil: 'networkidle' })

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('nav[aria-label="Sparrow"]'))
      .toHaveCSS('display', viewport.width < 700 ? 'none' : 'grid')
    await expect(page.getByRole('progressbar')).toHaveCount(2)
    for (const progress of await page.getByRole('progressbar').all())
      await expect(progress).toHaveAttribute('aria-valuenow', '72')

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

  const inspect = page.getByRole('button', { name: 'Inspect system' })
  await inspect.focus()
  expect(await inspect.evaluate(element => element.matches(':focus-visible'))).toBe(true)
  await expect(inspect).toHaveCSS('outline-style', 'solid')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload({ waitUntil: 'networkidle' })
  const chartBar = page.getByRole('img', { name: 'Engagement increased over twelve weeks' }).locator('span').first()
  await expect(chartBar).toHaveCSS('animation-name', 'none')

  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})

test('Phase 4 axes preserve root locality, case order, registration, and element-local scheme', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)
  await page.goto('http://127.0.0.1:3100', { waitUntil: 'networkidle' })

  const group = page.locator('[data-phase4-group]')
  const light = page.locator('#phase4-light')
  const dark = page.locator('#phase4-dark')

  await expect(light).toHaveCSS('padding-top', '16px')
  await expect(light).toHaveCSS('border-top-width', '1px')
  expect(await light.evaluate(element => getComputedStyle(element).color))
    .not
    .toBe(await dark.evaluate(element => getComputedStyle(element).color))

  await group.evaluate((element) => {
    element.setAttribute('data-density', 'compact')
    element.setAttribute('data-emphasis', 'high')
  })
  await expect(light).toHaveCSS('padding-top', '8px')
  await expect(light).toHaveCSS('border-top-width', '5px')

  expect(await page.evaluate(() => {
    const registered = [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules]
        }
        catch {
          return []
        }
      })
      .some(rule => rule.cssText.includes('@property --phase4-probe-inset'))
    return registered
  })).toBe(true)
  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})

test('Phase 5 runtime preserves SSR paint, semantic resets, widget isolation, and shadow hosts', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)
  await page.addInitScript(() => {
    window.__phase5StyleWrites = 0
    const original = CSSStyleDeclaration.prototype.setProperty
    CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
      if (name.startsWith('--phase5-v-'))
        window.__phase5StyleWrites = (window.__phase5StyleWrites ?? 0) + 1
      return original.call(this, name, value, priority)
    }
  })
  const response = await page.goto('http://127.0.0.1:3100', { waitUntil: 'networkidle' })
  const html = await response!.text()
  expect(html).toContain('data-scheme="dark"')
  expect(html).toMatch(/--phase5-v-[\w-]+:rgb\(110 70 210\)/)

  const primary = page.locator('#phase5-primary')
  const sibling = page.locator('#phase5-sibling')
  await expect(primary).toHaveCSS('background-color', 'rgb(40, 190, 170)')
  await expect(sibling).toHaveCSS('background-color', 'rgb(180, 50, 100)')
  await expect(page.locator('#phase5-document')).toHaveCSS('background-color', 'rgb(70, 80, 90)')
  expect(await page.locator('#phase5-svg').evaluate(element => getComputedStyle(element).fill)).toBe('rgb(240, 90, 20)')
  expect(await page.evaluate(() => window.__phase5StyleWrites)).toBe(0)

  await page.evaluate(() => window.__phase5!.setDark('rgb(20 120 240)'))
  await expect(primary).toHaveCSS('background-color', 'rgb(20, 120, 240)')
  await expect(sibling).toHaveCSS('background-color', 'rgb(180, 50, 100)')

  await page.evaluate(() => window.__phase5!.unsetDark())
  await expect(primary).toHaveCSS('background-color', 'rgb(110, 70, 210)')
  await page.evaluate(() => window.__phase5!.unsetBase())
  await expect(primary).toHaveCSS('background-color', 'rgb(180, 50, 100)')

  await page.evaluate(() => window.__phase5!.setDensity('compact'))
  await expect(primary).toHaveCSS('padding-top', '8px')
  const compactShadow = await primary.evaluate(element => getComputedStyle(element).boxShadow)
  await page.evaluate(() => window.__phase5!.setCase('none'))
  await expect(primary).toHaveCSS('box-shadow', 'none')
  await page.evaluate(() => window.__phase5!.unsetCase())
  expect(await primary.evaluate(element => getComputedStyle(element).boxShadow)).toBe(compactShadow)

  await page.evaluate(() => window.__phase5!.setShadowBase('rgb(0 210 240)'))
  expect(await page.locator('[data-phase5-root]').nth(2).evaluate((host) => {
    const probe = host.shadowRoot!.querySelector('#probe')!
    return getComputedStyle(probe).backgroundColor
  })).toBe('rgb(0, 210, 240)')
  await expect(sibling).toHaveCSS('background-color', 'rgb(180, 50, 100)')

  const snapshot = await page.evaluate(() => window.__phase5!.snapshot()) as any
  expect(JSON.stringify(snapshot)).not.toContain('--phase5-v-')
  expect(snapshot.overrides.every((entry: any) => Array.isArray(entry.token) && typeof entry.address.kind === 'string')).toBe(true)
  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})

test('comparison lanes stay functional, visible, and live-themed', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })

  const lanes = page.locator('[data-lane]')
  await expect(lanes).toHaveCount(5)

  const laneIds = ['sfc', 'tailwind', 'panda', 'extract', 'vane'] as const
  await expect(page.getByRole('button', { name: 'Dispatch', exact: true })).toHaveCount(5)
  for (const lane of laneIds)
    await page.locator(`[data-lane="${lane}"]`).getByRole('button', { name: 'Dispatch', exact: true }).click()
  await expect(page.getByText(/5 total/)).toBeVisible()

  for (const lane of laneIds) {
    const progress = page.locator(`[data-lane="${lane}"] [role="progressbar"]`)
    await expect(progress).toBeVisible()
    const box = await progress.boundingBox()
    expect(box?.height, `${lane} progress must have a real height`).toBeGreaterThan(0)
  }

  const scheme = page.getByLabel('Scheme')
  await scheme.selectOption('light')
  const lightCards = await Promise.all(laneIds.map(lane => page
    .locator(`[data-lane="${lane}"] .card-block article`)
    .evaluate(element => getComputedStyle(element).backgroundColor)))
  await scheme.selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark')
  const darkCards = await Promise.all(laneIds.map(lane => page
    .locator(`[data-lane="${lane}"] .card-block article`)
    .evaluate(element => getComputedStyle(element).backgroundColor)))
  for (const [index, lane] of laneIds.entries()) {
    expect(
      darkCards[index],
      `${lane} must preserve its scheme pair through the production optimizer`,
    ).not.toBe(lightCards[index])
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
