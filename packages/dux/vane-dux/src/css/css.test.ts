/**
 * The runtime plane: system binding, class identity, and the diagnostics
 * contract — exactly one per mistake, naming the offending key and the fix
 * ([dux-patterns.md §10]).
 */

import { createSystem, legibleOn, oklch, VaneError } from '@mszr/vane-dux'
import { definePrism, definePrismSystem, emit } from '@test'
import { describe, expect, it } from 'vitest'

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

describe('createSystem', () => {
  it('returns the defined graph as t, untouched', () => {
    const { returned } = emit(() => {
      const t = definePrism()
      const system = createSystem({ tokens: t })
      return { t, system }
    })

    expect(returned.system.t).toBe(returned.t)
  })

  it('binds inline tokens and hands t back — one file, one call', () => {
    const { returned: system } = emit(() => createSystem({
      tokens: { color: { brand: '#635bff' } },
      prefix: 'prism',
    }))

    expect(`${system.t.color.brand}`).toBe('var(--prism-color-brand)')
    expect(system.t.color.brand.value).toBe('#635bff')
  })

  it('the bound theme drops the graph argument', () => {
    const { returned, css } = emit(() => {
      const system = createSystem({ tokens: { color: { brand: '#635bff' } } })
      return system.theme({ color: { brand: '#111111' } }, 'midnight')
    })

    expect(typeof returned).toBe('string')
    expect(css).toContain('--vane-color-brand: #111111;')
  })

  it('refuses a condition name that collides with a CSS property, at definition', () => {
    expectVaneError(
      () => emit(() => createSystem({
        tokens: {},
        conditions: { color: '&[data-color]' } as never,
      })),
      'VANE_SYSTEM_CONDITION_COLLISION',
      /the condition 'color' collides with the CSS property 'color'/,
    )
  })

  it('refuses a condition that is neither a selector with & nor an at-rule', () => {
    expectVaneError(
      () => emit(() => createSystem({
        tokens: {},
        conditions: { open: '[data-state=open]' },
      })),
      'VANE_SYSTEM_INVALID_CONDITION',
      /neither a selector containing '&' nor an at-rule/,
    )
  })

  it('a same-named user condition overrides its base condition', () => {
    const { css } = emit(() => {
      const system = createSystem({
        tokens: {},
        conditions: { hover: '&:hover, &[data-hover]' },
      })
      system.css({ hover: { opacity: 0.9 } }, 'probe')
    })

    expect(css).toContain('[data-hover]')
  })

  it('baseConditions: false opts out entirely', () => {
    expectVaneError(
      () => emit(() => {
        const system = createSystem({ tokens: {}, baseConditions: false })
        system.css({ hover: { opacity: 0.9 } } as never)
      }),
      'VANE_CSS_UNKNOWN_PROPERTY',
      /hover is neither a CSS property nor a condition of this system/,
    )
  })

  it('an authoring call outside a style-module build names the missing plugin', () => {
    expectVaneError(
      () => createSystem({ tokens: {} }),
      'VANE_VITE_PLUGIN_MISSING',
      /createSystem ran outside a style-module build/,
    )
  })
})

