import { createEngine } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'

describe('canonical token output', () => {
  it('emits only declared public properties and living standards expressions', () => {
    const de = createEngine()
    const { css } = emit(() => de.createSystem({
      tokens: de.defineTokens({
        color: {
          brand: de.oklch(0.58, 0.2, 285),
          compileOnly: de.token({ val: de.oklch(0.4, 0.1, 120), reference: 'val', emit: false }),
        },
        future: de.token.length(),
      }).derive(({ color }) => ({
        color: {
          brandSoft: de.alpha(color.brand, 0.12),
          compileOnlySoft: de.alpha(color.compileOnly, 0.2),
        },
      })),
      prefix: 'app',
    }))

    expect(css).toContain('--app-color-brand: oklch(0.58 0.2 285);')
    expect(css).toContain('--app-color-brand-soft: oklch(from var(--app-color-brand) l c h / 0.12);')
    expect(css).toContain('--app-color-compile-only-soft: oklch(0.4 0.1 120 / 0.2);')
    expect(css).not.toContain('--app-color-compile-only:')
    expect(css).not.toContain('--app-future:')
    expect(css).not.toContain('undefined')
  })
})
