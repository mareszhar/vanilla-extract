/**
 * The output plane: the emitted CSS with ports — interpolation, direct value
 * usage, static `set()` in rules, and the `var(--name, <default>)` reference —
 * locked as a public contract ([dux-workspace.md §5]).
 */

import { createSystem } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

/** A tiny system: inline tokens, spec-shaped conditions, default layers. */
function miniSystem() {
  return createSystem({
    tokens: {
      color: { brand: '#635bff', ink: '#1a1a2e' },
      space: { xs: '4px', sm: '8px', md: '16px' },
    },
  })
}

describe('port() in emitted CSS', () => {
  it('a port interpolates inside calc() with its default fallback', () => {
    const { css } = emit(() => {
      const { css, port, t } = miniSystem()
      const fraction = port(0)

      return css({
        inlineSize: `calc(${fraction} * 100%)`,
        background: t.color.brand,
      }, 'fill')
    })

    expect(css).toMatch(/\.fill__[^ ]+ \{/)
    expect(css).toMatch(/inline-size: calc\(var\(--vane-[^,]+, 0\) \* 100%\)/)
    expect(css).toContain('background: var(--vane-color-brand);')
  })

  it('a color port used directly as a value nests the token var() as fallback', () => {
    const { css } = emit(() => {
      const { css, port, t } = miniSystem()
      const tint = port(t.color.brand)

      return css({
        background: tint,
      }, 'fill')
    })

    expect(css).toMatch(/background: var\(--vane-[^,]+, var\(--vane-color-brand\)\)/)
  })

  it('a string port used directly as a value includes the string default', () => {
    const { css } = emit(() => {
      const { css, port } = miniSystem()
      const width = port('100%')

      return css({
        inlineSize: width,
      }, 'fill')
    })

    expect(css).toMatch(/inline-size: var\(--vane-[^,]+, 100%\)/)
  })

  it('a port with `as` includes the unit in the default fallback', () => {
    const { css } = emit(() => {
      const { css, port } = miniSystem()
      const angle = port(0, { as: 'deg' })

      return css({
        rotate: `${angle}`,
      }, 'rotate')
    })

    expect(css).toMatch(/rotate: var\(--vane-[^,]+, 0deg\)/)
  })
})

describe('static set() in css() rules — parent→child theming', () => {
  it('a static set() with a token compiles into a custom-property declaration', () => {
    const { css } = emit(() => {
      const { css, port, t } = miniSystem()
      const gap = port(t.space.xs)

      return css({
        display: 'flex',
        ...gap.set(t.space.sm),
      }, 'toolbar')
    })

    expect(css).toContain('display: flex;')
    expect(css).toMatch(/--vane-[^:]+: var\(--vane-space-sm\);/)
  })

  it('a static set() with a string compiles into a custom-property declaration', () => {
    const { css } = emit(() => {
      const { css, port } = miniSystem()
      const label = port('default')

      return css({
        ...label.set('custom'),
      }, 'override')
    })

    expect(css).toMatch(/--vane-[^:]+: custom;/)
  })

  it('a static set() with a number and unit compiles with the unit', () => {
    const { css } = emit(() => {
      const { css, port } = miniSystem()
      const angle = port(0, { as: 'deg' })

      return css({
        ...angle.set(45),
      }, 'rotate')
    })

    expect(css).toMatch(/--vane-[^:]+: 45deg;/)
  })

  it('multiple static sets merge into one rule', () => {
    const { css } = emit(() => {
      const { css, port, t } = miniSystem()
      const gap = port(t.space.xs)
      const tint = port(t.color.brand)

      return css({
        display: 'flex',
        ...gap.set(t.space.md),
        ...tint.set(t.color.ink),
      }, 'toolbar')
    })

    expect(css).toContain('display: flex;')
    expect(css).toMatch(/--vane-[^:]+: var\(--vane-space-md\);/)
    expect(css).toMatch(/--vane-[^:]+: var\(--vane-color-ink\);/)
  })
})

describe('ports and conditions', () => {
  it('a port inside a conditioned rule serializes in each arm', () => {
    const { css } = emit(() => {
      const { css, port } = miniSystem()
      const fraction = port(0)

      return css({
        inlineSize: `calc(${fraction} * 100%)`,
        hover: { opacity: 0.8 },
      }, 'fill')
    })

    expect(css).toMatch(/inline-size: calc\(var\(--vane-[^,]+, 0\) \* 100%\)/)
    expect(css).toContain('opacity: 0.8;')
  })
})
