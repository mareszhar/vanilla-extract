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
    | { kind: 'channels', input: VaneColorExpr, channels: VaneOklchChannels }
    | { kind: 'mix', input: VaneColorExpr, other: VaneColorExpr, amount: number }
    | { kind: 'scheme', light: VaneColorExpr, dark: VaneColorExpr }
    | { kind: 'contrast', target: VaneColorExpr, minLc: number, explicitMin: boolean }

export interface VaneValueMeta {
  description?: string
  deprecated?: string
}

export interface VaneChannelOperation { kind: 'set' | 'add' | 'subtract' | 'multiply' | 'divide', value: number }

export interface VaneOklchChannels {
  l?: number | VaneChannelOperation
  c?: number | VaneChannelOperation
  h?: number | VaneChannelOperation
  alpha?: number | VaneChannelOperation
}

// Brand symbols instead of `instanceof`, exactly like `isHandle`/`isPort`:
// entry bundles may each carry their own copy of these classes (the preset
// creates values the index classifies), and `Symbol.for` survives copies.
const COLOR_VALUE = Symbol.for('vane.colorValue')
const CONTRAST_VALUE = Symbol.for('vane.contrastValue')

// ─── Color values ────────────────────────────────────────────────────────────

export class ColorValue {
  readonly meta: VaneValueMeta = {}
  markedLive = false

  constructor(readonly expr: VaneColorExpr) {
    Object.defineProperty(this, COLOR_VALUE, { value: true })
  }

  live(): ColorValue {
    const value = copyColorValue(this)
    value.markedLive = true
    return value
  }

  describe(text: string): ColorValue {
    const value = copyColorValue(this)
    value.meta.description = text
    return value
  }

  deprecated(reason: string): ColorValue {
    const value = copyColorValue(this)
    value.meta.deprecated = reason
    return value
  }

  alpha(amount: number): ColorValue {
    return copyColorValue(this, { kind: 'alpha', input: this.expr, amount })
  }

  lighten(amount: number): ColorValue {
    return copyColorValue(this, { kind: 'adjust', input: this.expr, channel: 'l', delta: amount })
  }

  darken(amount: number): ColorValue {
    return copyColorValue(this, { kind: 'adjust', input: this.expr, channel: 'l', delta: -amount })
  }

  saturate(amount: number): ColorValue {
    return copyColorValue(this, { kind: 'adjust', input: this.expr, channel: 'c', delta: amount })
  }

  desaturate(amount: number): ColorValue {
    return copyColorValue(this, { kind: 'adjust', input: this.expr, channel: 'c', delta: -amount })
  }

  rotate(degrees: number): ColorValue {
    return copyColorValue(this, { kind: 'adjust', input: this.expr, channel: 'h', delta: degrees })
  }

  mix(other: VaneColorish, amount: number): ColorValue {
    const value = copyColorValue(this, { kind: 'mix', input: this.expr, other: toExpr(other), amount })
    value.markedLive ||= isColorValue(other) && other.markedLive
    return value
  }
}

function copyColorValue(value: ColorValue, expr: VaneColorExpr = value.expr): ColorValue {
  const copy = new ColorValue(expr)
  copy.markedLive = value.markedLive
  Object.assign(copy.meta, value.meta)
  return copy
}

export class ContrastValue {
  readonly meta: VaneValueMeta = {}

  constructor(readonly expr: Extract<VaneColorExpr, { kind: 'contrast' }>) {
    Object.defineProperty(this, CONTRAST_VALUE, { value: true })
  }

  describe(text: string): ContrastValue {
    const value = copyContrastValue(this)
    value.meta.description = text
    return value
  }

  deprecated(reason: string): ContrastValue {
    const value = copyContrastValue(this)
    value.meta.deprecated = reason
    return value
  }
}

function copyContrastValue(value: ContrastValue): ContrastValue {
  const copy = new ContrastValue(value.expr)
  Object.assign(copy.meta, value.meta)
  return copy
}

export function isColorValue(value: unknown): value is ColorValue {
  return typeof value === 'object' && value !== null && COLOR_VALUE in value
}

export function isContrastValue(value: unknown): value is ContrastValue {
  return typeof value === 'object' && value !== null && CONTRAST_VALUE in value
}

/** A colorish input, normalized to an expression: values unwrap, handles become graph edges, strings parse. */
export function toExpr(color: VaneColorish | ColorValue | ContrastValue): VaneColorExpr {
  if (isColorValue(color) || isContrastValue(color))
    return color.expr

  if (isHandle(color))
    return { kind: 'ref', handle: color }

  return { kind: 'parse', css: String(color) }
}

// ─── Definition-site builders ────────────────────────────────────────────────

/** A color in oklch — the graph's native space. */
function createOklch(l: number, c: number, h: number, alpha?: number): VaneColor<'static'> {
  finiteChannels('oklch', [l, c, h, alpha])
  return new ColorValue({ kind: 'oklch', l, c, h, ...(alpha === undefined || alpha === 1 ? {} : { alpha }) }) as unknown as VaneColor<'static'>
}

