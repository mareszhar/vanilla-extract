/**
 * The type-shape plane: port type inference, `set()` typing, and the
 * `VanePort` interface — the contracts of [dux-spec-ports.md §1-3], asserted
 * at the type level.
 */

import type { VaneColorToken, VanePort, VanePortKind, VaneVarReference } from '@mszr/vane-dux'
import { createSystem, oklch } from '@mszr/vane-dux'
import { describe, expectTypeOf, it } from 'vitest'

// Never evaluated — the typecheck plane only reads types.
function system() {
  return createSystem({
    tokens: {
      color: {
        brand: oklch(0.58, 0.2, 285).live(),
        ink: oklch(0.2, 0, 0),
      },
      space: { sm: '8px', md: '16px' },
    },
  })
}

describe('port type inference', () => {
  it('port(0) is a number port — typed by its default', () => {
    const { port } = system()
    const fraction = port(0)

    expectTypeOf(fraction).toExtend<VanePort<number>>()
    expectTypeOf(fraction.defaultValue).toEqualTypeOf<number>()
    expectTypeOf(fraction.kind).toExtend<VanePortKind>()
  })

  it('port("4px") is a string port', () => {
    const { port } = system()
    const width = port('4px')

    expectTypeOf(width).toExtend<VanePort<string>>()
    expectTypeOf(width.defaultValue).toEqualTypeOf<string>()
  })

  it('port(t.color.brand) is a color port — typed by the token handle', () => {
    const { port, t } = system()
    const tint = port(t.color.brand)

    expectTypeOf(tint).toExtend<VanePort<VaneColorToken<'live', 'vane-color-brand'>>>()
  })

  it('the var reference includes the default as a string literal', () => {
    const { port } = system()
    const fraction = port(0)

    expectTypeOf(fraction.var).toEqualTypeOf<`var(--${string}, ${string})`>()
  })

  it('a port satisfies VaneVarReference', () => {
    const { port } = system()
    const fraction = port(0)

    expectTypeOf(fraction).toExtend<VaneVarReference>()
  })
})

describe('set() typing', () => {
  it('a number port accepts a number', () => {
    const { port } = system()
    const fraction = port(0)

    expectTypeOf(fraction.set).parameter(0).toEqualTypeOf<number>()
    fraction.set(0.62)
  })

  it('a string port accepts a string', () => {
    const { port } = system()
    const width = port('4px')

    expectTypeOf(width.set).parameter(0).toEqualTypeOf<string>()
    width.set('8px')
  })

  it('a color port accepts a string or a token reference', () => {
    const { port, t } = system()
    const tint = port(t.color.brand)

    tint.set('oklch(0.45 0.15 250)')
    tint.set(t.color.ink)
  })

  it('a number port rejects a string at the call site', () => {
    const { port } = system()
    const fraction = port(0)

    // @ts-expect-error — a number port takes a number, not a string
    fraction.set('hello')
  })

  it('a string port rejects a number at the call site', () => {
    const { port } = system()
    const width = port('4px')

    // @ts-expect-error — a string port takes a string, not a number
    width.set(8)
  })

  it('port rejects a non-port-input default', () => {
    const { port } = system()

    // @ts-expect-error — a boolean is not a port input
    void port(true)
    // @ts-expect-error — an object is not a port input
    void port({ x: 1 })
  })

  it('set() returns a style-object fragment', () => {
    const { port } = system()
    const fraction = port(0)

    expectTypeOf(fraction.set(0.5)).toEqualTypeOf<Record<`--${string}`, string | number>>()
  })
})

describe('options', () => {
  it('the `as` option accepts a unit string', () => {
    const { port } = system()
    const angle = port(0, { as: 'deg' })

    expectTypeOf(angle).toExtend<VanePort<number>>()
    angle.set(45)
  })

  it('the `label` option accepts a debug string', () => {
    const { port } = system()
    const fraction = port(0, { label: 'fraction' })

    expectTypeOf(fraction).toExtend<VanePort<number>>()
  })
})
