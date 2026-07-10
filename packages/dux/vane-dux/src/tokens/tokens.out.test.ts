/**
 * The output plane: the emitted CSS is a public contract
 * ([dux-workspace.md §5]) — liveness compilation, scheme scopes, folding, and
 * build-vs-live color-math agreement, locked.
 */

import { alpha, defineTokens, legibleOn, mix, oklch, scheme, theme } from '@mszr/vane-dux'
import { definePrism, emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('the Prism graph, emitted', () => {
  it('compiles the whole fixture to boring CSS', () => {
    const { css } = emit(() => definePrism())

    expect(css).toMatchInlineSnapshot(`
      ":root {
        color-scheme: light dark;
      }
      :root {
        --vane-color-brand: oklch(0.58 0.2 285);
        --vane-color-canvas: light-dark(oklch(0.99 0.005 285), oklch(0.14 0.006 285));
        --vane-color-surface: color-mix(in oklab, light-dark(oklch(0.9627 0 0), oklch(0.1558 0 0)), var(--vane-color-brand) 4%);
        --vane-color-ink: color-mix(in oklab, light-dark(oklch(0.1346 0 0), oklch(0.9384 0 0)), var(--vane-color-brand) 4%);
        --vane-color-brand-soft: oklch(from var(--vane-color-brand) l c h / 0.12);
        --vane-color-brand-hover: oklch(from var(--vane-color-brand) calc(l + 0.06) c h);
        --vane-color-on-brand: white;
        --vane-space-xs: 4px;
        --vane-space-sm: 8px;
        --vane-space-md: 16px;
        --vane-space-lg: 24px;
        --vane-space-xl: 40px;
        --vane-radius-sm: 4px;
        --vane-radius-md: 8px;
        --vane-radius-pill: 999px;
        --vane-duration-fast: 120ms;
        --vane-duration-normal: 200ms;
        --vane-text-body-font-size: 1rem;
        --vane-text-body-line-height: 1.5;
        --vane-text-body-font-weight: 400;
        --vane-text-title-font-size: 1.375rem;
        --vane-text-title-line-height: 1.25;
        --vane-text-title-font-weight: 600;
      }
      [data-scheme='light'] {
        color-scheme: light;
      }
      [data-scheme='dark'] {
        color-scheme: dark;
      }
      @supports (color: contrast-color(red)) {
        :root {
          --vane-color-on-brand: contrast-color(var(--vane-color-brand));
        }
      }"
    `)
  })
})

describe('liveness compilation', () => {
  it('folds derivations of static inputs into plain values', () => {
    const { css } = emit(() => defineTokens({ color: { base: oklch(0.5, 0.2, 285) } })
      .derive(({ color }) => ({
        color: {
          soft: alpha(color.base, 0.12),
          hover: color.base.lighten(0.06),
        },
      }))
      .build())

    expect(css).toContain('--vane-color-soft: oklch(0.5 0.2 285 / 0.12);')
    expect(css).toContain('--vane-color-hover: oklch(0.56 0.2 285);')
    expect(css).not.toContain('from')
  })

  it('build math computes exactly the emitted live formula, to the rounding digit', () => {
    // The same operation, folded vs live: `calc(l + 0.06)` over l = 0.58.
    const folded = emit(() => defineTokens({ color: { base: oklch(0.58, 0.2, 285) } })
      .derive(({ color }) => ({ color: { hover: color.base.lighten(0.06) } }))
      .build())
    const live = emit(() => defineTokens({ color: { base: oklch(0.58, 0.2, 285).live() } })
      .derive(({ color }) => ({ color: { hover: color.base.lighten(0.06) } }))
      .build())

    expect(folded.css).toContain('--vane-color-hover: oklch(0.64 0.2 285);')
    expect(live.css).toContain('--vane-color-hover: oklch(from var(--vane-color-base) calc(l + 0.06) c h);')
  })

  it('a live input turns downstream derivations into live CSS without touching them', () => {
    const { css } = emit(() => defineTokens({ color: { seed: oklch(0.6, 0.15, 200).live() } })
      .derive(({ color }) => ({
        color: {
          mixed: mix(color.seed, '#ffffff', 0.3),
          spun: color.seed.rotate(30).desaturate(0.05),
        },
      }))
      .build())

    expect(css).toContain('--vane-color-mixed: color-mix(in oklab, var(--vane-color-seed), oklch(1 0 0) 30%);')
    expect(css).toContain('--vane-color-spun: oklch(from oklch(from var(--vane-color-seed) l c calc(h + 30)) l calc(c - 0.05) h);')
  })

  it('folds a mix of static endpoints with the same math color-mix would run', () => {
    const { css } = emit(() => defineTokens({
      color: { blend: mix(oklch(0.2, 0, 0), oklch(0.8, 0, 0), 0.5) },
    }).build())

    expect(css).toContain('--vane-color-blend: oklch(0.5 0 0);')
  })

  it('helpers parse any CSS color literal', () => {
    const { css } = emit(() => defineTokens({
      color: { soft: alpha('#ffffff', 0.5) },
    }).build())

    expect(css).toContain('--vane-color-soft: oklch(1 0 0 / 0.5);')
  })
})

describe('schemes', () => {
  it('emits no scheme machinery for a scheme-free graph', () => {
    const { css } = emit(() => defineTokens({ radius: { sm: '4px' } }).build())

    expect(css).not.toContain('color-scheme')
    expect(css).not.toContain('data-scheme')
  })

  it('a scheme pair is one token compiled to light-dark(), never a parallel palette', () => {
    const { css } = emit(() => defineTokens({
      color: { canvas: scheme({ light: '#ffffff', dark: oklch(0.14, 0.006, 285) }) },
    }).build())

    expect(css).toContain('--vane-color-canvas: light-dark(oklch(1 0 0), oklch(0.14 0.006 285));')
    expect(css).toContain('color-scheme: light dark')
    expect(css).toContain('[data-scheme=\'light\']')
    expect(css).toContain('[data-scheme=\'dark\']')
  })
})

describe('emitted names', () => {
  it('derives kebab names from paths under a configurable prefix', () => {
    const { css } = emit(() => defineTokens(
      { color: { brandSoft: oklch(0.5, 0.1, 100) } },
    ).build({ prefix: 'prism' }))

    expect(css).toContain('--prism-color-brand-soft: oklch(0.5 0.1 100);')
  })
})

describe('theme()', () => {
  /** The theme's own scope: every class-selector rule body (the graph itself declares on `:root`). */
  function themeScope(css: string): string {
    return [...css.matchAll(/^\.[^{]+\{\n([\s\S]*?)\n\}/gm)].map(match => match[1]).join('\n')
  }

  it('re-declares the overridden variable and every re-folded static descendant', () => {
    const { css } = emit(() => {
      const t = defineTokens({
        color: { base: oklch(0.5, 0.2, 285) },
        radius: { sm: '4px' },
      })
        .derive(({ color }) => ({ color: { soft: alpha(color.base, 0.12) } }))
        .build()

      return theme(t, { color: { base: oklch(0.45, 0.15, 250) } }, 'midnight')
    })

    const scope = themeScope(css)
    expect(scope).toContain('--vane-color-base: oklch(0.45 0.15 250);')
    expect(scope).toContain('--vane-color-soft: oklch(0.45 0.15 250 / 0.12);')
    expect(scope).not.toContain('--vane-radius-sm') // untouched tokens are not re-declared
  })

  it('leaves live derivations alone — the cascade re-derives them', () => {
    const { css, returned } = emit(() => {
      const t = defineTokens({ color: { seed: oklch(0.5, 0.2, 285).live() } })
        .derive(({ color }) => ({ color: { soft: alpha(color.seed, 0.12) } }))
        .build()

      return theme(t, { color: { seed: oklch(0.4, 0.1, 100) } }, 'dusk')
    })

    expect(typeof returned).toBe('string')
    const scope = themeScope(css)
    expect(scope).toContain('--vane-color-seed: oklch(0.4 0.1 100);')
    expect(scope).not.toContain('--vane-color-soft')
  })

  it('a legible pairing re-folds inside the theme scope and may flip its pick', () => {
    const { css } = emit(() => {
      const t = defineTokens({ color: { base: oklch(0.3, 0.1, 285) } })
        .derive(({ color }) => ({ color: { onBase: legibleOn(color.base) } }))
        .build()

      return theme(t, { color: { base: oklch(0.92, 0.02, 285) } }, 'paper')
    })

    expect(css).toContain('--vane-color-on-base: white;') // the graph's own pick, dark base
    expect(css).toContain('--vane-color-on-base: black;') // the theme's re-folded pick, light base
  })
})
