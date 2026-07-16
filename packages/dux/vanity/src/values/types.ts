/**
 * The public, plane-neutral CSS value contract.
 *
 * `VanityValue` deliberately does not promise context-free serialization. A
 * self-contained value can be serialized by an engine; a system-bound value
 * needs the finalized system that owns its references. `VanityCssValue` is the
 * concrete self-contained form exposed by serializable value constructors.
 */

export type VanityCssDataType
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

export type VanityResolution = 'self' | 'system'

/** Runtime and cross-package brand; `Symbol.for` survives duplicate installs. */
export const VANITY_VALUE = Symbol.for('vanity.value')

interface VanityValueBase<Type extends VanityCssDataType = VanityCssDataType> {
  readonly type: Type
  readonly [VANITY_VALUE]: {
    readonly resolution: VanityResolution
  }
}

/** A value whose references can be resolved by an engine alone. */
export interface VanitySelfValue<Type extends VanityCssDataType = VanityCssDataType> extends VanityValueBase<Type> {
  readonly [VANITY_VALUE]: { readonly resolution: 'self' }
}

/** A value that needs its finalized owning system to resolve token names. */
export interface VanitySystemValue<Type extends VanityCssDataType = VanityCssDataType> extends VanityValueBase<Type> {
  readonly [VANITY_VALUE]: { readonly resolution: 'system' }
}

/**
 * Plane-neutral value union. Separate brands avoid propagating a costly
 * resolution generic through every operation while preserving exactness.
 */
export type VanityValue<Type extends VanityCssDataType = VanityCssDataType>
  = | VanitySelfValue<Type>
    | VanitySystemValue<Type>

/** A self-contained value with context-free CSS serialization. */
export interface VanityCssValue<
  Css extends string = string,
  Type extends VanityCssDataType = VanityCssDataType,
> extends VanitySelfValue<Type> {
  readonly css: Css
  toString: () => Css
}

/** Structural on purpose: tokens and ports both carry a CSS var reference. */
export interface VanityCssReference {
  readonly var: `var(--${string})` | `var(--${string}, ${string})`
}

/** Canonical token input. `$var` is typed; `.var` is an optional structural alias. */
export interface VanityTokenInput {
  readonly $var: (fallback?: never) => `var(--${string})` | `var(--${string}, ${string})`
  readonly $path: string
  readonly $reference: 'val' | 'var'
  toString: () => string
}

export type VanityDataTypeOf<Value>
  = Value extends VanityValue<infer Type> ? Type
    : Value extends number ? (number extends Value ? 'number' : `${Value}` extends `${bigint}` ? 'integer' : 'number')
      : Value extends `${number}%` ? 'percentage'
        : Value extends `${number}${'px' | 'rem' | 'em' | 'vh' | 'vw' | 'vmin' | 'vmax' | 'ch' | 'lh'}` ? 'length'
          : Value extends `${number}${'deg' | 'grad' | 'rad' | 'turn'}` ? 'angle'
            : Value extends `${number}${'ms' | 's'}` ? 'time'
              : Value extends `${number}fr` ? 'flex'
                : 'unknown'

/** Concrete base used by self-contained value implementations. */
export abstract class CssValue<
  Css extends string = string,
  Type extends VanityCssDataType = 'unknown',
> implements VanityCssValue<Css, Type> {
  abstract readonly css: Css
  readonly type: Type
  declare readonly [VANITY_VALUE]: { readonly resolution: 'self' }

  constructor(type: Type = 'unknown' as Type) {
    this.type = type
    Object.defineProperty(this, VANITY_VALUE, {
      value: Object.freeze({ resolution: 'self' }),
    })
  }

  toString(): Css {
    return this.css
  }
}

export function isVanityValue(value: unknown): value is VanityValue {
  return (typeof value === 'object' || typeof value === 'function')
    && value !== null
    && VANITY_VALUE in value
}

export function isCssValue(value: unknown): value is VanityCssValue {
  return isVanityValue(value) && 'css' in value
}

export type VanityCssInput = string | number | VanityCssValue | VanityCssReference | VanityTokenInput

/** Serialize a self-contained value without losing references. */
export function cssText(value: VanityCssInput): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new RangeError(`[vanity] a CSS number must be finite; received ${value}`)

    return String(Object.is(value, -0) ? 0 : value)
  }

  if (typeof value === 'string') {
    if (value.trim().length === 0)
      throw new TypeError('[vanity] a CSS value cannot be empty')

    return value
  }

  if (isCssValue(value))
    return value.css

  return 'var' in value ? value.var : String(value)
}
