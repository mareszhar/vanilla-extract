/**
 * The runtime plane: handles, diagnostics, checks, themes, and the `/runtime`
 * helpers — the behavior contracts of [dux-spec-tokens.md], asserted directly.
 */

import type { VaneThemeTarget } from '@mszr/vane-dux/runtime'
import { check, defineTokens, legibleOn, oklch, scale, theme, VaneError } from '@mszr/vane-dux'
import { applyTheme, ports, restoreToken, setScheme } from '@mszr/vane-dux/runtime'
import { definePrism, emit } from '@test'
import { describe, expect, it, vi } from 'vitest'

function expectVaneError(run: () => unknown, code: string, message: RegExp): VaneError {
  let caught: unknown

  try {
    run()
  }
  catch (error) {
    caught = error
  }

  expect(caught).toBeInstanceOf(VaneError)
  const vaneError = caught as VaneError
  expect(vaneError.code).toBe(code)
  expect(vaneError.message).toMatch(message)
  return vaneError
}

describe('token handles', () => {
  it('interpolate as their var() reference and carry their identity', () => {
    const t = emit(() => definePrism()).returned

    expect(`${t.color.brand}`).toBe('var(--vane-color-brand)')
    expect(t.color.brand.var).toBe('var(--vane-color-brand)')
    expect(t.color.brand.name).toBe('--vane-color-brand')
    expect(t.color.brandSoft.name).toBe('--vane-color-brand-soft')
    expect(t.color.brand.path).toBe('color.brand')
  })

  it('classify modes honestly: input, scheme pair, derivation, folded value', () => {
    const t = emit(() => definePrism()).returned

    expect(t.color.brand.mode).toBe('live')
    expect(t.color.surface.mode).toBe('scheme')
    expect(t.color.brandSoft.mode).toBe('derived')
    expect(t.color.onBrand.mode).toBe('derived')
    expect(t.radius.sm.mode).toBe('static')
  })

  it('plain value leaves carry their resolved value for hovers and tools', () => {
    const t = emit(() => definePrism()).returned

    expect(t.radius.sm.value).toBe('4px')
    expect(t.space.md.value).toBe('16px')
  })

  it('metadata from the definition site rides the handle', () => {
    const t = emit(() => definePrism()).returned

    expect(t.color.brand.description).toBe('Primary brand hue. Marketing owns this.')
  })

  it('scale generators are ordinary functions producing token subtrees', () => {
    expect(scale.linear({ unit: 4, steps: { sm: 2 } })).toEqual({ sm: '8px' })
    expect(scale.modular({ ratio: 1.25, steps: { md: 0, lg: 1, xl: 2 } }))
      .toEqual({ md: '1rem', lg: '1.25rem', xl: '1.5625rem' })
  })
})

describe('diagnostics', () => {
  it('a derivation cycle names the loop', () => {
    expectVaneError(
      () => emit(() => defineTokens({
        color: {
          a: ({ color }) => color.b.lighten(0.1),
          b: ({ color }) => color.a.darken(0.1),
        },
      })),
      'VANE_TOKENS_CYCLE',
      /color\.[ab] → color\.[ba] → color\.[ab]/,
    )
  })

  it('an unknown token inside a derivation fails the build with a did-you-mean', () => {
    const error = expectVaneError(
      () => emit(() => defineTokens({
        color: {
          brand: oklch(0.5, 0.2, 285),
          soft: ({ color }) => color.brnad.alpha(0.12),
        },
      })),
      'VANE_TOKENS_UNKNOWN_REF',
      /color\.brnad is not a token in this graph — did you mean 'brand'\?/,
    )

    expect(error.message).toContain('while deriving color.soft')
  })

  it('a non-color used as one is named, with the offending value', () => {
    expectVaneError(
      () => emit(() => defineTokens({
        radius: { sm: '4px' },
        color: { odd: ({ radius }) => radius.sm.alpha(0.5) },
      })),
      'VANE_TOKENS_INVALID_COLOR',
      /'4px', which is not a color/,
    )
  })

  it('a failing legible pairing is one diagnostic with the measurement and the fix', () => {
    // Mid-gray: neither white nor black reaches Lc 60.
    const error = expectVaneError(
      () => emit(() => defineTokens({
        color: {
          base: oklch(0.7, 0, 0),
          onBase: ({ color }) => legibleOn(color.base),
        },
      })),
      'VANE_TOKENS_CONTRAST',
      /color\.onBase \/ color\.base fails APCA Lc 60/,
    )

    expect(error.message).toMatch(/best pairing (white|black) = Lc \d+/)
    expect(error.message).toMatch(/accept explicitly: legibleOn\(…, \{ minLc: \d+ \}\)/)
    expect(error.diagnostics).toHaveLength(1)
  })

  it('an explicit threshold is a conscious acceptance', () => {
    const { returned: t } = emit(() => defineTokens({
      color: {
        base: oklch(0.7, 0, 0),
        onBase: ({ color }) => legibleOn(color.base, { minLc: 40 }),
      },
    }))

    expect(t.color.onBase.mode).toBe('derived')
  })

  it('standalone checks guard pairings the graph does not own', () => {
    expectVaneError(
      () => emit(() => defineTokens({
        color: {
          ink: oklch(0.6, 0, 0),
          canvas: oklch(0.7, 0, 0),
        },
      }, {
        checks: ({ color }) => [check.textContrast(color.ink, color.canvas).aa()],
      })),
      'VANE_TOKENS_CONTRAST',
      /color\.ink \/ color\.canvas fails WCAG 2 4\.5:1/,
    )
  })
})

