/**
 * Color values are expression trees, not eager computations
 * ([dux-spec-tokens.md §2]): the compiler either folds a tree with build-time
 * math or serializes it to live CSS, choosing per liveness. The helper set is
 * finite and closed — a helper that cannot compile to CSS under liveness
 * doesn't ship — and every helper exists both as a method and standalone.
 */

import type { VaneRuntimeHandle } from '../internal/handle'
import type {
  VaneColor,
  VaneColorish,
  VaneColorMode,
  VaneContrast,
  VaneGuaranteeOf,
  VaneModeOf,
} from './types'
import { isHandle } from '../internal/handle'

// ─── The expression tree ─────────────────────────────────────────────────────

export type VaneColorExpr
  = | { kind: 'oklch', l: number, c: number, h: number, alpha?: number }
    | { kind: 'parse', css: string }
    | { kind: 'ref', handle: VaneRuntimeHandle }
    | { kind: 'alpha', input: VaneColorExpr, amount: number }
    | { kind: 'adjust', input: VaneColorExpr, channel: 'l' | 'c' | 'h', delta: number }
    | { kind: 'mix', input: VaneColorExpr, other: VaneColorExpr, amount: number }
    | { kind: 'scheme', light: VaneColorExpr, dark: VaneColorExpr }
    | { kind: 'elevation', position: number }
    | { kind: 'contrast', target: VaneColorExpr, minLc: number, explicitMin: boolean }

export interface VaneValueMeta {
  description?: string
  deprecated?: string
}

// ─── Color values ────────────────────────────────────────────────────────────

export class ColorValue {
  readonly meta: VaneValueMeta = {}
  markedLive = false

  constructor(readonly expr: VaneColorExpr) {}

  live(): ColorValue {
    this.markedLive = true
    return this
  }

  describe(text: string): ColorValue {
    this.meta.description = text
    return this
  }

  deprecated(reason: string): ColorValue {
    this.meta.deprecated = reason
    return this
  }

  alpha(amount: number): ColorValue {
    return new ColorValue({ kind: 'alpha', input: this.expr, amount })
  }

  lighten(amount: number): ColorValue {
    return new ColorValue({ kind: 'adjust', input: this.expr, channel: 'l', delta: amount })
  }

  darken(amount: number): ColorValue {
    return new ColorValue({ kind: 'adjust', input: this.expr, channel: 'l', delta: -amount })
  }

  saturate(amount: number): ColorValue {
    return new ColorValue({ kind: 'adjust', input: this.expr, channel: 'c', delta: amount })
  }

  desaturate(amount: number): ColorValue {
    return new ColorValue({ kind: 'adjust', input: this.expr, channel: 'c', delta: -amount })
  }

  rotate(degrees: number): ColorValue {
    return new ColorValue({ kind: 'adjust', input: this.expr, channel: 'h', delta: degrees })
  }

  mix(other: VaneColorish, amount: number): ColorValue {
    return new ColorValue({ kind: 'mix', input: this.expr, other: toExpr(other), amount })
  }
}

export class ContrastValue {
  readonly meta: VaneValueMeta = {}

  constructor(readonly expr: Extract<VaneColorExpr, { kind: 'contrast' }>) {}

  describe(text: string): ContrastValue {
    this.meta.description = text
    return this
  }

  deprecated(reason: string): ContrastValue {
    this.meta.deprecated = reason
    return this
  }
}

export function isColorValue(value: unknown): value is ColorValue {
  return value instanceof ColorValue
}

export function isContrastValue(value: unknown): value is ContrastValue {
  return value instanceof ContrastValue
}

/** A colorish input, normalized to an expression: values unwrap, handles become graph edges, strings parse. */
export function toExpr(color: VaneColorish | ColorValue | ContrastValue): VaneColorExpr {
  if (color instanceof ColorValue || color instanceof ContrastValue)
    return color.expr

  if (isHandle(color))
    return { kind: 'ref', handle: color }

  return { kind: 'parse', css: String(color) }
}

// ─── Definition-site builders ────────────────────────────────────────────────

/** A color in oklch — the graph's native space. */
export function oklch(l: number, c: number, h: number, alpha?: number): VaneColor<'static'> {
  return new ColorValue({ kind: 'oklch', l, c, h, ...(alpha === undefined || alpha === 1 ? {} : { alpha }) }) as unknown as VaneColor<'static'>
}

/** Any CSS color literal, joined to the graph: `color('#635bff')`. */
export function color(css: string): VaneColor<'static'> {
  return new ColorValue({ kind: 'parse', css }) as unknown as VaneColor<'static'>
}

/**
 * A scheme is a value pair inside one token — never a parallel palette
 * ([dux-spec-tokens.md §3]). Compiles to `light-dark()`.
 */
