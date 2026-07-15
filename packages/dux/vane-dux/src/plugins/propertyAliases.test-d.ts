import { createEngine, propertyAliases } from '@mszr/vane-dux'
import { describe, it } from 'vitest'

const bothEngine = createEngine().use(propertyAliases({ py: 'paddingBlock', bg: 'background' }))
const both = bothEngine.createSystem({
  tokens: bothEngine.defineTokens({}),
  conditions: { wide: bothEngine.media('(width >= 60rem)') },
})

const strictEngine = createEngine().use(propertyAliases({ py: 'paddingBlock' }, { expose: 'aliases-only' }))
const strict = strictEngine.createSystem({
  tokens: strictEngine.defineTokens({}),
  conditions: { wide: strictEngine.media('(width >= 60rem)') },
})

describe('property alias typing', () => {
  it('keeps aliases exact and exposes the standards lane', () => {
    void both.css({ py: '1rem', paddingBlock: '2rem', bg: 'red' })
    void both.css({ 'wide': { py: '1rem' }, '&:hover': { bg: 'red' } })
    // @ts-expect-error — unknown aliases never become an index signature
    void both.css({ pyy: '1rem' })

    void strict.css({ py: '1rem' })
    void strict.css({ 'wide': { py: '1rem' }, '&:hover': { py: '2rem' } })
    // @ts-expect-error — aliases-only removes aliased standards from the primary lane
    void strict.css({ paddingBlock: '1rem' })
    // @ts-expect-error — the hidden spelling remains hidden in every conditional arm
    void strict.css({ wide: { paddingBlock: '1rem' } })
    void strict.css.standard({ paddingBlock: '1rem' })
  })
})
