import type { Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:3200'
const tokensFile = fileURLToPath(new URL('../../sandbox/demo-main/app/design/foundations.tokens.ts', import.meta.url))
const appStyleFile = fileURLToPath(new URL('../../sandbox/demo-main/app/app.style.ts', import.meta.url))
const runtimeFixtureStyleFile = fileURLToPath(new URL('../../sandbox/demo-main/app/components/RuntimeFixture.style.ts', import.meta.url))

declare global {
  interface Window {
    __vanityFirstPaint?: {
      background: string
      display: string
    }
  }
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

async function loadCount(page: Page): Promise<number> {
  try {
    return await page.evaluate(() => Number(sessionStorage.getItem('vanity-dev-loads')))
  }
  catch {
    // An export-shape edit intentionally replaces the document. Poll through
    // the brief interval in which Playwright's old execution context is gone.
    return -1
  }
}

test('Nuxt dev keeps first paint styled and HMR deterministic', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page)
  const stylesheetResponses: Array<{ url: string, status: number }> = []
  const originalTokens = await readFile(tokensFile, 'utf8')
  const originalAppStyle = await readFile(appStyleFile, 'utf8')
  const originalRuntimeFixtureStyle = await readFile(runtimeFixtureStyleFile, 'utf8')

  page.on('response', (response) => {
    if (response.request().resourceType() === 'stylesheet')
      stylesheetResponses.push({ url: response.url(), status: response.status() })
  })

  await page.addInitScript(() => {
    const loads = Number(sessionStorage.getItem('vanity-dev-loads') ?? 0) + 1
    sessionStorage.setItem('vanity-dev-loads', String(loads))

    const inspectFirstFrame = () => {
      const main = document.querySelector('main')

      if (main === null) {
        requestAnimationFrame(inspectFirstFrame)
        return
      }

      const style = getComputedStyle(main)
      window.__vanityFirstPaint = {
        background: style.backgroundColor,
        display: style.display,
      }
    }

    requestAnimationFrame(inspectFirstFrame)
  })

  try {
    for (let reload = 0; reload < 4; reload++) {
      if (reload === 0)
        await page.goto(origin, { waitUntil: 'networkidle' })
      else
        await page.reload({ waitUntil: 'networkidle' })

      await expect.poll(() => page.evaluate(() => window.__vanityFirstPaint)).toMatchObject({
        display: 'block',
      })
      const firstPaint = await page.evaluate(() => window.__vanityFirstPaint)
      expect(firstPaint?.background).not.toBe('rgba(0, 0, 0, 0)')
    }

    expect(stylesheetResponses.some(response => response.url.includes('.vanity.css'))).toBe(true)
    expect(stylesheetResponses.filter(response => response.status >= 400)).toEqual([])

    const loadsBeforeHmr = await loadCount(page)
    const root = page.locator('#prism-studio')
    const hue = page.getByRole('slider', { name: 'Palette hue' })
    const metric = page.locator('article').filter({ hasText: '12,480' })
    expect(await root.evaluate(element => element.style.getPropertyValue('--prism-color-brand'))).toBe('')
    await expect(hue).toHaveValue('285')
    await expect(metric).toHaveCSS('border-radius', '14px')

    expect(originalTokens).toContain('val: de.length.px(14)')
    await writeFile(tokensFile, originalTokens.replace('val: de.length.px(14)', 'val: de.length.px(18)'))

    await expect(metric).toHaveCSS('border-radius', '18px')
    expect(await loadCount(page)).toBe(loadsBeforeHmr)

    const runtimePrimary = page.locator('#runtime-fixture-primary')
    const runtimeSibling = page.locator('#runtime-fixture-sibling')
    const siblingBefore = await runtimeSibling.evaluate(element => getComputedStyle(element).backgroundColor)
    await page.evaluate(() => {
      const runtime = (window as any).__runtimeFixture
      runtime.unsetDark()
      runtime.setBase('oklch(63% 0.19 25)')
    })
    const runtimeOverride = await runtimePrimary.evaluate(element => getComputedStyle(element).backgroundColor)
    expect(runtimeOverride).not.toBe(siblingBefore)
    expect(originalRuntimeFixtureStyle).toContain('val: de.oklch(0.56, 0.19, 355)')
    await writeFile(
      runtimeFixtureStyleFile,
      originalRuntimeFixtureStyle.replace('val: de.oklch(0.56, 0.19, 355)', 'val: de.oklch(0.57, 0.19, 355)'),
    )
    await expect.poll(() => runtimeSibling.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(siblingBefore)
    expect(await runtimePrimary.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(runtimeOverride)
    expect(await loadCount(page)).toBe(loadsBeforeHmr)

    const shapeProbe = '\nexport const __vanityHmrShapeProbe = ds.css({ opacity: 1 })\n'
    await writeFile(appStyleFile, `${originalAppStyle}${shapeProbe}`)

    await expect.poll(() => loadCount(page)).toBe(loadsBeforeHmr + 1)
    await page.waitForTimeout(750)
    expect(await loadCount(page)).toBe(loadsBeforeHmr + 1)
    expect(browserErrors, browserErrors.join('\n')).toEqual([])
  }
  finally {
    await Promise.all([
      writeFile(tokensFile, originalTokens),
      writeFile(appStyleFile, originalAppStyle),
      writeFile(runtimeFixtureStyleFile, originalRuntimeFixtureStyle),
    ])
  }
})
