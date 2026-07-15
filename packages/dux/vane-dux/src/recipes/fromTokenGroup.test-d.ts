import { createEngine, fromTokenGroup } from '@mszr/vane-dux'
import { describe, expectTypeOf, it } from 'vitest'

const de = createEngine()
const ds = de.createSystem({ tokens: de.defineTokens({ tone: { brand: 'purple', danger: 'red' } }) })
const tones = fromTokenGroup(ds.t.tone, token => ({ background: token }))

describe('fromTokenGroup typing', () => {
  it('retains exact keys and callback handle types', () => {
    expectTypeOf(tones).toHaveProperty('brand')
    expectTypeOf(tones).toHaveProperty('danger')
    // @ts-expect-error — exact group keys only
    void tones.warning
  })
})
