/**
 * The three passes over a color expression, all driven by one classification
 * ([dux-patterns.md §3]):
 *
 * - `exprTraits` — is the expression live CSS (`cssLive`), and can a runtime
 *   write change it (`volatile`)?
 * - `foldExpr` — build-time math, computing exactly what the live serialization
 *    would ask the browser to compute (live inputs fold to their defaults).
 * - `serializeExpr` — the live CSS form: relative color syntax, `color-mix()`,
 *   `light-dark()`. Graph edges stay `var()` references; anonymous static
 *   subtrees fold, so the emitted CSS is as boring as it can be.
 *
 * Graph concerns (cycles, per-token memoization, overrides) stay in the
 * resolver callbacks, so `theme()` can re-resolve with substitutions.
 */

import type { VaneRuntimeHandle, VaneTokenMode } from '../internal/handle'
import type { VaneColorExpr } from './color'
import type { VaneOklch } from './math'
import { formatNumber, formatOklch, mixOklch, parseColor, pickLegible } from './math'

export type VaneScheme = 'light' | 'dark'

export interface VaneExprTraits {
  /** Must be emitted as a live CSS expression (scheme pairs or live inputs). */
  cssLive: boolean
  /** A runtime write can change it — some `.live()` input sits upstream. */
  volatile: boolean
}

export interface VaneResolver {
  /** Fold a graph edge to its per-scheme build value (cycle-guarded by the graph). */
  foldRef: (handle: VaneRuntimeHandle, scheme: VaneScheme) => VaneOklch
  /** Classify a graph edge (cycle-guarded by the graph). */
  refTraits: (handle: VaneRuntimeHandle) => VaneExprTraits
  /** Reject a non-color value with a diagnostic naming the offending token. */
  invalidColor: (detail: string) => never
}

// ─── Classification ──────────────────────────────────────────────────────────

export function exprTraits(expr: VaneColorExpr, resolver: VaneResolver): VaneExprTraits {
  switch (expr.kind) {
    case 'oklch':
    case 'parse':
      return { cssLive: false, volatile: false }
    case 'scheme': {
      const inner = join(exprTraits(expr.light, resolver), exprTraits(expr.dark, resolver))
      return { cssLive: true, volatile: inner.volatile }
    }
    case 'ref':
      return resolver.refTraits(expr.handle)
    case 'alpha':
    case 'adjust':
      return exprTraits(expr.input, resolver)
    case 'mix':
      return join(exprTraits(expr.input, resolver), exprTraits(expr.other, resolver))
    case 'contrast':
      return exprTraits(expr.target, resolver)
  }
}

function join(a: VaneExprTraits, b: VaneExprTraits): VaneExprTraits {
  return { cssLive: a.cssLive || b.cssLive, volatile: a.volatile || b.volatile }
}

/** The traits a token contributes at a reference site, read off its resolved mode. */
export function modeTraits(mode: VaneTokenMode): VaneExprTraits {
  switch (mode) {
    case 'static':
      return { cssLive: false, volatile: false }
    case 'scheme':
      return { cssLive: true, volatile: false }
    case 'live':
      return { cssLive: false, volatile: true }
    case 'derived':
      return { cssLive: true, volatile: true }
  }
}

/**
 * Whether a legible pairing sits anywhere in the tree. `legibleOn` is graph
 * knowledge — the check needs both endpoints at build time — so positions
 * outside the graph (rule values, port defaults) reject it with a diagnostic.
 */
export function containsContrast(expr: VaneColorExpr): boolean {
  switch (expr.kind) {
    case 'oklch':
    case 'parse':
    case 'ref':
      return false
    case 'contrast':
      return true
    case 'alpha':
    case 'adjust':
      return containsContrast(expr.input)
    case 'mix':
      return containsContrast(expr.input) || containsContrast(expr.other)
    case 'scheme':
      return containsContrast(expr.light) || containsContrast(expr.dark)
  }
}

/** Collect the token paths an expression references — the graph edges, for introspection. */
export function collectRefs(expr: VaneColorExpr, into: Set<string>): void {
  switch (expr.kind) {
    case 'oklch':
    case 'parse':
      return
    case 'ref':
      into.add(expr.handle.path)
      return
    case 'alpha':
    case 'adjust':
      collectRefs(expr.input, into)
      return
    case 'mix':
      collectRefs(expr.input, into)
      collectRefs(expr.other, into)
      return
    case 'scheme':
      collectRefs(expr.light, into)
      collectRefs(expr.dark, into)
      return
    case 'contrast':
      collectRefs(expr.target, into)
  }
}

