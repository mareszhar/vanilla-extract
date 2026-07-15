import { createEngine } from '@mszr/vane-dux'
import { bemPlugin, circle, elevationPlugin, square, truncate } from '@mszr/vane-dux/preset'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('optional convention plugins', () => {
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
