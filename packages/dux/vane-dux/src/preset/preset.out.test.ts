/**
 * The output plane for the preset foundations: the emitted variables are a
 * public contract ([dux-workspace.md §5]) — the token names, the light-dark
 * scheme pairs, the ramp serialization, and the quickstart's compiled button
 * are locked here.
 */

import { createSystem, defineTokens, oklch } from '@mszr/vane-dux'
import { presetConditions, presetTokens } from '@mszr/vane-dux/preset'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('preset tokens, emitted', () => {
  it('both schemes fall out of one subtree: elevation pairs, folded ramp, checked pairing', () => {
    const { css } = emit(() => defineTokens(presetTokens()))

    expect(css).toMatchInlineSnapshot(`
      ":root {
        color-scheme: light dark;
      }
      :root {
        --vane-color-brand: oklch(0.5784 0.2346 278.2909);
        --vane-color-brand-hover: color-mix(in oklab, var(--vane-color-brand), var(--vane-color-ink) 12%);
        --vane-color-brand-active: color-mix(in oklab, var(--vane-color-brand), var(--vane-color-ink) 20%);
        --vane-color-brand-soft: oklch(0.5784 0.2346 278.2909 / 0.12);
        --vane-color-on-brand: white;
        --vane-color-canvas: color-mix(in oklab, light-dark(oklch(0.99 0 0), oklch(0.13 0 0)), var(--vane-color-brand) 4%);
        --vane-color-surface: color-mix(in oklab, light-dark(oklch(0.9627 0 0), oklch(0.1558 0 0)), var(--vane-color-brand) 4%);
        --vane-color-surface-raised: color-mix(in oklab, light-dark(oklch(0.9172 0 0), oklch(0.1988 0 0)), var(--vane-color-brand) 4%);
        --vane-color-border: color-mix(in oklab, light-dark(oklch(0.7898 0 0), oklch(0.3192 0 0)), var(--vane-color-brand) 4%);
        --vane-color-ink-muted: color-mix(in oklab, light-dark(oklch(0.4258 0 0), oklch(0.6632 0 0)), var(--vane-color-brand) 4%);
        --vane-color-ink: color-mix(in oklab, light-dark(oklch(0.1346 0 0), oklch(0.9384 0 0)), var(--vane-color-brand) 4%);
        --vane-space-2xs: 2px;
        --vane-space-xs: 4px;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
        --vane-space-lg: 24px;
        --vane-space-xl: 40px;
        --vane-space-2xl: 64px;
        --vane-text-small-font-size: 0.875rem;
        --vane-text-small-line-height: 1.45;
        --vane-text-small-font-weight: 400;
        --vane-text-body-font-size: 1rem;
        --vane-text-body-line-height: 1.5;
        --vane-text-body-font-weight: 400;
        --vane-text-label-font-size: 0.875rem;
        --vane-text-label-line-height: 1.3;
        --vane-text-label-font-weight: 500;
        --vane-text-title-font-size: 1.375rem;
        --vane-text-title-line-height: 1.25;
        --vane-text-title-font-weight: 600;
        --vane-text-heading-font-size: 1.75rem;
        --vane-text-heading-line-height: 1.2;
        --vane-text-heading-font-weight: 700;
        --vane-text-display-font-size: 2.5rem;
        --vane-text-display-line-height: 1.1;
        --vane-text-display-font-weight: 700;
        --vane-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        --vane-font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        --vane-radius-sm: 4px;
        --vane-radius-md: 8px;
        --vane-radius-lg: 16px;
        --vane-radius-pill: 999px;
        --vane-shadow-sm: 0 1px 2px oklch(0 0 0 / 0.08);
        --vane-shadow-md: 0 2px 8px oklch(0 0 0 / 0.1), 0 1px 2px oklch(0 0 0 / 0.08);
        --vane-shadow-lg: 0 8px 24px oklch(0 0 0 / 0.14), 0 2px 6px oklch(0 0 0 / 0.08);
        --vane-z-dropdown: 1000;
        --vane-z-sticky: 1100;
        --vane-z-overlay: 1300;
        --vane-z-modal: 1400;
        --vane-z-popover: 1500;
        --vane-z-toast: 1600;
        --vane-z-tooltip: 1700;
        --vane-duration-instant: 50ms;
        --vane-duration-fast: 120ms;
        --vane-duration-normal: 200ms;
        --vane-duration-slow: 320ms;
        --vane-ease-standard: cubic-bezier(0.2, 0, 0, 1);
        --vane-ease-enter: cubic-bezier(0.1, 0, 0, 1);
        --vane-ease-exit: cubic-bezier(0.5, 0, 1, 1);
        --vane-ease-spring: linear(0, 0.0543 4%, 0.1813 8%, 0.3388 12%, 0.4988 16%, 0.6442 20%, 0.7663 24%, 0.8625 28%, 0.9335 32%, 0.9824 36%, 1.0133 40%, 1.0304 44%, 1.0375 48%, 1.038 52%, 1.0345 56%, 1.0289 60%, 1.0227 64%, 1.0168 68%, 1.0116 72%, 1.0073 76%, 1.004 80%, 1.0017 84%, 1.0001 88%, 0.9992 92%, 0.9987 96%, 1);
      }
      [data-scheme='light'] {
        color-scheme: light;
      }
      [data-scheme='dark'] {
        color-scheme: dark;
      }"
    `)
  })

  it('a live brand keeps the ramp alive in the browser', () => {
    const { css } = emit(() => defineTokens(presetTokens({ brand: oklch(0.58, 0.2, 285).live() })))

    // The seed is a runtime input; every downstream ramp step re-derives in CSS.
    expect(css).toContain('--vane-color-brand: oklch(0.58 0.2 285)')
    expect(css).toContain('oklch(from var(--vane-color-brand) l c h / 0.12)')
    expect(css).toContain('color-mix(in oklab, var(--vane-color-brand), var(--vane-color-ink) 12%)')
    // The legible pairing degrades honestly: computed fallback + contrast-color() upgrade.
    expect(css).toContain('@supports (color: contrast-color(red))')
  })

  it('the contrast control moves inks and borders as one family', () => {
    const balanced = emit(() => defineTokens(presetTokens())).css
    const high = emit(() => defineTokens(presetTokens({ contrast: 'high' }))).css

    const inkOf = (css: string) => css.match(/--vane-color-ink: ([^;]+);/)?.[1]

    expect(inkOf(balanced)).not.toBe(inkOf(high))
    expect(inkOf(high)).toBe('color-mix(in oklab, light-dark(oklch(0.08 0 0), oklch(0.99 0 0)), var(--vane-color-brand) 4%)')
  })
})

