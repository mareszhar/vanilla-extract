import type { VaneError } from '@mszr/vane-dux'
import { alpha, defineTokens, oklch } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('token module composition', () => {
  it('preserves module stage order and emits one combined graph', () => {
    const colors = defineTokens({ color: { brand: oklch(0.58, 0.2, 285).live() } })
      .derive(({ color }) => ({ color: { soft: alpha(color.brand, 0.12) } }))
    const metrics = defineTokens({ space: { sm: '8px' } })

    const { css, returned: t } = emit(() => defineTokens()
      .compose(colors)
      .compose(metrics)
      .derive(({ color, space }) => ({
        control: { background: color.soft, padding: space.sm },
      }))
      .build({ prefix: 'prism' }))

    expect(t.color.soft.mode).toBe('derived')
    expect(t.control.background.path).toBe('control.background')
    expect(css).toContain('--prism-color-brand: oklch(0.58 0.2 285);')
    expect(css).toContain('--prism-space-sm: 8px;')
    expect(css).toContain('--prism-control-background: var(--prism-color-soft);')
  })

  it('composition and derivation branch immutably', () => {
    const colors = defineTokens({ color: { brand: '#635bff' } })
    const metrics = defineTokens({ space: { sm: '8px' } })
    const combined = defineTokens().compose(colors)
    const extended = combined.compose(metrics)

    const base = emit(() => combined.build({ prefix: 'base' })).returned
    const full = emit(() => extended.build({ prefix: 'full' })).returned

    expect(base.color.brand.name).toBe('--base-color-brand')
    expect('space' in base).toBe(false)
    expect(full.space.sm.name).toBe('--full-space-sm')
  })

  it('keeps a runtime duplicate backstop for escaped TypeScript and JavaScript', () => {
    const first = defineTokens({ color: { brand: '#fff' } })
    const second = defineTokens({ color: { brand: '#000' } })

    expect(() => emit(() => (defineTokens() as any)
      .compose(first)
      .compose(second)
      .build())).toThrowError(expect.objectContaining<Partial<VaneError>>({
      code: 'VANE_TOKENS_DUPLICATE',
    }))
  })
})
