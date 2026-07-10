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

import type { VaneCssValue } from '../values/types'

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

/** Anything the color helpers accept: a color value/token, a contrast pick, or a CSS color literal. */
export type VaneColorish = VaneColor<any> | VaneColorTokenAny | VaneContrast<any> | string

export type VaneModeOf<S extends VaneColorish>
  = S extends VaneContrast<infer G> ? (G extends 'checked' ? 'scheme' : 'live')
    : S extends VaneColor<infer M> ? M
      : S extends VaneColorToken<infer M, any> ? VaneValueMode<M>
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

export interface VaneTokenBase<Name extends string = string, Path extends string = string> {
  /** The emitted custom-property name: `--vane-color-brand`. */
  readonly name: `--${Name}`
  /** The reference form for interpolation: `var(--vane-color-brand)`. */
  readonly var: `var(--${Name})`
  /** The dot path in the graph: `color.brand`. */
  readonly path: Path
  /** Intent from `.describe()` at the definition site. */
  readonly description?: string
  /** The replacement named by `.deprecated()`. */
  readonly deprecated?: string
  toString: () => `var(--${Name})`
}

export interface VaneColorToken<
  M extends VaneTokenMode = VaneTokenMode,
  Name extends string = string,
  Path extends string = string,
> extends VaneTokenBase<Name, Path> {
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
  Path extends string = string,
> extends VaneTokenBase<Name, Path> {
  readonly mode: 'derived'
  readonly guarantee: G
}

export interface VaneValueToken<
  V extends string | number = string | number,
  Name extends string = string,
  M extends 'static' | 'derived' = 'static' | 'derived',
  Path extends string = string,
> extends VaneTokenBase<Name, Path> {
  readonly mode: M
  /** The resolved value — hover a token, read its answer. */
  readonly value: V
}

// ─── The graph: input shape and inferred output ──────────────────────────────

export type VaneLeafInput = VaneColor<any> | VaneContrast<any> | VaneCssValue | string | number
export type VaneDerivedResult
  = | VaneColor<any>
    | VaneContrast<any>
    | VaneColorTokenAny
    | VaneContrastToken<any, any>
    | VaneValueToken<any, any, any>
    | VaneCssValue
    | string
    | number

/**
 * The dependency-free seed accepted by `defineTokens`. Derivations live in
 * explicit `.derive()` stages, where TypeScript has the whole prior graph and
 * can therefore complete and validate every token path at the cursor.
 */
export interface VaneGraphInput {
  [token: string]: VaneLeafInput | VaneGraphInput
}

/** A nested set of tokens produced by one topological derivation stage. */
export interface VaneTokenStage {
  [token: string]: VaneDerivedResult | VaneTokenStage
}

/** Type-only marker: a stage-produced leaf is always a graph derivation. */
declare const VANE_DERIVED_DEFINITION: unique symbol

/** A type-level graph node produced by a `.derive()` stage. */
export interface VaneDerived<R> {
  readonly [VANE_DERIVED_DEFINITION]: R
}

type VaneDefinitionLeaf = VaneLeafInput | VaneDerived<unknown>

type VaneMarkDerived<S> = {
  [K in keyof S]: S[K] extends VaneDerivedResult
    ? VaneDerived<S[K]>
    : S[K] extends object ? VaneMarkDerived<S[K]> : never
}

type VaneMergeNode<A, B>
  = A extends VaneDefinitionLeaf ? B
    : B extends VaneDefinitionLeaf ? B
      : A extends object
        ? B extends object ? VaneMergeGraph<A, B> : B
        : B

type VaneMergeGraph<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? K extends keyof A ? VaneMergeNode<A[K], B[K]> : B[K]
    : K extends keyof A ? A[K] : never
}

type VanePath<Prefix extends string, Key extends string>
  = Prefix extends '' ? Key : `${Prefix}.${Key}`

/** Every path at which two independently authored graphs both own a token. */
type VaneDuplicatePaths<A, B, Prefix extends string = ''> = {
  [K in keyof A & keyof B & string]: A[K] extends VaneDefinitionLeaf
    ? VanePath<Prefix, K>
    : B[K] extends VaneDefinitionLeaf
      ? VanePath<Prefix, K>
      : A[K] extends object
        ? B[K] extends object
          ? VaneDuplicatePaths<A[K], B[K], VanePath<Prefix, K>>
          : VanePath<Prefix, K>
        : VanePath<Prefix, K>
}[keyof A & keyof B & string]

