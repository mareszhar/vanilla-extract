/**
 * The public, plane-neutral CSS value contract.
 *
 * `VaneValue` deliberately does not promise context-free serialization. A
 * self-contained value can be serialized by an engine; a system-bound value
 * needs the finalized system that owns its references. `VaneCssValue` is the
 * temporary Phase-1 compatibility adapter used by the existing root helpers.
 */

export type VaneCssDataType
  = | 'unknown'
    | 'declaration'
    | 'number'
    | 'integer'
    | 'percentage'
    | 'number-percentage'
    | 'length'
    | 'length-percentage'
    | 'angle'
    | 'time'
    | 'frequency'
    | 'resolution'
    | 'flex'
    | 'color'
    | 'image'
    | 'position'
    | 'easing-function'
    | 'transform-function'
    | 'transform-list'
    | 'custom-ident'
    | 'dashed-ident'
    | 'string'
    | 'url'
    | `plugin:${string}`

export type VaneResolution = 'self' | 'system'

/** Runtime and cross-package brand; `Symbol.for` survives duplicate installs. */
export const VANE_VALUE = Symbol.for('vane.value')

interface VaneValueBase<Type extends VaneCssDataType = VaneCssDataType> {
  readonly type: Type
  readonly [VANE_VALUE]: {
    readonly resolution: VaneResolution
  }
}

/** A value whose references can be resolved by an engine alone. */
export interface VaneSelfValue<Type extends VaneCssDataType = VaneCssDataType> extends VaneValueBase<Type> {
  readonly [VANE_VALUE]: { readonly resolution: 'self' }
}

/** A value that needs its finalized owning system to resolve token names. */
export interface VaneSystemValue<Type extends VaneCssDataType = VaneCssDataType> extends VaneValueBase<Type> {
  readonly [VANE_VALUE]: { readonly resolution: 'system' }
}

/**
 * Plane-neutral value union. Separate brands avoid propagating a costly
 * resolution generic through every operation while preserving exactness.
 */
export type VaneValue<Type extends VaneCssDataType = VaneCssDataType>
  = | VaneSelfValue<Type>
    | VaneSystemValue<Type>

/**
 * Phase-1 compatibility shape for pre-engine root helpers.
 *
 * @deprecated Prefer explicit engine/system serialization once `createEngine`
 * is the canonical surface. The common `VaneValue` contract has no `.css`.
 */
export interface VaneCssValue<
  Css extends string = string,
  Type extends VaneCssDataType = VaneCssDataType,
> extends VaneSelfValue<Type> {
  readonly css: Css
  toString: () => Css
}

/** Structural on purpose: tokens and ports both carry a CSS var reference. */
export interface VaneCssReference {
  readonly var: `var(--${string})` | `var(--${string}, ${string})`
}

export type VaneDataTypeOf<Value>
  = Value extends VaneValue<infer Type> ? Type
    : Value extends number ? (number extends Value ? 'number' : `${Value}` extends `${bigint}` ? 'integer' : 'number')
      : Value extends `${number}%` ? 'percentage'
        : Value extends `${number}${'px' | 'rem' | 'em' | 'vh' | 'vw' | 'vmin' | 'vmax' | 'ch' | 'lh'}` ? 'length'
          : Value extends `${number}${'deg' | 'grad' | 'rad' | 'turn'}` ? 'angle'
            : Value extends `${number}${'ms' | 's'}` ? 'time'
              : Value extends `${number}fr` ? 'flex'
                : 'unknown'

/** Compatibility base retained for existing helper implementations. */
export abstract class CssValue<
  Css extends string = string,
  Type extends VaneCssDataType = 'unknown',
> implements VaneCssValue<Css, Type> {
  abstract readonly css: Css
  readonly type: Type
  declare readonly [VANE_VALUE]: { readonly resolution: 'self' }

  constructor(type: Type = 'unknown' as Type) {
    this.type = type
    Object.defineProperty(this, VANE_VALUE, {
      value: Object.freeze({ resolution: 'self' }),
    })
  }

  toString(): Css {
    return this.css
  }
}

export function isVaneValue(value: unknown): value is VaneValue {
  return (typeof value === 'object' || typeof value === 'function')
    && value !== null
    && VANE_VALUE in value
}

export function isCssValue(value: unknown): value is VaneCssValue {
  return isVaneValue(value) && 'css' in value
}

export type VaneCssInput = string | number | VaneCssValue | VaneCssReference

/** Serialize a self-contained compatibility input without losing references. */
export function cssText(value: VaneCssInput): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new RangeError(`[vane] a CSS number must be finite; received ${value}`)

    return String(Object.is(value, -0) ? 0 : value)
  }

  if (typeof value === 'string') {
    if (value.trim().length === 0)
      throw new TypeError('[vane] a CSS value cannot be empty')

    return value
  }

  if (isCssValue(value))
    return value.css

  return value.var
}
