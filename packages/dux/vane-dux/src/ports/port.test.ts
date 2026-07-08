/**
 * The runtime plane: port declaration, interpolation, `set()`, the `ports()`
 * merge, `restorePort`, and the diagnostics contract — the behavior contracts
 * of [dux-spec-ports.md], asserted directly.
 */

import { createSystem, ports } from '@mszr/vane-dux'
import { restorePort } from '@mszr/vane-dux/runtime'
import { definePrismSystem, emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('port() declaration', () => {
  it('creates a handle with a hashed name under the system prefix', () => {
    const { returned: fraction } = emit(() => {
      const { port } = definePrismSystem()
      return port(0)
    })

    expect(fraction.name).toMatch(/^--vane-[a-z0-9_]+$/)
    expect(fraction.kind).toBe('number')
    expect(fraction.defaultValue).toBe(0)
  })

  it('interpolates as var(--name, <default>) — the default makes the style complete', () => {
    const { returned: fraction } = emit(() => {
      const { port } = definePrismSystem()
      return port(0)
    })

    expect(`${fraction}`).toBe(`var(${fraction.name}, 0)`)
    expect(fraction.var).toBe(`var(${fraction.name}, 0)`)
    expect(fraction.toString()).toBe(`var(${fraction.name}, 0)`)
  })

  it('a string default serializes into the var() reference', () => {
    const { returned: width } = emit(() => {
      const { port } = definePrismSystem()
      return port('100%')
    })

    expect(`${width}`).toBe(`var(${width.name}, 100%)`)
    expect(width.kind).toBe('string')
  })

  it('a color token default nests the token var() as the fallback', () => {
    const { returned: tint } = emit(() => {
      const { port, t } = definePrismSystem()
      return port(t.color.brand)
    })

    expect(`${tint}`).toBe(`var(${tint.name}, var(--vane-color-brand))`)
    expect(tint.kind).toBe('color')
  })

  it('a custom prefix flows into the port name', () => {
    const { returned: fraction } = emit(() => {
      const system = createSystem({
        tokens: { color: { brand: '#635bff' } },
        prefix: 'prism',
      })
      return system.port(0)
    })

    expect(fraction.name).toMatch(/^--prism-/)
  })

  it('the `as` option annotates a number port\'s unit', () => {
    const { returned: angle } = emit(() => {
      const { port } = definePrismSystem()
      return port(0, { as: 'deg' })
    })

    expect(`${angle}`).toBe(`var(${angle.name}, 0deg)`)
    expect(angle.set(45)).toEqual({ [angle.name]: '45deg' })
  })

  it('metadata rides the handle — describe and deprecated chain', () => {
    const { returned: gap } = emit(() => {
      const { port } = definePrismSystem()
      return port('8px').describe('The gap between buttons.').deprecated('use gap.sm')
    })

    expect(gap).toBe(gap.describe('The gap between buttons.'))
    expect(`${gap}`).toContain('var(')
  })
})

describe('set()', () => {
  it('returns a style-object fragment with the port\'s variable name', () => {
    const { returned: fraction } = emit(() => {
      const { port } = definePrismSystem()
      return port(0)
    })

    expect(fraction.set(0.62)).toEqual({ [fraction.name]: 0.62 })
  })

  it('a number port with `as` serializes the unit', () => {
    const { returned: angle } = emit(() => {
      const { port } = definePrismSystem()
      return port(0, { as: 'deg' })
    })

    expect(angle.set(90)).toEqual({ [angle.name]: '90deg' })
  })

  it('a color port set accepts a CSS string', () => {
    const { returned: tint } = emit(() => {
      const { port, t } = definePrismSystem()
      return port(t.color.brand)
    })

    expect(tint.set('oklch(0.45 0.15 250)')).toEqual({ [tint.name]: 'oklch(0.45 0.15 250)' })
  })

  it('a color port set accepts a token reference — compiles to var()', () => {
    const { returned } = emit(() => {
      const system = definePrismSystem()
      const tint = system.port(system.t.color.brand)
      return { tint, t: system.t }
    })

    expect(returned.tint.set(returned.t.color.ink)).toEqual({ [returned.tint.name]: 'var(--vane-color-ink)' })
  })

  it('setting writes a value, never a rule — the fragment is plain data', () => {
    const { returned: fraction } = emit(() => {
      const { port } = definePrismSystem()
      return port(0)
    })

    const fragment = fraction.set(0.5)
    expect(typeof fragment).toBe('object')
    expect(Object.keys(fragment)).toHaveLength(1)
    expect(Object.keys(fragment)[0]).toMatch(/^--vane-/)
  })
})

describe('ports() merge', () => {
  it('merges fragments, skipping falsy entries', () => {
    expect(ports({ '--a': 1 }, false, { '--b': 'x' }, undefined)).toEqual({ '--a': 1, '--b': 'x' })
  })

  it('merges multiple port sets into one style object', () => {
    const { returned } = emit(() => {
      const { port } = definePrismSystem()
      const fraction = port(0)
      const tint = port('red')
      return { fraction, tint }
    })

    const merged = ports(returned.fraction.set(0.3), returned.tint.set('blue'))
    expect(merged).toEqual({
      [returned.fraction.name]: 0.3,
      [returned.tint.name]: 'blue',
    })
  })
})

describe('restorePort', () => {
  it('rebuilds a port handle from serialized meta', () => {
    const handle = restorePort({
      name: '--vane-fraction__h4x',
      defaultValue: '0',
      kind: 'number',
    })

    expect(`${handle}`).toBe('var(--vane-fraction__h4x, 0)')
    expect(handle.name).toBe('--vane-fraction__h4x')
    expect(handle.kind).toBe('number')
    expect(handle.set(0.62)).toEqual({ '--vane-fraction__h4x': 0.62 })
  })

  it('a restored port with `as` serializes the unit in set()', () => {
    const handle = restorePort({
      name: '--vane-angle__h4x',
      defaultValue: '0deg',
      kind: 'number',
      unit: 'deg',
    })

    expect(`${handle}`).toBe('var(--vane-angle__h4x, 0deg)')
    expect(handle.set(45)).toEqual({ '--vane-angle__h4x': '45deg' })
  })

  it('a restored color port set accepts a string', () => {
    const handle = restorePort({
      name: '--vane-tint__h4x',
      defaultValue: 'var(--vane-color-brand)',
      kind: 'color',
    })

    expect(`${handle}`).toBe('var(--vane-tint__h4x, var(--vane-color-brand))')
    expect(handle.set('oklch(0.4 0.1 100)')).toEqual({ '--vane-tint__h4x': 'oklch(0.4 0.1 100)' })
  })
})

describe('the spec\'s progress bar', () => {
  it('a port interpolates inside calc() and serializes as var(--name, default)', () => {
    const { css } = emit(() => {
      const { css, port, t } = definePrismSystem()
      const fraction = port(0)

      css({
        inlineSize: `calc(${fraction} * 100%)`,
        background: t.color.brand,
      }, 'fill')
    })

    expect(css).toMatch(/inline-size: calc\(var\(--vane-[^,]+, 0\) \* 100%\)/)
  })

  it('a port used directly as a value serializes with its default fallback', () => {
    const { css } = emit(() => {
      const { css, port, t } = definePrismSystem()
      const tint = port(t.color.brand)

      css({
        background: tint,
      }, 'fill')
    })

    expect(css).toMatch(/background: var\(--vane-[^,]+, var\(--vane-color-brand\)\)/)
  })

  it('a static set() inside a css() rule compiles into a custom-property declaration', () => {
    const { css } = emit(() => {
      const { css, port, t } = definePrismSystem()
      const gap = port(t.space.xs)

      css({
        display: 'flex',
        ...gap.set(t.space.sm),
      }, 'toolbar')
    })

    expect(css).toMatch(/--vane-[^:]+: var\(--vane-space-sm\)/)
    expect(css).toContain('display: flex;')
  })
})
