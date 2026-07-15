import { createEngine } from '@mszr/vane-dux'
import { describe, expectTypeOf, it } from 'vitest'

const de = createEngine().axes(({ axis, data, scheme }) => ({
  scheme: scheme({ locality: 'root' }),
  density: axis({ modes: { compact: data('density', 'compact') } }),
}))
const ds = de.createSystem({
  tokens: {
    color: {
      brand: de.token.color({
        mutable: true,
        axes: { scheme: { dark: null } },
      }),
      fixed: de.oklch(0.5, 0.1, 200),
    },
    shadow: de.token({
      val: 'none',
      mutable: true,
      cases: [{ when: { scheme: 'dark', density: 'compact' }, val: null }],
    }),
  },
})

describe('Phase 5 runtime types', () => {
  it('adds effects only to mutable runtime handles and keeps mode names exact', () => {
    const runtime = ds.runtime()
    expectTypeOf(runtime.t.color.brand.$set).toBeFunction()
    expectTypeOf(runtime.t.color.brand.$axes.scheme.dark.$unset).toBeFunction()
    expectTypeOf(runtime.t.shadow.$case({ scheme: 'dark', density: 'compact' }).$set).toBeFunction()

    runtime.setMode('density', 'compact')
    runtime.setScheme('dark')
    // @ts-expect-error — axis names come from this engine
    runtime.setMode('motion', 'none')
    // @ts-expect-error — mode names come from the chosen axis
    runtime.setMode('density', 'cozy')
    // @ts-expect-error — plane-neutral handles never imply a target
    ds.t.color.brand.$set('red')
    // @ts-expect-error — nonmutable runtime handles stay read-only
    runtime.t.color.fixed.$set('red')
    // @ts-expect-error — color setters preserve the token's data type
    runtime.t.color.brand.$set(de.length.rem(1))
    // @ts-expect-error — immutable base tokens are rejected in the ergonomic tree
    runtime.applyTokenOverrides({ color: { fixed: 'red' } })
  })

  it('accepts same-system plane-neutral authored handles in explicit batches', () => {
    const runtime = ds.runtime()
    runtime.applyTokenOverrides([
      [ds.t.color.brand, 'red'],
      [ds.t.color.brand.$axes.scheme.dark, 'black'],
      [ds.t.shadow.$case({ scheme: 'dark', density: 'compact' }), 'none'],
    ])
  })

  it('types the canonical build-time token override tree independently from runtime mutability', () => {
    ds.tokenOverride({ color: { brand: 'red', fixed: 'black' } })
    // @ts-expect-error — unknown paths fail where they are authored
    ds.tokenOverride({ color: { brnad: 'red' } })
  })
})
