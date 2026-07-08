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
 * Build a port handle around its meta — the one declaration record. The
 * build-time factory shares the same object with the function serializer, so
 * `.describe()`/`.deprecated()` calls after declaration still cross the
 * boundary; `/runtime`'s `restorePort` passes the deserialized copy.
 */
export function createPortHandle(meta: VanePortMeta): VanePort {
  const serializedDefault = serializeDefault(meta.defaultValue, meta.unit)
  const reference = `var(${meta.name}, ${serializedDefault})` as `var(--${string}, ${string})`

  const handle = (() => reference) as unknown as VanePort

  // `name` is a read-only own property on functions; redefine, never assign.
  Object.defineProperty(handle, 'name', { value: meta.name, configurable: true })
  Object.defineProperty(handle, PORT, { value: true, configurable: true })

  const checked = new Set<string>()

  const set = (value: VanePortSetValue<VanePortInput>): VanePortStyle => {
    // The literal `process.env.NODE_ENV` is what bundlers statically replace,
    // so production builds drop the validation entirely; the `typeof` guard
    // keeps a define-less browser from throwing.
    // eslint-disable-next-line node/prefer-global/process
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production')
      validateSetValue(value, meta, checked)

    return { [meta.name]: serializeSetValue(value, meta.unit) }
  }

  return Object.assign(handle, {
    meta,
    defaultValue: meta.defaultValue as VanePort['defaultValue'],
    kind: meta.kind,
    var: reference,
    set,
    describe: (text: string): VanePort => {
      meta.description = text
      return handle
    },
    deprecated: (reason: string): VanePort => {
      meta.deprecated = reason
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
 * Serialize a `set()` value — handles and ports become their `var()`
 * reference, numbers take the declared unit, strings pass through. The result
 * is a style-object fragment value any framework can bind.
 */
function serializeSetValue(value: VanePortSetValue<VanePortInput>, unit: string | undefined): VanePortValue {
  if (isPort(value) || isHandle(value))
    return value.var
  if (typeof value === 'number')
    return unit ? `${value}${unit}` : value
  return value as VanePortValue
}

/**
 * Dev builds validate each `set()` value once and warn with the port's name on
 * mismatch ([dux-spec-ports.md §3]) — the cursor lie ban extends to runtime
 * writes. Compiled away in production bundles.
 */
function validateSetValue(value: unknown, meta: VanePortMeta, checked: Set<string>): void {
  if (isPort(value) || isHandle(value))
    return

  const key = String(value)

  if (checked.has(key))
    return

  checked.add(key)

  if (meta.kind === 'number' && typeof value !== 'number') {
    warn(`${meta.name} is a number port — set() got ${JSON.stringify(value)}`)
  }
  else if (meta.kind === 'string' && typeof value !== 'string') {
    warn(`${meta.name} is a string port — set() got ${JSON.stringify(value)}`)
  }
  else if (meta.kind === 'color') {
    if (typeof value !== 'string')
      warn(`${meta.name} is a color port — set() got ${JSON.stringify(value)}`)
    else if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && !CSS.supports('color', value))
      warn(`${meta.name} is a color port — '${value}' does not parse as a color`)
  }
}

function warn(message: string): void {
  console.warn(`[vane] ${message}`)
}
