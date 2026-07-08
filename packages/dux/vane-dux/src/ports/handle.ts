/**
 * The plane-neutral port handle: the inert value a port resolves to in
 * userland. Shared by the build-time factory (which wraps it with `createVar`
 * and serialization) and `/runtime` (which restores it from serialized meta) —
 * so it imports nothing from either plane, exactly like `internal/handle.ts`.
 */

import type { VanePort, VanePortInput, VanePortMeta, VanePortSetValue, VanePortStyle, VanePortValue } from './types'
import { isHandle } from '../internal/handle'

const PORT = Symbol.for('vane.port')

/** Whether a value is a port handle — used by the CSS value serializer. */
export function isPort(value: unknown): value is VanePort {
  return typeof value === 'function' && (value as unknown as Record<symbol, unknown>)[PORT] === true
}

/**
 * Rebuild a port handle from serialized meta — the runtime half of the
 * build/app boundary. The handle carries the same `name`, `var`, and `set()`
 * as the build-time original, so `port.set(v)` works identically at runtime.
 */
export function createPortHandle(meta: VanePortMeta): VanePort {
  const serializedDefault = serializeDefault(meta.defaultValue, meta.unit)
  const reference = `var(${meta.name}, ${serializedDefault})` as `var(--${string}, ${string})`

  const handle = (() => reference) as unknown as VanePort

  // `name` is a read-only own property on functions; redefine, never assign.
  Object.defineProperty(handle, 'name', { value: meta.name, configurable: true })
  Object.defineProperty(handle, PORT, { value: true, configurable: true })

  const set = (value: VanePortSetValue<VanePortInput>): VanePortStyle => {
    const serialized = serializeSetValue(value, meta.unit)
    return { [meta.name]: serialized }
  }

  return Object.assign(handle, {
    defaultValue: meta.defaultValue as VanePort['defaultValue'],
    kind: meta.kind,
    var: reference,
    set,
    describe: (text: string): VanePort => {
      Object.defineProperty(handle, 'description', { value: text, configurable: true, enumerable: true })
      return handle
    },
    deprecated: (reason: string): VanePort => {
      Object.defineProperty(handle, 'deprecated', { value: reason, configurable: true, enumerable: true })
      return handle
    },
    toString: () => reference,
  })
}

// ─── Serialization (shared by build-time and runtime) ────────────────────────

/** The string that goes into the `var(--name, <default>)` reference. */
export function serializeDefault(value: VanePortValue, unit: string | undefined): string {
  if (typeof value === 'number')
    return unit ? `${value}${unit}` : String(value)
  return String(value)
}

/**
 * Serialize a `set()` value — handles become their `var()` reference, numbers
 * take the declared unit, strings pass through. The result is a style-object
 * fragment value any framework can bind.
 */
function serializeSetValue(value: VanePortSetValue<VanePortInput>, unit: string | undefined): VanePortValue {
  if (isHandle(value))
    return value.var
  if (typeof value === 'number')
    return unit ? `${value}${unit}` : value
  return value as VanePortValue
}
