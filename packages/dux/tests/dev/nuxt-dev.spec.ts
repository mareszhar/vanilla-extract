import type { Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const origin = 'http://127.0.0.1:3200'
const tokensFile = fileURLToPath(new URL('../../sandbox/demo-main/app/design/foundations.tokens.ts', import.meta.url))
const appStyleFile = fileURLToPath(new URL('../../sandbox/demo-main/app/app.style.ts', import.meta.url))

declare global {
  interface Window {
    __vaneFirstPaint?: {
      background: string
      display: string
    }
  }
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

async function loadCount(page: Page): Promise<number> {
  try {
    return await page.evaluate(() => Number(sessionStorage.getItem('vane-dev-loads')))
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

  page.on('response', (response) => {
    if (response.request().resourceType() === 'stylesheet')
      stylesheetResponses.push({ url: response.url(), status: response.status() })
  })

  await page.addInitScript(() => {
    const loads = Number(sessionStorage.getItem('vane-dev-loads') ?? 0) + 1
    sessionStorage.setItem('vane-dev-loads', String(loads))

    const inspectFirstFrame = () => {
      const main = document.querySelector('main')

      if (main === null) {
        requestAnimationFrame(inspectFirstFrame)
        return
      }

      const style = getComputedStyle(main)
      window.__vaneFirstPaint = {
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

      await expect.poll(() => page.evaluate(() => window.__vaneFirstPaint)).toMatchObject({
        display: 'block',
      })
      const firstPaint = await page.evaluate(() => window.__vaneFirstPaint)
      expect(firstPaint?.background).not.toBe('rgba(0, 0, 0, 0)')
    }

    expect(stylesheetResponses.some(response => response.url.includes('.vane.css'))).toBe(true)
    expect(stylesheetResponses.filter(response => response.status >= 400)).toEqual([])

    const loadsBeforeHmr = await loadCount(page)
    const select = page.getByLabel('Intent')
    expect(await page.locator('html').evaluate(element => element.style.getPropertyValue('--prism-color-brand'))).toBe('')
    await expect(page.getByLabel('Pick the brand color')).toHaveValue('#735fe9')
    await expect(select).toHaveCSS('border-radius', '6px')

    expect(originalTokens).toContain('radius: { sm: \'6px\'')
    await writeFile(tokensFile, originalTokens.replace('radius: { sm: \'6px\'', 'radius: { sm: \'14px\''))

    await expect(select).toHaveCSS('border-radius', '14px')
    expect(await loadCount(page)).toBe(loadsBeforeHmr)

    const shapeProbe = '\nexport const __vaneHmrShapeProbe = css({ opacity: 1 })\n'
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
    ])
  }
})
