/**
 * The type plane for the preset foundations: the brand seed's liveness is
 * honest ([dux-patterns.md §3]), the controls are typed, and the condition
 * names flow into every bound authoring function.
 */

import type { VaneColor, VaneLiveOverrides } from '@mszr/vane-dux'
import type { VaneThemeTarget } from '@mszr/vane-dux/runtime'
import { createSystem, oklch } from '@mszr/vane-dux'
import { presetConditions, presetTokens } from '@mszr/vane-dux/preset'
import { applyTheme } from '@mszr/vane-dux/runtime'
import { describe, expectTypeOf, it } from 'vitest'

const el = {} as VaneThemeTarget

describe('presetTokens', () => {
  it('a string seed folds static; a .live() seed stays a runtime input', () => {
    expectTypeOf(presetTokens().color.brand).toEqualTypeOf<VaneColor<'static'>>()
    expectTypeOf(presetTokens({ brand: '#ff5500' }).color.brand).toEqualTypeOf<VaneColor<'static'>>()
    expectTypeOf(presetTokens({ brand: oklch(0.58, 0.2, 285).live() }).color.brand).toEqualTypeOf<VaneColor<'live'>>()
  })

  it('control values are typed at the key', () => {
    void presetTokens({ radius: 'sharp', density: 'compact', contrast: 'high' })
    // @ts-expect-error — not a radius control value
    void presetTokens({ radius: 'blobby' })
    // @ts-expect-error — not a density control value
    void presetTokens({ density: 'crowded' })
  })

  it('radius literals ride the control into hovers', () => {
    expectTypeOf(presetTokens().radius.sm).toEqualTypeOf<'4px'>()
    expectTypeOf(presetTokens({ radius: 'sharp' }).radius.sm).toEqualTypeOf<'2px'>()
  })

  it('applyTheme accepts the live brand only', () => {
    const live = createSystem({ tokens: presetTokens({ brand: oklch(0.58, 0.2, 285).live() }) })
    applyTheme(el, live.t, { color: { brand: '#00c48f' } })
    // @ts-expect-error — surface is scheme-decided at build, not a runtime input
    applyTheme(el, live.t, { color: { surface: '#00c48f' } })
  })

  it('a folded preset declares no runtime inputs', () => {
    const { t } = createSystem({ tokens: presetTokens() })
    applyTheme(el, t, {})
    expectTypeOf<keyof VaneLiveOverrides<typeof t>>().toEqualTypeOf<never>()
  })
})

describe('presetConditions', () => {
  it('the names flow into the system as typed rule keys', () => {
    const { css } = createSystem({ tokens: {}, conditions: presetConditions() })

    void css({ 'padding': 8, 'sm': { padding: 12 }, 'open': { overflow: 'visible' }, '2xl': { padding: 16 } })
    // @ts-expect-error — not a condition, a property, a selector, or an at-rule
    void css({ smm: { padding: 12 } })
  })

  it('spreading to extend keeps every preset key typed', () => {
    const { css } = createSystem({
      tokens: {},
      conditions: { ...presetConditions(), cardWide: '@container card (min-width: 400px)' },
    })

    void css({ containerSm: { gap: 4 }, cardWide: { gap: 8 } })
  })
})
