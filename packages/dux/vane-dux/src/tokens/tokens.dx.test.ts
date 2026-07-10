/**
 * The editor-DX plane: completions and diagnostics land on the intended key
 * with the intended message, and hovers stay readable public types
 * ([dux-patterns.md §10]) — locked with selenita against the real language
 * service.
 */

import type { Diagnostic } from '@mszr/selenita'
import { cursor } from '@mszr/selenita'
import { duxProject } from '@test'
import { describe, expect, it } from 'vitest'

const project = duxProject()

/** Compiler internals a diagnostic or hover must never leak. */
const LEAK = /ColorValue\b|ContrastValue\b|TokenNode\b/

function expectNoLeak(messages: Array<Diagnostic | string>): void {
  for (const message of messages)
    expect(typeof message === 'string' ? message : message.message).not.toMatch(LEAK)
}

const definePrism = `
import { alpha, defineTokens, legibleOn, oklch, scheme } from '@mszr/vane-dux'

const t = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285).live(),
    surface: scheme({ light: oklch(0.96, 0.01, 285), dark: oklch(0.16, 0.01, 285) }),
    canvas: scheme({ light: oklch(0.99, 0.005, 285), dark: oklch(0.14, 0.006, 285) }),
  },
  radius: { sm: '4px', md: '8px' },
})
  .derive(({ color }) => ({
    color: {
      brandSoft: alpha(color.brand, 0.12),
      brandHover: color.brand.lighten(0.06),
      onBrand: legibleOn(color.brand),
    },
  }))
  .build()
`

describe('the authoring shape', () => {
  it('the spec-shaped graph raises no diagnostics — derivations included', () => {
    const { errors } = project.check`${definePrism}
      void t
    `
    expect(errors).toBeClean()
  })

  it('token references autocomplete as ordinary property accesses', () => {
    const result = project.query`${definePrism}
      void t.color.${cursor}
    `
    expect(result.completions).toContainCompletions(['brand', 'surface', 'brandSoft', 'brandHover', 'onBrand', 'canvas'])
    expect(result.completions).not.toContainCompletion('lighten')
  })

  it('prior token names and the color surface autocomplete inside a derivation', () => {
    const names = project.query`
      import { defineTokens, oklch } from '@mszr/vane-dux'
      void defineTokens({ color: { brand: oklch(0.58, 0.2, 285), ink: '#111' } })
        .derive(({ color }) => ({ color: { soft: color.${cursor} } }))
    `
    const { completions } = project.query`
      import { defineTokens, oklch } from '@mszr/vane-dux'
      void defineTokens({ color: { brand: oklch(0.58, 0.2, 285) } })
        .derive(({ color }) => ({ color: { soft: color.brand.${cursor} } }))
    `
    expect(names.completions).toContainCompletions(['brand', 'ink'])
    expect(names.completions).not.toContainCompletion('braaand')
    expect(completions).toContainCompletions(['alpha', 'lighten', 'darken', 'saturate', 'desaturate', 'rotate', 'mix'])
  })
})

describe('errors at the cursor', () => {
  it('an unknown token is one diagnostic at the key, with the fix', () => {
    const { errors } = project.check`${definePrism}
      void t.color.brnad
    `
    expect(errors).toHaveError(/Did you mean 'brand'/)
    expect(errors).toHaveErrorCount(1)
    expectNoLeak(errors)
  })

  it('a malformed leaf fails at its value, never as an overload wall', () => {
    const { errors } = project.check`
      import { defineTokens } from '@mszr/vane-dux'
      void defineTokens({ radius: { sm: 4n } })
    `
    expect(errors.length).toBe(1)
    expect(errors).not.toHaveError(/No overload|Overload \d/)
    expectNoLeak(errors)
  })

  it('a mistyped derivation reference is one error at the property access', () => {
    const { errors } = project.check`
      import { defineTokens, oklch } from '@mszr/vane-dux'
      void defineTokens({ color: { brand: oklch(0.58, 0.2, 285) } })
        .derive(({ color }) => ({ color: { soft: color.braaand.alpha(0.12) } }))
    `
    expect(errors).toHaveError(/braaand|brand/)
    expect(errors).toHaveErrorCount(1)
    expectNoLeak(errors)
  })

  it('a duplicate stage token is one error at its value', () => {
    const { errors } = project.check`
      import { defineTokens } from '@mszr/vane-dux'
      void defineTokens({ color: { brand: '#fff' } })
        .derive(() => ({ color: { brand: '#000' } }))
    `
    expect(errors).toHaveError(/not assignable to type 'never'/i)
    expect(errors).toHaveErrorCount(1)
    expectNoLeak(errors)
  })

  it('applyTheme rejects a non-live key at that key', () => {
    const { errors } = project.check`${definePrism}
      import { applyTheme } from '@mszr/vane-dux/runtime'
      applyTheme(document.documentElement, t, { color: { brandSoft: '#fff' } })
    `
    expect(errors).toHaveError(/brandSoft/)
    expect(errors).toHaveErrorCount(1)
    expectNoLeak(errors)
  })

  it('applyTheme accepts the live input cleanly', () => {
    const { errors } = project.check`${definePrism}
      import { applyTheme } from '@mszr/vane-dux/runtime'
      applyTheme(document.documentElement, t, { color: { brand: 'oklch(0.4 0.1 100)' } })
    `
    expect(errors).toBeClean()
  })
})

describe('hovers', () => {
  it('a token hover reads as facts: kind, mode, emitted name', () => {
    const result = project.query`${definePrism}
      void t.color.br${cursor}and
    `
    expect(result.hover).toContain('VaneColorToken')
    expect(result.hover).toContain('live')
    expect(result.hover).toContain('vane-color-brand')
    expectNoLeak([result.hover ?? ''])
  })
})
