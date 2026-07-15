import { createEngine } from '@mszr/vane-dux'
import { describe, expectTypeOf, it } from 'vitest'
import { presetConditions, presetTokens } from '../preset'

const de = createEngine()
const ds = de.createSystem({ tokens: presetTokens(de), conditions: presetConditions(de) })

describe('preset foundations types', () => {
  it('preserves token keys and canonical handle traits', () => {
    expectTypeOf(ds.t.color.brand.$mutable).toEqualTypeOf<true>()
    expectTypeOf(ds.t.radius.md.$val).toEqualTypeOf<'8px'>()
    expectTypeOf(ds.t.space.md.$val).toEqualTypeOf<`${number}px`>()

    void presetTokens(de, { radius: 'round', density: 'spacious', contrast: 'soft' })
    // @ts-expect-error — presets reject unknown radius policies locally
    void presetTokens(de, { radius: 'blobby' })
  })
})
