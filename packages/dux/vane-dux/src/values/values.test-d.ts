/** Type contracts for CSS math dimensions and utility interoperability. */

import type { VaneCalc, VaneMathValue } from '@mszr/vane-dux'
import { calc, channel, clamp, createSystem, defineTokens, grid, oklch } from '@mszr/vane-dux'
import { describe, expectTypeOf, it } from 'vitest'

describe('dimension-aware CSS math', () => {
  it('preserves dimensions through valid operations', () => {
    expectTypeOf(calc('1rem')).toExtend<VaneCalc<'length'>>()
    expectTypeOf(calc('1rem').add('2px')).toExtend<VaneCalc<'length'>>()
    expectTypeOf(calc('100%').subtract('2rem')).toExtend<VaneCalc<'length-percentage'>>()
    expectTypeOf(calc('1turn').divide(2)).toExtend<VaneCalc<'angle'>>()
    expectTypeOf(clamp('1rem', '2vw', '3rem')).toExtend<VaneMathValue<'length'>>()
  })

  it('rejects known incompatible dimensions at the operand', () => {
    // @ts-expect-error — a length and angle cannot be added
    calc('1rem').add('2deg')
    // @ts-expect-error — time and length cannot be subtracted
    calc('200ms').subtract('1rem')
  })
})

describe('utility interoperability', () => {
  it('accepts expressions as tokens, derivations, declarations, and port defaults', () => {
    const { t, css, port } = createSystem({
      tokens: defineTokens({ space: { base: '8px' } })
        .derive(({ space }) => ({ space: { double: calc(space.base).multiply(2) } })),
    })

    const measure = port(clamp('20rem', '60vw', '72rem'))
    void css({ inlineSize: measure, gridTemplateColumns: grid.repeat(3, grid.minmax(0, '1fr')) })
    expectTypeOf(t.space.double.value).toEqualTypeOf<string>()
    expectTypeOf(measure.defaultValue).toEqualTypeOf<string>()
  })
})

describe('relative colors', () => {
  it('preserves source liveness through arbitrary channel transforms', () => {
    expectTypeOf(oklch.from(oklch(0.6, 0.2, 280), { c: channel.multiply(0.5) }))
      .toExtend<import('@mszr/vane-dux').VaneColor<'static'>>()
    expectTypeOf(oklch.from(oklch(0.6, 0.2, 280).live(), { alpha: 0.5 }))
      .toExtend<import('@mszr/vane-dux').VaneColor<'live'>>()
  })
})
