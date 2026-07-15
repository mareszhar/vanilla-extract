import { createEngine } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'
import { presetConditions, presetTokens } from '../preset'

describe('preset foundations', () => {
  it('builds an engine-compatible, mutable monochromatic starter system', () => {
    const { returned: ds, css } = emit(() => {
      const de = createEngine()
      return de.createSystem({
        tokens: presetTokens(de),
        conditions: presetConditions(de),
      })
    })

    expect(ds.t.color.brand.$mutable).toBe(true)
    expect(ds.t.radius.md.$val).toBe('8px')
    expect(ds.t.space.md.$val).toBe('16px')
    expect(css).toContain('#635bff')
    expect(css).toMatch(/--vane-color-brand: var\(--vane-v-[\w-]+\)/)
  })

  it('keeps the preset knobs explicit and deterministic', () => {
    const de = createEngine()
    const { returned: compact } = emit(() => de.createSystem({
      tokens: presetTokens(de, { radius: 'sharp', density: 'compact', contrast: 'high' }),
    }))

    expect(compact.t.radius.md.$val).toBe('4px')
    expect(compact.t.space.md.$val).toBe('12px')
  })

  it('exposes ordinary condition data that can be spread or trimmed', () => {
    const conditions = presetConditions(createEngine())
    expect(Object.keys(conditions)).toContain('forcedColors')
    expect(conditions.open).toMatchObject({ arms: [{ selector: '&[data-state=\'open\']' }] })
  })
})
