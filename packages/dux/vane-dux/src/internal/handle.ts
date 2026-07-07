/**
 * The plane-neutral token handle: the inert value a token resolves to in
 * userland. Shared by the build-time graph (which extends it with authoring
 * methods) and `/runtime` (which restores it when a style module's exports are
 * serialized for app code) — so it imports nothing from either plane.
 */

export type VaneTokenMode = 'static' | 'scheme' | 'live' | 'derived'

export interface VaneHandleMeta {
  /** The emitted custom-property name, e.g. `--vane-color-brand`. */
  name: string
  /** The dot path in the graph, e.g. `color.brand`. */
  path: string
  mode: VaneTokenMode
  /** The build-folded value, carried only by plain value leaves. */
  value?: string | number
  /** Intent from `.describe()` at the definition site. */
  description?: string
  /** The replacement named by `.deprecated()`. */
  deprecated?: string
}

export interface VaneRuntimeHandle {
  (): string
  readonly name: string
  readonly var: string
  readonly path: string
  mode: VaneTokenMode
  value?: string | number
  description?: string
  deprecated?: string
  toString: () => string
}

/**
 * Handles are functions so the vanilla-extract serializer can carry them
 * across the build/app boundary (only functions accept a function serializer);
 * the callability is hidden from the published types.
 */
export function createHandle(meta: VaneHandleMeta): VaneRuntimeHandle {
  const reference = `var(${meta.name})`
  const handle = () => reference

  // `name` is a read-only own property on functions; redefine, never assign.
  Object.defineProperty(handle, 'name', { value: meta.name, configurable: true })

  return Object.assign(handle, {
    var: reference,
    path: meta.path,
    mode: meta.mode,
    ...(meta.value === undefined ? {} : { value: meta.value }),
    ...(meta.description === undefined ? {} : { description: meta.description }),
    ...(meta.deprecated === undefined ? {} : { deprecated: meta.deprecated }),
    toString: () => reference,
  })
}

export function isHandle(value: unknown): value is VaneRuntimeHandle {
  return typeof value === 'function' && 'var' in value && 'path' in value && 'mode' in value
}