export function scheme(pair: { light: VaneColorish, dark: VaneColorish }): VaneColor<'scheme'> {
  return new ColorValue({ kind: 'scheme', light: toExpr(pair.light), dark: toExpr(pair.dark) }) as unknown as VaneColor<'scheme'>
}

/**
 * A position between the background and foreground planes (0–1), mapped to
 * scheme-aware lightness ([dux-spec-tokens.md §4]). One number, both modes.
 */
export function elevation(position: number): VaneColor<'scheme'> {
  return new ColorValue({ kind: 'elevation', position }) as unknown as VaneColor<'scheme'>
}

export interface VaneLegibleOptions {
  /** The consciously-accepted APCA threshold; 60 by default. */
  minLc?: number
}

/**
 * The color legible on `target` — named for what it produces, carrying its
 * check ([dux-spec-tokens.md §5]). Checked at build over build-known targets;
 * over a live target it degrades honestly to `contrast-color()` + fallback.
 */
export function legibleOn<S extends VaneColorish>(
  target: S,
  options: VaneLegibleOptions = {},
): VaneContrast<VaneGuaranteeOf<VaneModeOf<S>>> {
  return new ContrastValue({
    kind: 'contrast',
    target: toExpr(target),
    minLc: options.minLc ?? 60,
    explicitMin: options.minLc !== undefined,
  }) as unknown as VaneContrast<VaneGuaranteeOf<VaneModeOf<S>>>
}

// ─── Standalone helpers — every method, callable ─────────────────────────────

type SameMode<S extends VaneColorish> = VaneColor<VaneModeOf<S>>

function overExpr(input: VaneColorish, expr: (input: VaneColorExpr) => VaneColorExpr): ColorValue {
  return new ColorValue(expr(toExpr(input)))
}

export function alpha<S extends VaneColorish>(color: S, amount: number): SameMode<S> {
  return overExpr(color, input => ({ kind: 'alpha', input, amount })) as unknown as SameMode<S>
}

export function lighten<S extends VaneColorish>(color: S, amount: number): SameMode<S> {
  return overExpr(color, input => ({ kind: 'adjust', input, channel: 'l', delta: amount })) as unknown as SameMode<S>
}

export function darken<S extends VaneColorish>(color: S, amount: number): SameMode<S> {
  return overExpr(color, input => ({ kind: 'adjust', input, channel: 'l', delta: -amount })) as unknown as SameMode<S>
}

export function saturate<S extends VaneColorish>(color: S, amount: number): SameMode<S> {
  return overExpr(color, input => ({ kind: 'adjust', input, channel: 'c', delta: amount })) as unknown as SameMode<S>
}

export function desaturate<S extends VaneColorish>(color: S, amount: number): SameMode<S> {
  return overExpr(color, input => ({ kind: 'adjust', input, channel: 'c', delta: -amount })) as unknown as SameMode<S>
}

export function rotate<S extends VaneColorish>(color: S, degrees: number): SameMode<S> {
  return overExpr(color, input => ({ kind: 'adjust', input, channel: 'h', delta: degrees })) as unknown as SameMode<S>
}

export function mix<A extends VaneColorish, B extends VaneColorish>(
  color: A,
  other: B,
  amount: number,
): VaneColor<VaneColorMode> {
  return new ColorValue({ kind: 'mix', input: toExpr(color), other: toExpr(other), amount }) as unknown as VaneColor<VaneColorMode>
}

/** The color methods every graph handle carries, so derivations read as `color.brand.lighten(0.06)`. */
export function handleColorMethods(handle: VaneRuntimeHandle): Record<string, (...args: never[]) => unknown> {
  const ref = (): VaneColorExpr => ({ kind: 'ref', handle })

  return {
    alpha: (amount: number) => new ColorValue({ kind: 'alpha', input: ref(), amount }),
    lighten: (amount: number) => new ColorValue({ kind: 'adjust', input: ref(), channel: 'l', delta: amount }),
    darken: (amount: number) => new ColorValue({ kind: 'adjust', input: ref(), channel: 'l', delta: -amount }),
    saturate: (amount: number) => new ColorValue({ kind: 'adjust', input: ref(), channel: 'c', delta: amount }),
    desaturate: (amount: number) => new ColorValue({ kind: 'adjust', input: ref(), channel: 'c', delta: -amount }),
    rotate: (degrees: number) => new ColorValue({ kind: 'adjust', input: ref(), channel: 'h', delta: degrees }),
    mix: (other: VaneColorish, amount: number) => new ColorValue({ kind: 'mix', input: ref(), other: toExpr(other), amount }),
  }
}
