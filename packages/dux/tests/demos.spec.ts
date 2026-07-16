import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __vanityFirstPaint?: {
      background: string
      display: string
    }
    __runtimeFixtureStyleWrites?: number
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
      window.__vanityFirstPaint = { background: style.backgroundColor, display: style.display }
    }

    requestAnimationFrame(inspect)
  })
}

function captureBrowserErrors(page: Page): string[] {
  const failures: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      failures.push(`console ${message.type()}: ${message.text()}`)
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
  expect(stylesheetResponses.some(response => response.url.includes('.vanity.css'))).toBe(false)
  expect(await page.evaluate(() => window.__vanityFirstPaint)).toMatchObject({ display: 'block' })
  expect((await page.evaluate(() => window.__vanityFirstPaint))?.background).not.toBe('rgba(0, 0, 0, 0)')
  await expect(page.locator('main')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

  const root = page.locator('#prism-studio')
  const hue = page.getByRole('slider', { name: 'Palette hue' })
  const radius = page.getByRole('slider', { name: 'Radius seed' })
  const metric = page.locator('article').filter({ hasText: '12,480' })
  const application = page.getByRole('region', { name: 'Responsive Sparrow application preview' })
  const brandAction = page.getByRole('button', { name: 'New report' })
  const brandBefore = await root.evaluate(element => getComputedStyle(element).getPropertyValue('--prism-color-brand'))
  const radiusBefore = await metric.evaluate(element => getComputedStyle(element).borderRadius)

  await expect(hue).toHaveCount(1)
  expect(await hue.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('linear-gradient')

  await page.evaluate(() => {
    Math.random = () => 0
  })
  await page.getByRole('button', { name: 'Randomize system' }).click()
  await expect(hue).toHaveValue('0')
  await expect(radius).toHaveValue('2')
  await expect(root).toHaveAttribute('data-density', 'compact')
  await expect(root).toHaveAttribute('data-elevation', 'flat')
  await expect(root).toHaveAttribute('data-motion', 'none')
  await expect(page.getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '38')
  await page.getByRole('button', { name: 'Reset authored defaults' }).click()

  await expect(hue).toHaveValue('285')
  await hue.fill('180')
  await expect.poll(() => root.evaluate(element => getComputedStyle(element).getPropertyValue('--prism-color-brand'))).not.toBe(brandBefore)
  expect(await root.evaluate(element => element.getAttribute('style'))).toMatch(/--prism-v-[\w-]+: oklch\(62% 0\.205 180\)/)
  const chartBackground = await page
    .getByRole('img', { name: 'Engagement increased over twelve weeks' })
    .locator('span')
    .first()
    .evaluate(element => getComputedStyle(element).backgroundImage)
  expect(chartBackground).toContain('180')
  expect(await brandAction.evaluate((element) => {
    const style = getComputedStyle(element)
    return style.color !== style.backgroundColor && style.color !== 'rgba(0, 0, 0, 0)'
  })).toBe(true)

  await expect(radius).toHaveValue('14')
  await radius.fill('4')
  await expect.poll(() => metric.evaluate(element => getComputedStyle(element).borderRadius)).not.toBe(radiusBefore)

  await page.getByRole('button', { name: 'dark', exact: true }).click()
  await expect(root).toHaveAttribute('data-scheme', 'dark')
  await expect(root).toHaveCSS('color-scheme', 'dark')
  const darkCanvas = await application.evaluate(element => getComputedStyle(element).backgroundColor)
  await page.getByRole('button', { name: 'light', exact: true }).click()
  await expect(root).toHaveAttribute('data-scheme', 'light')
  await expect(root).toHaveCSS('color-scheme', 'light')
  await expect.poll(() => application.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(darkCanvas)
  await page.getByRole('button', { name: 'dark', exact: true }).click()

  const layoutBeforeDensity = await application.evaluate(element => getComputedStyle(element).gridTemplateColumns)
  await page.getByLabel('Density').selectOption('compact')
  await expect(root).toHaveAttribute('data-density', 'compact')
  expect(await root.evaluate(element => getComputedStyle(element).getPropertyValue('--prism-space-md').trim())).toBe('.75rem')
  await expect.poll(() => application.evaluate(element => getComputedStyle(element).gridTemplateColumns)).not.toBe(layoutBeforeDensity)

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
  await expect(dialog).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(dialog).not.toHaveCSS('padding-left', '0px')
  const backdrop = dialog.locator('..').locator('xpath=preceding-sibling::div[1]')
  await expect(backdrop).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
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
  await expect(page.getByText(/Devon|Priya|Aisha|Tomas/)).toHaveCount(0)
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

test('axis fixture preserves root locality, case order, registration, and element-local scheme', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)
  await page.goto('http://127.0.0.1:3100', { waitUntil: 'networkidle' })
  expect(browserErrors, browserErrors.join('\n')).toEqual([])

  const group = page.locator('[data-axis-fixture-group]')
  const light = page.locator('#axis-fixture-light')
  const dark = page.locator('#axis-fixture-dark')

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
      .some(rule => rule.cssText.includes('@property --axis-fixture-probe-inset'))
    return registered
  })).toBe(true)
  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})

