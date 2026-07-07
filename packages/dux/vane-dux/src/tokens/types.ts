/**
 * The public token types. Two rules govern everything here:
 *
 * - **Type the names** ([dux-patterns.md §2]): token paths, emitted variable
 *   names, and modes are all literal types, so mistakes die at the cursor and
 *   hovers read as facts (`VaneColorToken<'live', 'vane-color-brand'>`).
 * - **The types are honest about liveness** ([dux-patterns.md §3]):
 *   `applyTheme` accepts only runtime inputs — tokens marked `.live()` —
 *   because those are the only writes that re-derive the world instead of
 *   half-clobbering it.
 */

// ─── Modes ───────────────────────────────────────────────────────────────────

/**
 * How a token behaves at runtime:
 * `static` folds at build · `scheme` pairs per scheme via `light-dark()` ·
 * `live` is a runtime input (`.live()`) · `derived` re-derives from its inputs.
 */
export type VaneTokenMode = 'static' | 'scheme' | 'live' | 'derived'
export type VaneColorMode = 'static' | 'scheme' | 'live'
export type VaneContrastGuarantee = 'checked' | 'live'

/** The runtime-value mode a token contributes when used inside a derivation. */
type VaneValueMode<M extends VaneTokenMode> = M extends 'derived' ? 'live' : M

type VaneJoinMode<A extends VaneColorMode, B extends VaneColorMode>
  = 'live' extends A | B ? 'live' : 'scheme' extends A | B ? 'scheme' : 'static'

// ─── Authoring color values ──────────────────────────────────────────────────

/** Anything the color helpers accept: a color value, a color token or ref, or a CSS color literal. */
export type VaneColorish = VaneColor<any> | VaneColorTokenAny | VaneContrast<any> | VaneRef | string

export type VaneModeOf<S extends VaneColorish>
  = S extends VaneContrast<infer G> ? (G extends 'checked' ? 'scheme' : 'live')
    : S extends VaneColor<infer M> ? M
      : S extends VaneColorToken<infer M, any> ? VaneValueMode<M>
        : S extends VaneRefs ? VaneColorMode
          : 'static'

/** Distributes over mode unions, so an uncertain target claims no guarantee it can't keep. */
export type VaneGuaranteeOf<M extends VaneColorMode> = M extends 'live' ? 'live' : 'checked'

/**
 * A color under construction: an expression tree the compiler either folds at
 * build time or serializes to live CSS, per liveness. The method set is finite
 * by design — each entry has a defined live-CSS serialization.
 */
export interface VaneColor<M extends VaneColorMode = VaneColorMode> {
  readonly mode: M
  /** Marks the token as a runtime input: writable via `applyTheme`, emitted live. */
  live: () => VaneColor<'live'>
  /** Intent at the definition site — surfaced by the manifest and audits. */
  describe: (text: string) => VaneColor<M>
  deprecated: (reason: string) => VaneColor<M>
  alpha: (amount: number) => VaneColor<M>
  lighten: (amount: number) => VaneColor<M>
  darken: (amount: number) => VaneColor<M>
  saturate: (amount: number) => VaneColor<M>
  desaturate: (amount: number) => VaneColor<M>
  rotate: (degrees: number) => VaneColor<M>
  mix: <O extends VaneColorish>(other: O, amount: number) => VaneColor<VaneJoinMode<M, VaneModeOf<O>>>
}

/**
 * A guaranteed-legible pairing from `legibleOn`. `checked` is proven at build
 * (APCA); over a live target the guarantee degrades honestly to `live` —
 * enforced by emitted `contrast-color()` plus a computed fallback.
 */
export interface VaneContrast<G extends VaneContrastGuarantee = VaneContrastGuarantee> {
  readonly guarantee: G
  describe: (text: string) => VaneContrast<G>
  deprecated: (reason: string) => VaneContrast<G>
}

// ─── Token handles ───────────────────────────────────────────────────────────

export interface VaneTokenBase<Name extends string = string> {
  /** The emitted custom-property name: `--vane-color-brand`. */
  readonly name: `--${Name}`
  /** The reference form for interpolation: `var(--vane-color-brand)`. */
  readonly var: `var(--${Name})`
  /** The dot path in the graph: `color.brand`. */
  readonly path: string
  /** Intent from `.describe()` at the definition site. */
  readonly description?: string
  /** The replacement named by `.deprecated()`. */
  readonly deprecated?: string
  toString: () => `var(--${Name})`
}

export interface VaneColorToken<
  M extends VaneTokenMode = VaneTokenMode,
  Name extends string = string,
> extends VaneTokenBase<Name> {
  readonly mode: M
  alpha: (amount: number) => VaneColor<VaneValueMode<M>>
  lighten: (amount: number) => VaneColor<VaneValueMode<M>>
  darken: (amount: number) => VaneColor<VaneValueMode<M>>
  saturate: (amount: number) => VaneColor<VaneValueMode<M>>
  desaturate: (amount: number) => VaneColor<VaneValueMode<M>>
  rotate: (degrees: number) => VaneColor<VaneValueMode<M>>
  mix: <O extends VaneColorish>(other: O, amount: number) => VaneColor<VaneJoinMode<VaneValueMode<M>, VaneModeOf<O>>>
}

type VaneColorTokenAny = VaneColorToken<VaneTokenMode, string>

export interface VaneContrastToken<
  G extends VaneContrastGuarantee = VaneContrastGuarantee,
  Name extends string = string,
> extends VaneTokenBase<Name> {
  readonly mode: 'derived'
  readonly guarantee: G
}

export interface VaneValueToken<
  V extends string | number = string | number,
  Name extends string = string,
