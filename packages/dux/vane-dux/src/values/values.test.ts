/** Runtime and emitted-CSS contracts for the config-agnostic value layer. */

import { calc, channel, clamp, createSystem, defineTokens, displayP3, grid, hsl, lab, lch, max, min, oklab, oklch, rgb } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('cSS math', () => {
  it('composes immutable expressions with precedence and safe nesting', () => {
    const gutter = calc('1rem').add('2px')

    expect(gutter.css).toBe('calc(1rem + 2px)')
    expect(gutter.multiply(2).css).toBe('calc((1rem + 2px) * 2)')
    expect(calc('100%').subtract(calc('2rem').multiply(2)).css).toBe('calc(100% - 2rem * 2)')
    expect(gutter.css).toBe('calc(1rem + 2px)')
    expect(gutter.dimension).toBe('length')
  })

  it('spells min, max, and clamp as plain CSS', () => {
    expect(min('100%', '72rem').css).toBe('min(100%, 72rem)')
    expect(max('44px', '2.75rem').css).toBe('max(44px, 2.75rem)')
    expect(clamp('1rem', calc('2vw').add('0.5rem'), '3rem').css)
      .toBe('clamp(1rem, calc(2vw + 0.5rem), 3rem)')
  })

  it('rejects invalid arithmetic at the utility boundary', () => {
    expect(() => calc('1rem').divide(0)).toThrow(/divide by zero/)
    expect(() => calc('1rem').multiply(Number.NaN)).toThrow(/finite number/)
    expect(() => (calc('1rem') as any).add('2deg')).toThrow(/length and angle/)
  })
})

describe('grid values', () => {
  it('composes dense templates without punctuation bookkeeping', () => {
    const cards = grid.repeat('auto-fit', grid.minmax('16rem', '1fr'))

    expect(cards.css).toBe('repeat(auto-fit, minmax(16rem, 1fr))')
    expect(grid.template('14rem', cards).css).toBe('14rem repeat(auto-fit, minmax(16rem, 1fr))')
    expect(grid.areas('header header', 'sidebar main').css).toBe('"header header" "sidebar main"')
  })

  it('rejects invalid repeat counts and ambiguous area rows', () => {
    expect(() => grid.repeat(0, '1fr')).toThrow(/positive integer/)
    expect(() => grid.areas('"header"')).toThrow(/double quotes/)
  })
})

describe('color-space and relative-channel utilities', () => {
  it('accepts the platform color spaces as typed constructors', () => {
    const { css } = emit(() => defineTokens({
      color: {
        hsl: hsl(264, 100, 68),
        rgb: rgb(99, 91, 255),
        lab: lab(60, 40, -50),
        lch: lch(60, 64, 309),
        oklab: oklab(0.65, 0.12, -0.16),
        p3: displayP3(0.45, 0.35, 1),
      },
    }).build())

    for (const name of ['hsl', 'rgb', 'lab', 'lch', 'oklab', 'p3'])
      expect(css).toContain(`--vane-color-${name}: oklch(`)
  })

  it('folds static channel transforms and serializes live ones as relative OKLCH', () => {
    const folded = emit(() => defineTokens({
      color: {
        base: oklch(0.6, 0.2, 280),
        tuned: oklch.from(oklch(0.6, 0.2, 280), { l: channel.add(0.05), c: channel.multiply(0.5), h: 300 }),
      },
    }).build()).css
    const live = emit(() => defineTokens({ color: { base: oklch(0.6, 0.2, 280).live() } })
      .derive(({ color }) => ({
        color: {
          tuned: oklch.from(color.base, {
            l: channel.add(0.05),
            c: channel.multiply(0.5),
            h: 300,
            alpha: channel.divide(2),
          }),
        },
      }))
      .build()).css

    expect(folded).toContain('--vane-color-tuned: oklch(0.65 0.1 300)')
    expect(live).toContain('--vane-color-tuned: oklch(from var(--vane-color-base) calc(l + 0.05) calc(c * 0.5) 300 / calc(alpha / 2))')
  })

  it('rejects invalid channel arithmetic early', () => {
    expect(() => channel.divide(0)).toThrow(/divide by zero/)
    expect(() => oklch.from('#fff', { l: Number.NaN })).toThrow(/must be finite/)
  })
})

describe('one value language in every lane', () => {
  it('flows through token stages and styles while preserving graph edges', () => {
    const { css, returned } = emit(() => {
      const tokens = defineTokens({ space: { base: '8px', fluid: clamp('1rem', '2vw', '2rem') } })
        .derive(({ space }) => ({ space: { double: calc(space.base).multiply(2) } }))
        .build()
      const { css: style } = createSystem({ tokens })

      return {
        tokens,
        className: style({
          inlineSize: max('20rem', calc('100%').subtract(tokens.space.double)),
          gridTemplateColumns: grid.repeat('auto-fit', grid.minmax('16rem', '1fr')),
        }, 'value-lab'),
      }
    })

    expect(returned.className).toMatch(/^value-lab__/)
    expect(returned.tokens.space.fluid.value).toBe('clamp(1rem, 2vw, 2rem)')
    expect(returned.tokens.space.double.value).toBe('calc(var(--vane-space-base) * 2)')
    expect(css).toContain('--vane-space-double: calc(var(--vane-space-base) * 2)')
    expect(css).toContain('grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))')
    expect(css).toContain('max(20rem, calc(100% - var(--vane-space-double)))')
  })
})
