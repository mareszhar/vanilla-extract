/**
 * A composable CSS value. Utilities return these instead of opaque strings so
 * other utilities can nest them safely; every vane authoring lane accepts the
 * same value and serializes it to ordinary CSS.
 */

export interface VaneCssValue<Css extends string = string> {
  /** The complete CSS spelling, useful in hovers and non-vane integrations. */
  readonly css: Css
  toString: () => Css
}

/** Structural on purpose: tokens and ports both carry a CSS var reference. */
export interface VaneCssReference {
  readonly var: `var(--${string})` | `var(--${string}, ${string})`
}

const CSS_VALUE = Symbol.for('vane.cssValue')

export abstract class CssValue<Css extends string = string> implements VaneCssValue<Css> {
  abstract readonly css: Css

  constructor() {
    Object.defineProperty(this, CSS_VALUE, { value: true })
  }

  toString(): Css {
    return this.css
  }
}

export function isCssValue(value: unknown): value is VaneCssValue {
  return typeof value === 'object' && value !== null && CSS_VALUE in value
}

export type VaneCssInput = string | number | VaneCssValue | VaneCssReference

/** Serialize a utility input without losing token/port references. */
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