> extends VaneTokenBase<Name> {
  readonly mode: 'static' | 'derived'
  /** The resolved value — hover a token, read its answer. */
  readonly value: V
}

// ─── The graph: input shape and inferred output ──────────────────────────────

export type VaneLeafInput = VaneColor<any> | VaneContrast<any> | string | number
export type VaneDerivedResult
  = VaneColor<any> | VaneContrast<any> | VaneColorTokenAny | VaneValueToken<any, any> | VaneRefs | string | number

/**
 * What a derivation sees: every token a ref with the full color surface.
 * Non-generic by necessity — TypeScript fixes the graph's inference before a
 * derivation's own type exists — so token names resolve here structurally;
 * a mistyped name inside a derivation is a build diagnostic with a
 * `did you mean`, raised the moment the derivation runs.
 */
export interface VaneRefs {
  [token: string]: VaneRef
}

/**
 * One node of the refs tree — a group or a token, with the color methods one
 * property away. Named-interface recursion, deliberately: tsc's incremental
 * mode mis-resolves self-intersecting recursive aliases.
 */
export interface VaneRef {
  [token: string]: VaneRef
  (amount: number | VaneColorish, second?: number): VaneColor<VaneColorMode>
  readonly alpha: VaneRef
  readonly lighten: VaneRef
  readonly darken: VaneRef
  readonly saturate: VaneRef
  readonly desaturate: VaneRef
  readonly rotate: VaneRef
  readonly mix: VaneRef
}

export type VaneDerivation = (refs: VaneRefs) => VaneDerivedResult

/**
 * The authoring shape `defineTokens` accepts, used to contextually type
 * derivations and to reject a malformed leaf at its key. Inference rides the
 * intersected `T`, which carries the literal graph.
 */
export interface VaneGraphInput {
  [token: string]: VaneLeafInput | VaneDerivation | VaneGraphInput
}

/** Per-character kebab-case, in lockstep with the runtime rule in `names.ts`. */
export type VaneKebab<S extends string> = S extends `${infer Head}${infer Rest}`
  ? Head extends Uppercase<Head>
    ? Head extends Lowercase<Head>
      ? `${Head}${VaneKebab<Rest>}` // digit or symbol
      : `-${Lowercase<Head>}${VaneKebab<Rest>}`
    : `${Head}${VaneKebab<Rest>}`
  : S

/** The typed graph `defineTokens` returns: every leaf a handle, every name a literal. */
export type VaneTokens<T, Name extends string = 'vane'> = {
  readonly [K in keyof T & string]: VaneTokenOf<T[K], `${Name}-${VaneKebab<K>}`>
}

type VaneTokenOf<N, Name extends string>
  = N extends VaneContrast<infer G> ? VaneContrastToken<G, Name>
    : N extends VaneColor<infer M> ? VaneColorToken<M, Name>
      : N extends (refs: never) => infer R ? VaneDerivedTokenOf<R, Name>
        : N extends string | number ? VaneValueToken<N, Name>
          : VaneTokens<N, Name>

type VaneDerivedTokenOf<R, Name extends string>
  = R extends VaneContrast<infer G> ? VaneContrastToken<G, Name>
    : R extends VaneColor<any> | VaneColorTokenAny ? VaneColorToken<'derived', Name>
      : R extends VaneValueToken<infer V, any> ? VaneValueToken<V, Name>
        : R extends VaneRefs ? VaneColorToken<'derived', Name>
          : R extends string | number ? VaneValueToken<R, Name>
            : never

// ─── Options ─────────────────────────────────────────────────────────────────

export interface VaneElevationOptions {
  /** The tint hue of the neutral ramp. */
  hue?: number
  /** The tint chroma of the neutral ramp. Defaults to 0 — pure grays. */
  chroma?: number
  /** Position → oklch lightness, per scheme. Replaces the perceptual default entirely. */
  curve?: (position: number, scheme: 'light' | 'dark') => number
}

export interface VaneTokensOptions<T = unknown, Prefix extends string = string> {
  /** The custom-property prefix: `--vane-*` by default. */
  prefix?: Prefix
  elevation?: VaneElevationOptions
  /** Standalone guarantees over pairings the graph doesn't own ([dux-spec-tokens.md §5]). */
  checks?: (refs: VaneTokens<T, Prefix>) => readonly VaneCheck[]
}

export interface VaneCheck {
  readonly kind: 'textContrast'
  /** WCAG 2 level shorthands. */
  aa: () => VaneCheck
  aaa: () => VaneCheck
  /** An explicit APCA threshold. */
  lc: (min: number) => VaneCheck
}

// ─── Theme override shapes ───────────────────────────────────────────────────

/** Build-time `theme()` accepts overrides for any token. */
export type VaneThemeOverrides<T> = {
  [K in keyof T]?: T[K] extends VaneColorToken<any, any> | VaneContrastToken<any, any>
    ? VaneColor<any> | string
    : T[K] extends VaneValueToken<any, any>
      ? string | number
      : VaneThemeOverrides<T[K]>
}

type VaneHasLive<N>
  = N extends VaneColorToken<infer M, any> ? (M extends 'live' ? true : false)
    : N extends VaneContrastToken<any, any> | VaneValueToken<any, any> ? false
      : N extends object ? (true extends VaneHasLive<N[keyof N]> ? true : false)
        : false

/**
 * Runtime `applyTheme` accepts **live tokens only** — the graph's declared
 * runtime inputs. A static, scheme, or derived key is a type error at that
 * key, because writing it could not honestly work ([dux-patterns.md §3]).
 */
export type VaneLiveOverrides<T> = {
  [K in keyof T as VaneHasLive<T[K]> extends true ? K : never]?:
  T[K] extends VaneColorToken<'live', any> ? string : VaneLiveOverrides<T[K]>
}
