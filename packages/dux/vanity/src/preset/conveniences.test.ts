/**
 * The runtime plane for the preset conveniences ([vanity-spec-preset.md §3–6]):
 * the default atoms map binds through `defineAtoms`, a11y helpers are plain
 * spreadable fragments, motion helpers guard by default with `.always()` as
 * the explicit opt-out, and patterns return memoized ordinary classes.
 */

import { createEngine } from '@mszr/vanity'
import {
  animate,
  definePatterns,
  fade,
  focusRing,
  minTarget,
  presetAtoms,
  presetConditions,
  presetTokens,
  transition,
  visuallyHidden,
} from '@mszr/vanity/preset'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('presetAtoms', () => {
  it('binds through defineAtoms: shorthands, toggles, and the responsive lane', () => {
    const { returned: atoms } = emit(() => {
      const de = createEngine()
      const { defineAtoms, t } = de.createSystem({
        tokens: presetTokens(de),
        conditions: presetConditions(de),
      })

      return defineAtoms(presetAtoms(t), 'atoms')
    })

    expect(atoms({ p: 'md' })).toBe(atoms({ padding: 'md' }))
    expect(atoms({ stack: true })).toMatch(/^atoms_stack__[\w-]+$/)
    expect(atoms({ gap: { base: 'sm', md: 'lg' } }).split(' ')).toHaveLength(2)
    expect(atoms({ bg: 'brand', rounded: 'sm' }).split(' ')).toHaveLength(2)
  })
})

describe('a11y helpers', () => {
  it('focusRing is a :focus-visible-scoped fragment, token-driven', () => {
    expect(focusRing()).toEqual({
      focusVisible: { outline: '2px solid currentColor', outlineOffset: '2px' },
    })

    const brandish = { var: 'var(--vanity-color-brand)' } as const
    expect(focusRing({ color: brandish, width: '3px' }).focusVisible.outline)
      .toBe('3px solid var(--vanity-color-brand)')
  })

  it('visuallyHidden and minTarget are plain fragments', () => {
    expect(visuallyHidden().clipPath).toBe('inset(50%)')
    expect(minTarget()).toEqual({ minInlineSize: '44px', minBlockSize: '44px' })
    expect(minTarget(48).minBlockSize).toBe('48px')
  })
})

describe('motion opinions', () => {
  it('animation and transition are motionOk-guarded by default', () => {
    expect(animate('spin 1s linear')).toEqual({ motionOk: { animation: 'spin 1s linear' } })
    expect(transition('background 120ms ease')).toEqual({ motionOk: { transition: 'background 120ms ease' } })
  })

  it('.always() is the explicit opt-out', () => {
    expect(animate.always('spin 1s linear')).toEqual({ animation: 'spin 1s linear' })
    expect(transition.always('opacity 1s')).toEqual({ transition: 'opacity 1s' })
  })

  it('keyframe fragments feed keyframes()', () => {
    const { returned, css } = emit(() => {
      const { keyframes } = createEngine().createSystem({ tokens: {} })
      return keyframes(fade, 'fade')
    })

    expect(returned).toMatch(/^fade__[\w-]+$/)
    expect(css).toContain('opacity: 0')
  })
})

describe('layout patterns', () => {
  function bindPatterns() {
    return emit(() => {
      const de = createEngine()
      const { css, t } = de.createSystem({ tokens: presetTokens(de) })
      const patterns = definePatterns({ css, t })

      return {
        patterns,
        stacked: patterns.stack({ gap: 'md' }),
        stackedAgain: patterns.stack({ gap: 'md' }),
        sided: patterns.sidebar({ sideWidth: '18rem', gap: 'sm' }),
        switched: patterns.switcher({ threshold: '32rem', limit: 3 }),
      }
    })
  }

  it('each shape is one memoized ordinary class', () => {
    const { returned } = bindPatterns()

    expect(returned.stacked).toMatch(/^stack__[\w-]+$/)
    expect(returned.stackedAgain).toBe(returned.stacked)
    expect(returned.sided).not.toBe(returned.stacked)
  })

  it('the documented CSS comes out the back', () => {
    const { css } = bindPatterns()

    expect(css).toContain('flex-direction: column')
    expect(css).toContain('gap: var(--vanity-space-md)')
    expect(css).toContain('flex-basis: 18rem')
    expect(css).toContain('min-inline-size: 50%')
    expect(css).toContain('flex-basis: calc((32rem - 100%) * 999)')
    expect(css).toContain(':nth-last-child(n+4)')
  })
})
