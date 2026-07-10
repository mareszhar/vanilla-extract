/**
 * The runtime plane for the preset foundations ([dux-spec-preset.md §1–2]):
 * the token subtree is plain data with ordinary spread semantics, the controls
 * retune whole families, and the conditions map is the documented contract.
 */

import { defineTokens, oklch } from '@mszr/vane-dux'
import { presetConditions, presetTokens } from '@mszr/vane-dux/preset'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('presetTokens', () => {
  it('is a plain subtree: spread extends, later keys win', () => {
    const base = presetTokens()
    const extended = { ...base, radius: { ...base.radius, xl: '32px' } }

    expect(extended.radius.sm).toBe('4px')
    expect(extended.radius.xl).toBe('32px')
    expect(extended.color).toBe(base.color)
  })

  it('ships the documented families', () => {
    const t = presetTokens()

    expect(Object.keys(t)).toEqual(['color', 'space', 'text', 'font', 'radius', 'shadow', 'z', 'duration', 'ease'])
    expect(Object.keys(t.color)).toEqual([
      'brand',
      'brandHover',
      'brandActive',
      'brandSoft',
      'onBrand',
      'canvas',
      'surface',
      'surfaceRaised',
      'border',
      'inkMuted',
      'ink',
    ])
  })

  it('the radius control retunes the family', () => {
    expect(presetTokens().radius.md).toBe('8px')
    expect(presetTokens({ radius: 'sharp' }).radius.md).toBe('4px')
    expect(presetTokens({ radius: 'round' }).radius.md).toBe('14px')
  })

  it('the density control retunes the spacing unit', () => {
    expect(presetTokens().space.md).toBe('16px')
    expect(presetTokens({ density: 'compact' }).space.md).toBe('12px')
    expect(presetTokens({ density: 'spacious' }).space.md).toBe('20px')
  })

  it('the spring easing is a settled linear() ramp', () => {
    const { ease } = presetTokens()

    expect(ease.spring).toMatch(/^linear\(0, /)
    expect(ease.spring).toMatch(/, 1\)$/)
  })

  it('binds through defineTokens with the documented modes', () => {
    const { returned: t } = emit(() => defineTokens(presetTokens()))

    expect(t.color.brand.mode).toBe('static')
    expect(t.color.brandSoft.mode).toBe('derived')
    expect(t.color.surface.mode).toBe('derived')
    expect(t.color.brand.name).toBe('--vane-color-brand')
    expect(t.space.md.value).toBe('16px')
  })

  it('a .live() brand seed stays a runtime input', () => {
    const { returned: t } = emit(() => defineTokens(presetTokens({ brand: oklch(0.58, 0.2, 285).live() })))

    expect(t.color.brand.mode).toBe('live')
  })
})

describe('presetConditions', () => {
  it('carries the documented names, in family order', () => {
    expect(Object.keys(presetConditions())).toEqual([
      'sm',
      'md',
      'lg',
      'xl',
      '2xl',
      'containerSm',
      'containerMd',
      'containerLg',
      'containerXl',
      'portrait',
      'landscape',
      'contrastMore',
      'forcedColors',
      'open',
      'closed',
      'checked',
      'selected',
      'highlighted',
      'invalid',
    ])
  })

  it('breakpoints are mobile-first min-width media arms', () => {
    const conditions = presetConditions()

    expect(conditions.sm.arms).toEqual([{ media: '(min-width: 40rem)' }])
    expect(conditions['2xl'].arms).toEqual([{ media: '(min-width: 96rem)' }])
  })

  it('headless states follow the Zag/Reka data-state / data-* contract', () => {
    const conditions = presetConditions()

    expect(conditions.open.arms).toEqual([{ selector: '&[data-state=\'open\']' }])
    expect(conditions.checked.arms).toEqual([{ selector: '&[data-state=\'checked\']' }])
    expect(conditions.highlighted.arms).toEqual([{ selector: '&[data-highlighted]' }])
    expect(conditions.invalid.arms).toEqual([{ selector: '&[data-invalid]' }])
  })

  it('preference and container conditions carry the platform queries', () => {
    const conditions = presetConditions()

    expect(conditions.forcedColors.arms).toEqual([{ media: '(forced-colors: active)' }])
    expect(conditions.contrastMore.arms).toEqual([{ media: '(prefers-contrast: more)' }])
    expect(conditions.containerMd.arms).toEqual([{ container: '(min-width: 28rem)' }])
  })
})
