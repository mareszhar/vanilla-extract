/**
 * The public port types — the typed runtime boundary
 * ([dux-spec-ports.md], [dux-patterns.md §4]). A port is a declared, typed,
 * defaulted CSS custom property that a style exposes as its public runtime
 * interface. One primitive unifies reactive styling, parent→child theming,
 * consumer theming, and dynamic utility values.
 *
 * Two rules govern the types here:
 *
 * - **Typed by the default** ([dux-spec-ports.md §1]): `port(0)` → number,
 *   `port(t.color.brand)` → color. The default is also what types `set()`.
 * - **The types are honest about the boundary**: `set()` returns a style-object
 *   fragment any framework can bind — never a rule, never a stylesheet.
 */

import type { VaneVarReference } from '../css/types'
import type { VaneColor } from '../tokens/types'

/** The primitive values a port can hold and `set()` can return. */
export type VanePortValue = string | number

/** A style-object fragment — the currency that crosses the build/runtime wall. */
export type VanePortStyle = Record<`--${string}`, VanePortValue>

/** Anything acceptable as a port default: a primitive, a token/port reference, or a color expression. */
export type VanePortInput = VanePortValue | VaneVarReference | VaneColor<any>

/**
 * Widen literal primitives to their base type — `0` → `number`, `'4px'` →
 * `string` — so `set()` accepts any value of the kind, not just the default
 * literal. Object types (token handles, ports, color expressions) pass
 * through untouched.
 */
export type VanePortWiden<T> = T extends number ? number : T extends string ? string : T

/**
 * The serialization kind — drives how `set()` serializes values and how the
 * default folds into the `var()` reference ([dux-spec-ports.md §3]).
 *
 * - `number` → unitless (`0.62`), or unit-annotated via `options.as`
 * - `string` → passthrough — also the kind of a plain-value token default
 * - `color` → color syntax or token var (`var(--vane-color-brand)`)
 */
export type VanePortKind = 'number' | 'string' | 'color'

/**
 * Resolve the ambiguity of a port at the declaration, not the call
 * ([dux-spec-ports.md §3]). `port(0, { as: 'deg' })` serializes numbers with
 * the declared unit; `label` is the rare manual override — the `/vite` plugin
 * infers it from the export name.
 */
export interface VanePortOptions {
  /** Annotate a number port's unit: `port(0, { as: 'deg' })` → `0.62deg`. */
  as?: string
  /** Manual debug label — rare; the export name is the default via the `/vite` transform. */
  label?: string
}

/**
 * What `set()` accepts — the port's own primitive kind, or any token/port
 * reference ([dux-spec-ports.md §4]): a parent theming a child's port with a
 * token is the flagship static-set form, whatever the port's kind. Color and
 * token ports also take plain strings (a CSS literal is their currency).
 */
export type VanePortSetValue<TValue extends VanePortInput>
  = (TValue extends VaneVarReference | VaneColor<any> ? string : TValue) | VaneVarReference

/**
 * What the handle stores as its default: references and color expressions
 * serialize at declaration (`var(--vane-color-brand)`, `oklch(…)`), so the
 * same string is there on both sides of the boundary; primitives stay as
 * written.
 */
export type VanePortDefault<TValue extends VanePortInput>
  = TValue extends VaneVarReference | VaneColor<any> ? string : TValue

/**
 * A port — a declared, typed, defaulted CSS custom property
 * ([dux-patterns.md §4]). The handle is a function (so the substrate's
 * function serializer carries it across the build/app boundary); the
 * callability is hidden from the published types.
 *
 * Interpolation via `toString()` yields `var(--name, <default>)` — the default
 * makes every style complete without its runtime half.
 */
export interface VanePort<TValue extends VanePortInput = VanePortInput> {
  /** The emitted custom-property name: `--vane-fraction__h4x`. */
  readonly name: `--${string}`
  /** The serialized default — identical at build time and after `restorePort`. */
  readonly defaultValue: VanePortDefault<TValue>
  /** The serialization kind. */
  readonly kind: VanePortKind
  /** The reference form for interpolation: `var(--name, <default>)`. */
  readonly var: `var(--${string}, ${string})`
  /** The declaration record — one object, shared with the serialized boundary crossing. */
  readonly meta: VanePortMeta
  /**
   * Set the port's value — returns a style-object fragment, never a rule.
   * The union is spelled inline so a wrong value's error names it plainly
   * (`string | VaneVarReference`), not through the alias.
   */
  set: (value: (TValue extends VaneVarReference | VaneColor<any> ? string : TValue) | VaneVarReference) => VanePortStyle
  /** Intent at the definition site — surfaced by the manifest and audits. */
  describe: (text: string) => VanePort<TValue>
  /** Name the replacement — flows into the manifest and audits. */
  deprecated: (reason: string) => VanePort<TValue>
  toString: () => `var(--${string}, ${string})`
}

/** The metadata that crosses the build/runtime boundary when a port is restored. */
export interface VanePortMeta {
  name: string
  defaultValue: VanePortValue
  kind: VanePortKind
  unit?: string
  description?: string
  deprecated?: string
}