describe('css() diagnostics', () => {
  it('an invalid value is one diagnostic naming the property and the reason', () => {
    const error = expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        css({ borderRadius: '8pxx' })
      }),
      'VANE_CSS_INVALID_VALUE',
      /borderRadius: '8pxx' does not parse as a border-radius value/,
    )

    expect(error.diagnostics).toHaveLength(1)
  })

  it('an unknown property that slipped past the types dies at build with the fix', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        css({ paddin: '8px' } as never)
      }),
      'VANE_CSS_UNKNOWN_PROPERTY',
      /paddin is not a CSS property — did you mean 'padding'\?/,
    )
  })

  it('an unknown condition in a property-first map suggests the near miss', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        css({ color: { hovr: 'red' } } as never)
      }),
      'VANE_CSS_UNKNOWN_CONDITION',
      /color\.hovr is not a condition of this system — did you mean 'hover'\?/,
    )
  })

  it('an unknown layer suggests the declared order', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        css({ layer: 'overides' } as never)
      }),
      'VANE_SYSTEM_UNKNOWN_LAYER',
      /'overides' is not a layer of this system — did you mean 'overrides'\?/,
    )
  })

  it('legibleOn in a rule position redirects to the graph', () => {
    expectVaneError(
      () => emit(() => {
        const { css, t } = definePrismSystem()
        css({ color: legibleOn(t.color.brand) as never })
      }),
      'VANE_CSS_INVALID_VALUE',
      /legibleOn, which is graph knowledge/,
    )
  })

  it('color helpers serialize in rule positions, folding static endpoints', () => {
    const { css } = emit(() => {
      const system = definePrismSystem()
      system.css({
        background: oklch(0.6, 0.1, 285).alpha(0.5),
        outlineColor: system.t.color.brand.alpha(0.42),
      }, 'helper')
    })

    expect(css).toContain('background: oklch(0.6 0.1 285 / 0.5);')
    expect(css).toContain('outline-color: oklch(from var(--vane-color-brand) l c h / 0.42);')
  })

  it('a condition key holding a plain value is refused with the shape', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        css({ hover: 'red' } as never)
      }),
      'VANE_CSS_INVALID_KEY',
      /hover is a condition, so it takes a nested rule/,
    )
  })

  it('nested layer keys are refused — a style lives in one layer', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        css({ hover: { layer: 'overrides' } } as never)
      }),
      'VANE_CSS_INVALID_KEY',
      /'layer' applies to the whole rule/,
    )
  })

  it('two nested container conditions are refused honestly', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        css({ cardWide: { '@container page (min-width: 800px)': { padding: 0 } } })
      }),
      'VANE_CSS_INVALID_KEY',
      /nests two container conditions/,
    )
  })

  it('@keyframes as a key redirects to keyframes()', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        css({ '@keyframes spin': { from: { rotate: '0deg' } } } as never)
      }),
      'VANE_CSS_INVALID_KEY',
      /an animation is a value/,
    )
  })
})

describe('keyframes diagnostics', () => {
  it('a condition inside a step is refused at the key', () => {
    expectVaneError(
      () => emit(() => {
        const { keyframes } = definePrismSystem()
        keyframes({ from: { hover: { opacity: 0 } } } as never)
      }),
      'VANE_CSS_INVALID_KEY',
      /from\.hover — conditions and selectors are meaningless inside a keyframe step/,
    )
  })

  it('a non-step time is refused', () => {
    expectVaneError(
      () => emit(() => {
        const { keyframes } = definePrismSystem()
        keyframes({ hover: { opacity: 0 } } as never)
      }),
      'VANE_CSS_INVALID_KEY',
      /'hover' is not a keyframe step/,
    )
  })
})

describe('css.raw diagnostics', () => {
  it('a block that does not parse names the failure', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        return css.raw`h2 { color: junk( }`
      }),
      'VANE_CSS_INVALID_RAW',
      /this raw block does not parse/,
    )
  })

  it('an empty declaration inside raw is an invalid value, not a silent drop', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        return css.raw`h2 { margin-block: }`
      }),
      'VANE_CSS_INVALID_VALUE',
      /margin-block/,
    )
  })

  it('typos inside raw die like typos anywhere', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        return css.raw`a { text-underline-offst: 2px; }`
      }),
      'VANE_CSS_UNKNOWN_PROPERTY',
      /text-underline-offst is not a CSS property — did you mean 'text-underline-offset'\?/,
    )
  })

  it('@keyframes inside raw redirects to keyframes()', () => {
    expectVaneError(
      () => emit(() => {
        const { css } = definePrismSystem()
        return css.raw`@keyframes spin { from { opacity: 0 } }`
      }),
      'VANE_CSS_INVALID_RAW',
      /an animation is a value/,
    )
  })
})

describe('globalCss diagnostics', () => {
  it('a selector that does not parse is refused', () => {
    expectVaneError(
      () => emit(() => {
        const { globalCss } = definePrismSystem()
        globalCss('html >', { margin: 0 })
      }),
      'VANE_CSS_INVALID_SELECTOR',
      /'html >' does not parse/,
    )
  })
})
