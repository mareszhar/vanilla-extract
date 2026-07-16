import { createEngine } from '@mszr/vanity'
import { bemPlugin, circle, elevationPlugin, square, truncate } from '@mszr/vanity/preset'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('optional convention plugins', () => {
  it('composes plugins without widening an earlier engine namespace', () => {
    const de = createEngine()
      .use(elevationPlugin())
      .use(bemPlugin({ base: 4 }))

    expect(de.serialize(de.bem(4))).toBe('1rem')
    expect(de.serialize(de.elevation(de.oklch(0.6, 0.2, 280), 0.2))).toContain('light-dark')
  })

  it('bem is an exact engine/system constructor with no private privileges', () => {
    const de = createEngine().use(bemPlugin({ base: 4 }))
    expect(de.serialize(de.bem(4))).toBe('1rem')

    const { css } = emit(() => {
      const ds = de.createSystem({ tokens: de.defineTokens({ size: { control: de.bem(8) } }) })
      return ds.css({ padding: ds.bem(2) }, 'bem')
    })
    expect(css).toContain('padding: 0.5rem')
  })

  it('elevation uses an ordinary configured plugin namespace', () => {
    const de = createEngine().use(elevationPlugin())
    const css = de.serialize(de.elevation(de.oklch(0.6, 0.2, 280), 0.2))
    expect(css).toContain('color-mix')
    expect(css).toContain('light-dark')

    const { css: emitted } = emit(() => {
      const ds = de.createSystem({ tokens: {} })
      return ds.css({ background: ds.elevation(ds.oklch(0.6, 0.2, 280), 0.2) }, 'elevation')
    })
    expect(emitted).toContain('background: color-mix(')
  })
})

describe('style-fragment utilities stay separate from layout patterns', () => {
  it('ships only proven composable fragments', () => {
    expect(square('2rem')).toEqual({ inlineSize: '2rem', blockSize: '2rem' })
    expect(circle('2rem')).toEqual({ inlineSize: '2rem', blockSize: '2rem', borderRadius: '50%' })
    expect(truncate()).toMatchObject({ textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
    expect(truncate(3)).toMatchObject({ WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' })
  })
})