describe('the quickstart, emitted', () => {
  it('compiles the README button against the preset system', () => {
    const { css } = emit(() => {
      const { t, recipe } = createSystem({
        tokens: presetTokens({ brand: '#635bff' }),
        conditions: presetConditions(),
      })

      return recipe({
        base: { ...t.text.body, display: 'inline-flex', gap: t.space.xs, borderRadius: t.radius.sm },
        variants: {
          intent: {
            brand: { background: t.color.brand, color: t.color.onBrand, hover: { background: t.color.brandHover } },
            ghost: { background: 'transparent', hover: { background: t.color.brandSoft } },
          },
          size: {
            sm: { paddingInline: t.space.sm },
            md: { paddingInline: t.space.md },
          },
        },
        defaults: { intent: 'brand', size: 'md' },
      }, 'button')
    })

    // The recipe rides the preset tokens; the classes land in the recipes layer.
    expect(css).toContain('@layer vane.recipes')
    expect(css).toContain('gap: var(--vane-space-xs)')
    expect(css).toContain('background: var(--vane-color-brand)')
    expect(css).toContain('color: var(--vane-color-on-brand)')
  })

  it('preset conditions compile beside the base set', () => {
    const { css } = emit(() => {
      const { css: style } = createSystem({
        tokens: presetTokens(),
        conditions: presetConditions(),
      })

      return style({
        padding: 8,
        sm: { padding: 12 },
        containerMd: { padding: 16 },
        forcedColors: { border: '1px solid CanvasText' },
        open: { overflow: 'visible' },
        hover: { opacity: 0.9 },
      }, 'walk')
    })

    expect(css).toContain('@media (min-width: 40rem)')
    expect(css).toContain('@container (min-width: 28rem)')
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('[data-state=\'open\']')
    expect(css).toContain(':hover')
  })
})
