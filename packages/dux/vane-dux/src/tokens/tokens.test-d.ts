/**
 * The type-shape plane: graph inference, literal names, mode honesty, and
 * `applyTheme` rejecting anything that is not a runtime input
 * ([dux-patterns.md §3]).
 */

import type {
  VaneColor,
  VaneColorToken,
  VaneContrast,
  VaneContrastToken,
  VaneValueToken,
} from '@mszr/vane-dux'
import { alpha, defineTokens, elevation, legibleOn, lighten, mix, oklch, scheme } from '@mszr/vane-dux'
import { applyTheme } from '@mszr/vane-dux/runtime'
import { describe, expectTypeOf, it } from 'vitest'

// Never evaluated — the typecheck plane only reads types.
function graph() {
  return defineTokens({
    color: {
      brand: oklch(0.58, 0.2, 285).live(),
      surface: elevation(0.03),
      brandSoft: ({ color }) => alpha(color.brand, 0.12),
      onBrand: ({ color }) => legibleOn(color.brand),
      canvas: scheme({ light: oklch(0.99, 0.005, 285), dark: oklch(0.14, 0.006, 285) }),
    },
    radius: { sm: '4px' },
    ratio: ({ radius }) => `calc(${radius.sm} * 2)`,
  })
}

describe('the inferred graph', () => {
  it('token references are property accesses with literal names', () => {
    const t = graph()

    expectTypeOf(t.color.brand.name).toEqualTypeOf<'--vane-color-brand'>()
    expectTypeOf(t.color.brand.var).toEqualTypeOf<'var(--vane-color-brand)'>()
    expectTypeOf(t.color.brandSoft.name).toEqualTypeOf<'--vane-color-brand-soft'>()

    // @ts-expect-error — unknown token dies at the cursor
    void t.color.brandSofter
    // @ts-expect-error — unknown group dies at the cursor
    void t.spacing
  })

  it('modes are honest: input, scheme pair, derivation, folded value', () => {
    const t = graph()

    expectTypeOf(t.color.brand).toExtend<VaneColorToken<'live', 'vane-color-brand'>>()
    expectTypeOf(t.color.surface.mode).toEqualTypeOf<'scheme'>()
    expectTypeOf(t.color.brandSoft.mode).toEqualTypeOf<'derived'>()
    expectTypeOf(t.radius.sm.mode).toEqualTypeOf<'static' | 'derived'>()
  })

  it('plain value leaves keep their literal values for hovers', () => {
    const t = graph()

    expectTypeOf(t.radius.sm).toExtend<VaneValueToken<'4px'>>()
    // @ts-expect-error — value tokens carry no color methods
    void t.radius.sm.lighten
  })

  it('a custom prefix flows into every literal name', () => {
    const p = defineTokens({ color: { ink: oklch(0.2, 0, 0) } }, { prefix: 'prism' })

    expectTypeOf(p.color.ink.name).toEqualTypeOf<'--prism-color-ink'>()
  })

  it('a malformed leaf fails at its key', () => {
    // @ts-expect-error — a bigint is not a token value
    void defineTokens({ radius: { sm: 4n } })
  })
})

describe('liveness honesty', () => {
  it('helpers preserve their input mode; live joins win', () => {
    expectTypeOf(oklch(0.5, 0.2, 285)).toEqualTypeOf<VaneColor<'static'>>()
    expectTypeOf(oklch(0.5, 0.2, 285).live()).toEqualTypeOf<VaneColor<'live'>>()
    expectTypeOf(elevation(0.5)).toEqualTypeOf<VaneColor<'scheme'>>()
    expectTypeOf(lighten('#635bff', 0.1)).toEqualTypeOf<VaneColor<'static'>>()
    expectTypeOf(alpha(oklch(0.5, 0.2, 285).live(), 0.5)).toEqualTypeOf<VaneColor<'live'>>()
    expectTypeOf(mix(oklch(0.5, 0.2, 285).live(), '#fff', 0.5)).toExtend<VaneColor>()
  })

  it('a checked pairing claims its guarantee; a live target degrades it', () => {
    expectTypeOf(legibleOn('#635bff')).toEqualTypeOf<VaneContrast<'checked'>>()
    expectTypeOf(legibleOn(oklch(0.5, 0.2, 285).live())).toEqualTypeOf<VaneContrast<'live'>>()

    const t = graph()
    // Through a derivation the target's mode is uncertain, so the guarantee claims nothing false.
    expectTypeOf(t.color.onBrand).toExtend<VaneContrastToken<'checked' | 'live'>>()
  })

  it('applyTheme accepts live tokens only — a non-input key is a type error at that key', () => {
    const t = graph()
    const el = {} as HTMLElement

    applyTheme(el, t, { color: { brand: 'oklch(0.4 0.1 100)' } })
    applyTheme(el, t, {})

    // @ts-expect-error — a derivation is not a runtime input
    applyTheme(el, t, { color: { brandSoft: '#fff' } })
    // @ts-expect-error — a scheme pair is not a runtime input unless marked .live()
    applyTheme(el, t, { color: { surface: '#fff' } })
    // @ts-expect-error — a folded value is not a runtime input
    applyTheme(el, t, { radius: { sm: '8px' } })
    // @ts-expect-error — a group with no live tokens is not accepted at all
    applyTheme(el, t, { radius: {} })
    // @ts-expect-error — unknown tokens die at the cursor
    applyTheme(el, t, { color: { brandy: '#fff' } })
  })
})
