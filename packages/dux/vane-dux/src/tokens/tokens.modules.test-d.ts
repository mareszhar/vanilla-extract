/** Modular token definitions: standalone inference, exact composition, and conflicts. */

import { alpha, defineTokens, oklch } from '@mszr/vane-dux'
import { describe, expectTypeOf, it } from 'vitest'

const colors = defineTokens({
  color: { brand: oklch(0.58, 0.2, 285).live() },
}).derive(({ color }) => ({
  color: { brandSoft: alpha(color.brand, 0.12) },
}))

const metrics = defineTokens({
  space: { sm: '8px', md: '16px' },
  radius: { sm: '6px' },
})

function design() {
  return defineTokens()
    .compose(colors)
    .compose(metrics)
    .derive(({ color, space }) => ({
      control: {
        compact: `calc(${space.sm} + 2px)`,
        tint: color.brandSoft,
      },
    }))
    .build({ prefix: 'prism' })
}

describe('token modules', () => {
  it('each module is independently buildable', () => {
    const t = colors.build({ prefix: 'palette' })

    expectTypeOf(t.color.brand.name).toEqualTypeOf<'--palette-color-brand'>()
    expectTypeOf(t.color.brandSoft.path).toEqualTypeOf<'color.brandSoft'>()
    // @ts-expect-error — an independent module exposes only its own graph
    void t.space
  })

  it('composition accumulates exact graphs before integration derivations', () => {
    const t = design()

    expectTypeOf(t.color.brand.name).toEqualTypeOf<'--prism-color-brand'>()
    expectTypeOf(t.space.sm.value).toEqualTypeOf<'8px'>()
    expectTypeOf(t.control.tint.path).toEqualTypeOf<'control.tint'>()
    // @ts-expect-error — the composed graph remains exact
    void t.color.braaand
  })

  it('a duplicate module fails at the compose argument', () => {
    const conflicting = defineTokens({ color: { brand: '#f00' } })

    defineTokens()
      .compose(colors)
      // @ts-expect-error — color.brand is already owned by colors
      .compose(conflicting)
  })
})