test('runtime fixture preserves SSR paint, semantic resets, widget isolation, and shadow hosts', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)
  await page.addInitScript(() => {
    window.__runtimeFixtureStyleWrites = 0
    const original = CSSStyleDeclaration.prototype.setProperty
    CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
      if (name.startsWith('--runtime-fixture-v-'))
        window.__runtimeFixtureStyleWrites = (window.__runtimeFixtureStyleWrites ?? 0) + 1
      return original.call(this, name, value, priority)
    }
  })
  const response = await page.goto('http://127.0.0.1:3100', { waitUntil: 'networkidle' })
  const html = await response!.text()
  expect(html).toContain('data-scheme="dark"')
  expect(html).toMatch(/--runtime-fixture-v-[\w-]+:oklch\(55% 0\.19 295\)/)

  const primary = page.locator('#runtime-fixture-primary')
  const sibling = page.locator('#runtime-fixture-sibling')
  const initialDark = await primary.evaluate(element => getComputedStyle(element).backgroundColor)
  const authoredBase = await sibling.evaluate(element => getComputedStyle(element).backgroundColor)
  expect(initialDark).not.toBe(authoredBase)
  expect(await page.locator('#runtime-fixture-document').evaluate(element => getComputedStyle(element).backgroundColor))
    .not
    .toBe('rgba(0, 0, 0, 0)')
  expect(await page.locator('#runtime-fixture-svg').evaluate(element => getComputedStyle(element).fill)).not.toBe('none')
  expect(await page.evaluate(() => window.__runtimeFixtureStyleWrites)).toBe(0)

  await page.evaluate(() => window.__runtimeFixture!.setDark('oklch(62% 0.2 240)'))
  await expect.poll(() => primary.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(initialDark)
  expect(await sibling.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(authoredBase)

  await page.evaluate(() => window.__runtimeFixture!.unsetDark())
  const baseOverride = await primary.evaluate(element => getComputedStyle(element).backgroundColor)
  expect(baseOverride).not.toBe(initialDark)
  expect(baseOverride).not.toBe(authoredBase)
  await page.evaluate(() => window.__runtimeFixture!.unsetBase())
  await expect.poll(() => primary.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(authoredBase)

  await page.evaluate(() => window.__runtimeFixture!.setDensity('compact'))
  await expect(primary).toHaveCSS('padding-top', '8px')
  const compactShadow = await primary.evaluate(element => getComputedStyle(element).boxShadow)
  await page.evaluate(() => window.__runtimeFixture!.setCase('none'))
  await expect(primary).toHaveCSS('box-shadow', 'none')
  await page.evaluate(() => window.__runtimeFixture!.unsetCase())
  expect(await primary.evaluate(element => getComputedStyle(element).boxShadow)).toBe(compactShadow)

  const shadowHost = page.locator('[data-runtime-fixture-root]').nth(2)
  const shadowBefore = await shadowHost.evaluate((host) => {
    const probe = host.shadowRoot!.querySelector('#probe')!
    return getComputedStyle(probe).backgroundColor
  })
  await page.evaluate(() => window.__runtimeFixture!.setShadowBase('oklch(72% 0.16 200)'))
  expect(await shadowHost.evaluate((host) => {
    const probe = host.shadowRoot!.querySelector('#probe')!
    return getComputedStyle(probe).backgroundColor
  })).not.toBe(shadowBefore)
  expect(await sibling.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(authoredBase)

  const snapshot = await page.evaluate(() => window.__runtimeFixture!.snapshot()) as any
  expect(JSON.stringify(snapshot)).not.toContain('--runtime-fixture-v-')
  expect(snapshot.overrides.every((entry: any) => Array.isArray(entry.token) && typeof entry.address.kind === 'string')).toBe(true)
  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})

test('comparison lanes stay functional, visible, and live-themed', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })

  const lanes = page.locator('[data-lane]')
  await expect(lanes).toHaveCount(5)

  const laneIds = ['sfc', 'tailwind', 'panda', 'extract', 'vanity'] as const
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

  const vanityButton = page.locator('[data-lane="vanity"] button').first()
  const before = await vanityButton.evaluate(element => getComputedStyle(element).backgroundColor)
  await page.getByLabel('Live vanity brand hue').fill('345')
  await expect.poll(() => vanityButton.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(before)

  await vanityButton.hover()
  const hover = await vanityButton.evaluate(element => getComputedStyle(element).backgroundColor)
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