/**
 * A readable, cursor-local composition error. The impossible property makes
 * TypeScript print every colliding dot path at the `.compose(module)` call.
 */
type VaneCompositionGuard<A, B>
  = [VaneDuplicatePaths<A, B>] extends [never]
    ? unknown
    : {
        readonly [K in `Token module duplicates an existing token: ${VaneDuplicatePaths<A, B>}`]: never
      }

/**
 * Let a stage reopen existing groups, but reject an existing leaf at the exact
 * returned key. The recursive intersection keeps TypeScript's diagnostic on
 * the typo/duplicate instead of collapsing into an overload wall.
 */
type VaneAddition<G, S> = {
  [K in keyof S]: K extends keyof G
    ? G[K] extends VaneDefinitionLeaf
      ? never
      : S[K] extends VaneDerivedResult
        ? never
        : S[K] extends object
          ? VaneAddition<G[K], S[K]>
          : never
    : S[K]
}

/**
 * A topological token definition. Each `.derive()` callback sees the exact
 * graph accumulated by earlier stages; its own output becomes visible only to
 * the next stage. `.build()` resolves and emits the finished graph once.
 */
export interface VaneTokenBuilder<G extends object> {
  /**
   * Compose an independently buildable token module into this definition.
   * Modules retain their internal stage order; later derivations see the
   * exact combined graph. Duplicate paths fail at this call.
   */
  compose: <const M extends object>(
    module: VaneTokenBuilder<M> & VaneCompositionGuard<G, M>,
  ) => VaneTokenBuilder<VaneMergeGraph<G, M>>
  derive: <const S extends VaneTokenStage>(
    stage: (tokens: VaneTokens<G, string>) => S & VaneAddition<G, S>,
  ) => VaneTokenBuilder<VaneMergeGraph<G, VaneMarkDerived<S>>>
  build: <Prefix extends string = 'vane'>(
    options?: VaneTokensOptions<G, Prefix>,
  ) => VaneTokens<G, Prefix>
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
declare const VANE_RESOLVED_TOKENS: unique symbol

export interface VaneResolvedTokens {
  readonly [VANE_RESOLVED_TOKENS]: true
}

export type VaneTokens<T, Name extends string = 'vane'> = VaneResolvedTokens & VaneTokenGroup<T, Name, ''>

type VaneTokenGroup<T, Name extends string, Path extends string> = {
  readonly [K in keyof T & string]: VaneTokenOf<T[K], `${Name}-${VaneKebab<K>}`, Path extends '' ? K : `${Path}.${K}`>
}

type VaneTokenOf<N, Name extends string, Path extends string>
  = N extends VaneDerived<infer R> ? VaneDerivedTokenOf<R, Name, Path>
    : N extends VaneContrast<infer G> ? VaneContrastToken<G, Name, Path>
      : N extends VaneColor<infer M> ? VaneColorToken<M, Name, Path>
        : N extends VaneCssValue<infer Css> ? VaneValueToken<Css, Name, 'static', Path>
          : N extends string | number ? VaneValueToken<N, Name, 'static', Path>
            : VaneTokenGroup<N, Name, Path>

type VaneDerivedTokenOf<R, Name extends string, Path extends string>
  = R extends VaneContrast<infer G> ? VaneContrastToken<G, Name, Path>
    : R extends VaneContrastToken<infer G, any, any> ? VaneContrastToken<G, Name, Path>
      : R extends VaneColor<any> | VaneColorTokenAny ? VaneColorToken<'derived', Name, Path>
        : R extends VaneValueToken<infer V, any, any, any> ? VaneValueToken<V, Name, 'derived', Path>
          : R extends VaneCssValue<infer Css> ? VaneValueToken<Css, Name, 'derived', Path>
            : R extends string | number ? VaneValueToken<R, Name, 'derived', Path>
              : never

// ─── Options ─────────────────────────────────────────────────────────────────

export interface VaneTokensOptions<T = unknown, Prefix extends string = string> {
  /** The custom-property prefix: `--vane-*` by default. */
  prefix?: Prefix
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
