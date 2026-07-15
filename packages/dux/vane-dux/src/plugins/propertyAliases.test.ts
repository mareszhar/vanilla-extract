import { createEngine, propertyAliases, VaneError } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('propertyAliases()', () => {
  it('expands aliases through the ordinary css compiler', () => {
    const { css } = emit(() => {
      const de = createEngine().use(propertyAliases({ py: 'paddingBlock', bg: 'background' }))
      const ds = de.createSystem({ tokens: de.defineTokens({ space: { md: '16px' } }) })
      return ds.css({ py: ds.t.space.md, bg: 'red' }, 'aliased')
    })

    expect(css).toContain('padding-block: var(--vane-space-md)')
    expect(css).toContain('background: red')
  })

  it('aliases-only rejects the hidden spelling while css.standard preserves the platform', () => {
    const result = emit(() => {
      const de = createEngine().use(propertyAliases({ py: 'paddingBlock' }, { expose: 'aliases-only' }))
      const ds = de.createSystem({ tokens: de.defineTokens({}) })
      const standard = ds.css.standard({ paddingBlock: '2rem' }, 'standard')
      let failure: unknown
      try {
        ds.css({ paddingBlock: '1rem' } as never)
      }
      catch (error) {
        failure = error
      }
      return { standard, failure }
    })

    expect(result.css).toContain('padding-block: 2rem')
    expect(result.returned.failure).toBeInstanceOf(VaneError)
    expect((result.returned.failure as Error).message).toContain('css.standard()')
  })

  it('rejects collisions instead of silently choosing one spelling', () => {
    expect(() => propertyAliases({ paddingBlock: 'paddingBlock' } as never)).toThrow(/standard CSS vocabulary/)
  })

  it('rejects alias and platform spellings in the same declaration arm', () => {
    expect(() => emit(() => {
      const de = createEngine().use(propertyAliases({ py: 'paddingBlock' }))
      const ds = de.createSystem({ tokens: de.defineTokens({}) })
      return ds.css({ py: '1rem', paddingBlock: '2rem' })
    })).toThrow(/declare the same CSS property/)
  })

  it('applies collision diagnostics independently inside conditional arms', () => {
    expect(() => emit(() => {
      const de = createEngine()
        .use(propertyAliases({ py: 'paddingBlock' }))
      const ds = de.createSystem({
        tokens: de.defineTokens({}),
        conditions: { wide: de.media('(width >= 60rem)') },
      })
      return ds.css({ wide: { py: '1rem', paddingBlock: '2rem' } })
    })).toThrow(/declare the same CSS property/)
  })
})