describe('theme()', () => {
  it('an unknown override key dies with a did-you-mean', () => {
    expectVaneError(
      () => emit(() => {
        const t = defineTokens({ color: { brand: oklch(0.5, 0.2, 285) } })
        return theme(t, { color: { brnad: oklch(0.4, 0.1, 100) } } as never)
      }),
      'VANE_TOKENS_INVALID_OVERRIDE',
      /color\.brnad is not a token in this graph — did you mean 'brand'\?/,
    )
  })

  it('needs the graph defineTokens returned', () => {
    expectVaneError(
      () => theme({ color: {} }, {}),
      'VANE_TOKENS_INVALID_OVERRIDE',
      /theme\(\) needs the tokens returned by defineTokens/,
    )
  })

  it('a failing pairing inside a theme names the theme', () => {
    expectVaneError(
      () => emit(() => {
        const t = defineTokens({
          color: {
            base: oklch(0.2, 0, 0),
            onBase: ({ color }) => legibleOn(color.base),
          },
        })
        return theme(t, { color: { base: oklch(0.7, 0, 0) } }, 'muted')
      }),
      'VANE_TOKENS_CONTRAST',
      /theme muted/,
    )
  })
})

describe('/runtime', () => {
  function fakeElement() {
    const writes: Array<[string, string]> = []

    return {
      writes,
      element: { style: { setProperty: (name: string, value: string) => void writes.push([name, value]) } } as unknown as VaneThemeTarget,
    }
  }

  it('applyTheme writes live tokens and re-derives nothing in JS', () => {
    const t = emit(() => definePrism()).returned
    const { element, writes } = fakeElement()

    applyTheme(element, t, { color: { brand: 'oklch(0.45 0.15 250)' } })

    expect(writes).toEqual([['--vane-color-brand', 'oklch(0.45 0.15 250)']])
  })

  it('applyTheme refuses non-live tokens with an honest warning', () => {
    const t = emit(() => definePrism()).returned
    const { element, writes } = fakeElement()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      applyTheme(element, t, { color: { brandSoft: '#fff' } } as never)
      applyTheme(element, t, { color: { missing: '#fff' } } as never)

      expect(writes).toEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('color.brandSoft is derived'))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('color.missing is not a token'))
    }
    finally {
      warn.mockRestore()
    }
  })

  it('setScheme pins and releases the scheme attribute', () => {
    const element = { dataset: {} as Record<string, string> } as HTMLElement

    setScheme(element, 'dark')
    expect(element.dataset.scheme).toBe('dark')

    setScheme(element, null)
    expect(element.dataset.scheme).toBeUndefined()
  })

  it('ports merges style fragments, skipping falsy entries', () => {
    expect(ports({ '--a': 1 }, false, { '--b': 'x' }, undefined)).toEqual({ '--a': 1, '--b': 'x' })
  })

  it('restoreToken rebuilds a serialized handle', () => {
    const handle = restoreToken({ name: '--vane-color-brand', path: 'color.brand', mode: 'live' })

    expect(`${handle}`).toBe('var(--vane-color-brand)')
    expect(handle.name).toBe('--vane-color-brand')
    expect(handle.mode).toBe('live')
  })
})