export interface VaneOklchFunction {
  (l: number, c: number, h: number, alpha?: number): VaneColor<'static'>
  /** CSS relative-color syntax with foldable channel operations. */
  from: <S extends VaneColorish>(base: S, channels: VaneOklchChannels) => VaneColor<VaneModeOf<S>>
}

/**
 * OKLCH constructor plus typed relative-color composition:
 * `oklch.from(base, { c: channel.multiply(0.5), alpha: 0.2 })`.
 */
export const oklch: VaneOklchFunction = Object.assign(createOklch, {
  from<S extends VaneColorish>(base: S, channels: VaneOklchChannels): VaneColor<VaneModeOf<S>> {
    validateChannels(channels)
    return overExpr(base, input => ({ kind: 'channels', input, channels })) as unknown as VaneColor<VaneModeOf<S>>
  },
})

/** CIE LCH: lightness 0–100, chroma, hue in degrees, optional alpha 0–1. */
export function lch(l: number, c: number, h: number, alpha?: number): VaneColor<'static'> {
  finiteChannels('lch', [l, c, h, alpha])
  return color(`lch(${number(l)} ${number(c)} ${number(h)}${slashAlpha(alpha)})`)
}

/** CIE Lab: lightness 0–100, a/b axes, optional alpha 0–1. */
export function lab(l: number, a: number, b: number, alpha?: number): VaneColor<'static'> {
  finiteChannels('lab', [l, a, b, alpha])
  return color(`lab(${number(l)} ${number(a)} ${number(b)}${slashAlpha(alpha)})`)
}

/** OKLab: lightness 0–1, a/b axes, optional alpha 0–1. */
export function oklab(l: number, a: number, b: number, alpha?: number): VaneColor<'static'> {
  finiteChannels('oklab', [l, a, b, alpha])
  return color(`oklab(${number(l)} ${number(a)} ${number(b)}${slashAlpha(alpha)})`)
}

/** HSL: hue in degrees, saturation/lightness as percentages 0–100. */
export function hsl(h: number, s: number, l: number, alpha?: number): VaneColor<'static'> {
  finiteChannels('hsl', [h, s, l, alpha])
  return color(`hsl(${number(h)} ${number(s)}% ${number(l)}%${slashAlpha(alpha)})`)
}

/** sRGB channels 0–255, optional alpha 0–1. */
export function rgb(r: number, g: number, b: number, alpha?: number): VaneColor<'static'> {
  finiteChannels('rgb', [r, g, b, alpha])
  return color(`rgb(${number(r)} ${number(g)} ${number(b)}${slashAlpha(alpha)})`)
}

/** Display-P3 channels 0–1, optional alpha 0–1. */
export function displayP3(r: number, g: number, b: number, alpha?: number): VaneColor<'static'> {
  finiteChannels('displayP3', [r, g, b, alpha])
  return color(`color(display-p3 ${number(r)} ${number(g)} ${number(b)}${slashAlpha(alpha)})`)
}

function operation(kind: VaneChannelOperation['kind'], value: number): VaneChannelOperation {
  finiteChannels(`channel.${kind}`, [value])

  if (kind === 'divide' && value === 0)
    throw new RangeError('[vane] channel.divide() cannot divide by zero')

  return { kind, value }
}

/** Numeric operations for `oklch.from()` channels. Plain numbers mean `set`. */
export const channel = {
  set: (value: number): VaneChannelOperation => operation('set', value),
  add: (value: number): VaneChannelOperation => operation('add', value),
  subtract: (value: number): VaneChannelOperation => operation('subtract', value),
  multiply: (value: number): VaneChannelOperation => operation('multiply', value),
  divide: (value: number): VaneChannelOperation => operation('divide', value),
} as const

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
  const value = new ColorValue(expr(toExpr(input)))

  if (isColorValue(input)) {
    value.markedLive = input.markedLive
    Object.assign(value.meta, input.meta)
  }

  return value
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
  const value = overExpr(color, input => ({ kind: 'mix', input, other: toExpr(other), amount }))
  value.markedLive ||= isColorValue(other) && other.markedLive
  return value as unknown as VaneColor<VaneColorMode>
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

function validateChannels(channels: VaneOklchChannels): void {
  for (const [name, value] of Object.entries(channels)) {
    const numeric = typeof value === 'number' ? value : value.value
    finiteChannels(`oklch.from ${name}`, [numeric])

    if (typeof value !== 'number' && value.kind === 'divide' && value.value === 0)
      throw new RangeError(`[vane] oklch.from ${name} cannot divide by zero`)
  }
}

function finiteChannels(name: string, values: Array<number | undefined>): void {
  for (const value of values) {
    if (value !== undefined && !Number.isFinite(value))
      throw new RangeError(`[vane] ${name} channels must be finite; received ${value}`)
  }
}

function number(value: number): string {
  return String(Object.is(value, -0) ? 0 : value)
}

function slashAlpha(alpha: number | undefined): string {
  return alpha === undefined || alpha === 1 ? '' : ` / ${number(alpha)}`
}