function containsRef(expr: VaneColorExpr): boolean {
  switch (expr.kind) {
    case 'oklch':
    case 'parse':
      return false
    case 'ref':
      return true
    case 'alpha':
    case 'adjust':
      return containsRef(expr.input)
    case 'mix':
      return containsRef(expr.input) || containsRef(expr.other)
    case 'scheme':
      return containsRef(expr.light) || containsRef(expr.dark)
    case 'contrast':
      return containsRef(expr.target)
  }
}

// ─── Build-time folding ──────────────────────────────────────────────────────

export function foldExpr(expr: VaneColorExpr, scheme: VaneScheme, resolver: VaneResolver): VaneOklch {
  switch (expr.kind) {
    case 'oklch': {
      const { l, c, h, alpha } = expr
      return { l, c, h, ...(alpha === undefined ? {} : { alpha }) }
    }
    case 'parse': {
      const parsed = parseColor(expr.css)

      if (!parsed)
        return resolver.invalidColor(`'${expr.css}' is not a color`)

      return parsed
    }
    case 'ref':
      return resolver.foldRef(expr.handle, scheme)
    case 'alpha':
      return { ...foldExpr(expr.input, scheme, resolver), alpha: expr.amount }
    case 'adjust': {
      const input = foldExpr(expr.input, scheme, resolver)
      // The formula is the serialization's `calc()`, verbatim — no clamping the
      // browser wouldn't do, so folded and live ramps agree to the rounding digit.
      return { ...input, [expr.channel]: input[expr.channel] + expr.delta }
    }
    case 'mix':
      return mixOklch(foldExpr(expr.input, scheme, resolver), foldExpr(expr.other, scheme, resolver), expr.amount)
    case 'scheme':
      return foldExpr(scheme === 'light' ? expr.light : expr.dark, scheme, resolver)
    case 'contrast':
      return pickLegible(foldExpr(expr.target, scheme, resolver)).color
  }
}

// ─── Live serialization ──────────────────────────────────────────────────────

export function serializeExpr(expr: VaneColorExpr, resolver: VaneResolver): string {
  const traits = exprTraits(expr, resolver)

  // An anonymous static subtree folds — graph edges stay `var()` references.
  if (!traits.cssLive && !traits.volatile && !containsRef(expr))
    return formatOklch(foldExpr(expr, 'light', resolver))

  switch (expr.kind) {
    case 'oklch':
    case 'parse':
      return formatOklch(foldExpr(expr, 'light', resolver)) // unreachable via the fold above; kept total
    case 'ref':
      return expr.handle.var
    case 'alpha':
      return `oklch(from ${serializeExpr(expr.input, resolver)} l c h / ${formatNumber(expr.amount)})`
    case 'adjust':
      return serializeAdjust(expr, resolver)
    case 'mix': {
      const amount = formatNumber(expr.amount * 100)
      return `color-mix(in oklab, ${serializeExpr(expr.input, resolver)}, ${serializeExpr(expr.other, resolver)} ${amount}%)`
    }
    case 'scheme':
      return `light-dark(${serializeExpr(expr.light, resolver)}, ${serializeExpr(expr.dark, resolver)})`
    case 'contrast':
      // Mid-expression, a legible pairing contributes its computed pick; the
      // `contrast-color()` upgrade applies only when it is a token's own value
      // (the graph emits that `@supports` rule).
      return serializeContrastPick(expr, resolver)
  }
}

function serializeAdjust(expr: Extract<VaneColorExpr, { kind: 'adjust' }>, resolver: VaneResolver): string {
  const input = serializeExpr(expr.input, resolver)
  const delta = expr.delta >= 0 ? `+ ${formatNumber(expr.delta)}` : `- ${formatNumber(-expr.delta)}`
  const parts = ['l', 'c', 'h'].map(channel => channel === expr.channel ? `calc(${channel} ${delta})` : channel)
  return `oklch(from ${input} ${parts.join(' ')})`
}

/** The build-computed white/black pick, `light-dark()`-paired when the schemes disagree. */
export function serializeContrastPick(
  expr: Extract<VaneColorExpr, { kind: 'contrast' }>,
  resolver: VaneResolver,
): string {
  const light = pickLegible(foldExpr(expr.target, 'light', resolver))
  const dark = pickLegible(foldExpr(expr.target, 'dark', resolver))
  return light.keyword === dark.keyword ? light.keyword : `light-dark(${light.keyword}, ${dark.keyword})`
}
