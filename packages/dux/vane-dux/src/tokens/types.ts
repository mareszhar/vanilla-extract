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

import type { VaneAxisDefinitions, VaneAxisModeName } from '../system/axes'
import type {
  VaneCssDataType,
  VaneCssValue,
  VaneDataTypeOf,
  VaneSelfValue,
  VaneValue,
} from '../values/types'

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

// ─── Authoring color values ──────────────────────────────────────────────────

/** Anything the color helpers accept: a color value/token, a contrast pick, or a CSS color literal. */
export type VaneColorish
  = | VaneColor<any>
    | VaneAuthoredColor
    | VaneColorTokenAny
    | VaneColorTokenHandle
    | VaneContrast<any>
    | string

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
export interface VaneColor<out M extends VaneColorMode = VaneColorMode> extends VaneSelfValue<'color'> {
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
  mix: (other: VaneColorish, amount: number) => VaneInterpolatedColor<VaneColorMode>
}

export type VaneColorInterpolationSpace
  = | 'srgb' | 'srgb-linear' | 'display-p3' | 'display-p3-linear' | 'a98-rgb' | 'prophoto-rgb' | 'rec2020'
    | 'lab' | 'oklab' | 'xyz' | 'xyz-d50' | 'xyz-d65' | 'hsl' | 'hwb' | 'lch' | 'oklch'
    | `--${string}`
export type VanePolarColorSpace = 'hsl' | 'hwb' | 'lch' | 'oklch'
export type VaneHueInterpolation = 'shorter' | 'longer' | 'increasing' | 'decreasing'

/** Only interpolation-producing operations expose CSS's `in <color-space>` choice. */
export interface VaneInterpolatedColor<out M extends VaneColorMode = VaneColorMode> extends VaneColor<M> {
  in: {
    (space: VaneColorInterpolationSpace): VaneColor<M>
    (space: VanePolarColorSpace, options: { hue: VaneHueInterpolation }): VaneColor<M>
  }
}

/** Canonical engine color value: expression/data type only, with no token liveness mode. */
export interface VaneAuthoredColor extends VaneSelfValue<'color'> {
  alpha: (amount: number) => VaneAuthoredColor
  lighten: (amount: number) => VaneAuthoredColor
  darken: (amount: number) => VaneAuthoredColor
  saturate: (amount: number) => VaneAuthoredColor
  desaturate: (amount: number) => VaneAuthoredColor
  rotate: (degrees: number) => VaneAuthoredColor
  mix: (other: VaneColorish, amount: number) => VaneAuthoredInterpolatedColor
}

export interface VaneAuthoredInterpolatedColor extends VaneAuthoredColor {
  in: {
    (space: VaneColorInterpolationSpace): VaneAuthoredColor
    (space: VanePolarColorSpace, options: { hue: VaneHueInterpolation }): VaneAuthoredColor
  }
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
  mix: (other: VaneColorish, amount: number) => VaneInterpolatedColor<VaneColorMode>
}

type VaneColorTokenAny = VaneColorToken<any, string>

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

// ─── Canonical token traits (Phase 3) ──────────────────────────────────────

export type VaneTokenReference = 'val' | 'var'

export interface VaneTokenPolicy<
  Reference extends VaneTokenReference = VaneTokenReference,
  Emit extends boolean = boolean,
> {
  readonly reference: Reference
  readonly emit: Emit
}

export type VaneDefaultTokenPolicy = VaneTokenPolicy<'var', true>

export interface VaneTokenRegistration<Val = unknown> {
  /** CSS Properties and Values API syntax; inferred from the token type when omitted. */
  readonly syntax?: string
  readonly inherits?: boolean
  readonly initialVal?: Val
}

export type VaneTokenDeprecation = string | {
  readonly reason?: string
  readonly use?: string
}

export type VaneTokenMetadataValue
  = | string
    | number
    | boolean
    | null
    | readonly VaneTokenMetadataValue[]
    | { readonly [key: string]: VaneTokenMetadataValue }

export type VaneTokenMetadata = Readonly<Record<string, VaneTokenMetadataValue>>

export interface VaneStandardSchemaIssue {
  readonly message: string
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[]
}

/** The synchronous portion of Standard Schema v1 used at CSS write boundaries. */
export interface VaneStandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: Input,
    ) => { readonly value: Output, readonly issues?: undefined }
      | { readonly issues: readonly VaneStandardSchemaIssue[] }
      | PromiseLike<unknown>
  }
}

export type VaneRuntimeValidationMode = false | 'dev' | 'always'
export type VaneInvalidRuntimeValuePolicy = 'throw' | 'fallback' | 'omit'

export interface VaneTokenValidation<Input = unknown, Output = Input> {
  /** Stable lookup key required when this schema crosses the build/app boundary. */
  readonly id: string
  readonly schema?: VaneStandardSchemaV1<Input, Output>
  readonly runtime?: VaneRuntimeValidationMode
  readonly onInvalid?: VaneInvalidRuntimeValuePolicy
  /** Required when onInvalid is 'fallback'; it passes universal data-type checks. */
  readonly fallback?: Output
}

export interface VaneTokenCase<
  When extends Readonly<Record<string, string>> = Readonly<Record<string, string>>,
  Val = unknown,
> {
  readonly when: When
  readonly val: Val | null
}

export interface VaneTokenConfig<
  Val = unknown,
  Axes extends Readonly<Record<string, Readonly<Record<string, unknown | null>>>> = Readonly<Record<string, Readonly<Record<string, unknown | null>>>>,
  Cases extends readonly VaneTokenCase[] = readonly VaneTokenCase[],
> {
  readonly val?: Val
  readonly reference?: VaneTokenReference
  readonly emit?: boolean
  readonly mutable?: boolean
  readonly register?: boolean | VaneTokenRegistration<Val>
  readonly axes?: Axes
  readonly cases?: Cases
  readonly description?: string
  readonly deprecated?: VaneTokenDeprecation
  readonly metadata?: VaneTokenMetadata
  /** Optional synchronous Standard Schema policy for runtime-bound setters. */
  readonly validate?: VaneTokenValidation
}

/** Runtime brand for an advanced token definition. Ordinary group keys stay unreserved. */
export const VANE_CONFIGURED_TOKEN = Symbol.for('vane.configuredToken')

export interface VaneConfiguredToken<
  Config extends object = VaneTokenConfig,
  Type extends VaneCssDataType = VaneCssDataType,
> {
  readonly [VANE_CONFIGURED_TOKEN]: true
  readonly config: Config
  readonly type: Type
}

type VaneAxisValues<Axes extends VaneAxisDefinitions> = {
  readonly [Axis in keyof Axes]?: Readonly<Partial<Record<VaneAxisModeName<Axes[Axis]>, unknown | null>>>
}

type VaneCaseAddress<Axes extends VaneAxisDefinitions> = {
  readonly [Axis in keyof Axes]?: VaneAxisModeName<Axes[Axis]>
}

/** An independent vocabulary surface keeps literal values intact while excess keys fail locally. */
type VaneTokenAxisInput<Axes extends VaneAxisDefinitions>
  = [keyof Axes] extends [never]
    ? { readonly axes?: never, readonly cases?: never }
    : {
        readonly axes?: VaneAxisValues<Axes>
        readonly cases?: readonly {
          readonly when: VaneCaseAddress<Axes>
          readonly val: unknown | null
        }[]
      }

type VaneTokenTraitDiagnostic<Config>
  = Config extends { readonly mutable: true } | { readonly axes: object } | { readonly cases: readonly unknown[] }
    ? (Config extends { readonly reference: infer Reference }
      ? Reference extends 'var' ? unknown : { readonly 'mutable/axes/cases require reference: \'var\'': never }
      : unknown)
    & (Config extends { readonly emit: infer Emit }
      ? Emit extends true ? unknown : { readonly 'mutable/axes/cases require emit: true': never }
      : unknown)
    : unknown

type VaneAxesVocabularyGuard<Configured, Axes extends VaneAxisDefinitions>
  = Configured extends object ? {
    readonly [Axis in keyof Configured]: Axis extends keyof Axes
      ? Configured[Axis] extends object ? {
        readonly [Mode in keyof Configured[Axis]]: Mode extends VaneAxisModeName<Axes[Axis]>
          ? Configured[Axis][Mode]
          : never
      } : never
      : never
  } : never

type VaneCaseVocabularyGuard<When, Axes extends VaneAxisDefinitions>
  = When extends object ? {
    readonly [Axis in keyof When]: Axis extends keyof Axes
      ? When[Axis] extends VaneAxisModeName<Axes[Axis]> ? When[Axis] : never
      : never
  } : never

type VaneTokenVocabularyGuard<Config, Axes extends VaneAxisDefinitions>
  = (Config extends { readonly axes: infer Configured }
    ? { readonly axes: VaneAxesVocabularyGuard<Configured, Axes> }
    : unknown)
  & (Config extends { readonly cases: infer Cases extends readonly unknown[] }
    ? {
        readonly cases: {
          readonly [Index in keyof Cases]: Cases[Index] extends { readonly when: infer When }
            ? Omit<Cases[Index], 'when'> & { readonly when: VaneCaseVocabularyGuard<When, Axes> }
            : never
        }
      }
    : unknown)

export type VaneTokenInitialVal<Type extends VaneCssDataType>
  = | VaneValue<Type>
    | string
    | (Type extends 'number' | 'integer' | 'percentage' | 'number-percentage' ? number : never)

type VaneNoDefaultTokenConfig<Type extends VaneCssDataType>
  = Omit<VaneTokenConfig<never>, 'val' | 'register'> & {
    readonly register?: boolean | VaneTokenRegistration<VaneTokenInitialVal<Type>>
  }

export interface VaneTypedNoDefaultTokenFactory<
  Type extends VaneCssDataType,
  Axes extends VaneAxisDefinitions = Record<never, never>,
> {
  (): VaneConfiguredToken<Record<never, never> & VaneTokenConfig<never>, Type>
  <const Config extends VaneNoDefaultTokenConfig<Type>>(
    config: Config
      & VaneTokenAxisInput<Axes>
      & NoInfer<VaneTokenVocabularyGuard<Config, Axes> & VaneTokenTraitDiagnostic<Config>>,
  ): VaneConfiguredToken<Config, Type>
}

type VaneConfiguredType<Config extends object>
  = Config extends { readonly val: infer Val } ? VaneDataTypeOf<Val>
    : Config extends { readonly axes: infer Axes extends object }
      ? VaneDataTypeOf<Exclude<Axes[keyof Axes] extends infer Modes
        ? Modes extends object ? Modes[keyof Modes] : never
        : never, null>>
      : Config extends { readonly cases: readonly (infer Case)[] }
        ? Case extends { readonly val: infer Val } ? VaneDataTypeOf<Exclude<Val, null>> : 'unknown'
        : 'unknown'

type VaneDerivedModes<Axis>
  = Axis extends { readonly derive: infer Derive } ? Derive : Record<never, never>

type VaneDerivedAxis<Configured extends object, Axis> = Configured & {
  readonly [Mode in Exclude<keyof VaneDerivedModes<Axis>, keyof Configured>]:
  VaneDerivedModes<Axis>[Mode] extends (...args: any[]) => infer Result ? Result : never
}

type VaneAxisWithDerivations<Configured, Axis>
  = Configured extends object ? VaneDerivedAxis<Configured, Axis> : Configured

type VaneApplyAxisDerivations<Configured, Axes extends VaneAxisDefinitions>
  = Configured extends object ? {
    readonly [Axis in keyof Configured]: Axis extends keyof Axes
      ? VaneAxisWithDerivations<Configured[Axis], Axes[Axis]>
      : Configured[Axis]
  } : Configured

type VaneMissingAxisDerivations<Configured, Axes extends VaneAxisDefinitions>
  = Configured extends object ? {
    [Axis in keyof Configured]: Axis extends keyof Axes
      ? Configured[Axis] extends object
        ? Exclude<keyof VaneDerivedModes<Axes[Axis]>, keyof Configured[Axis]>
        : never
      : never
  }[keyof Configured] : never

type VaneConfigWithAxisDerivations<Config extends object, Axes extends VaneAxisDefinitions>
  = Config extends { readonly axes: infer ConfiguredAxes }
    ? [VaneMissingAxisDerivations<ConfiguredAxes, Axes>] extends [never]
        ? Config
        : Omit<Config, 'axes'> & { readonly axes: VaneApplyAxisDerivations<ConfiguredAxes, Axes> }
    : Config

export interface VaneTokenFactory<
  Axes extends VaneAxisDefinitions = Record<never, never>,
> {
  <const Config extends VaneTokenConfig>(
    config: Config
      & VaneTokenAxisInput<Axes>
      & NoInfer<VaneTokenVocabularyGuard<Config, Axes> & VaneTokenTraitDiagnostic<Config>>,
  ): VaneConfiguredToken<VaneConfigWithAxisDerivations<Config, Axes>, VaneConfiguredType<Config>>

  readonly unknown: VaneTypedNoDefaultTokenFactory<'unknown', Axes>
  readonly number: VaneTypedNoDefaultTokenFactory<'number', Axes>
  readonly integer: VaneTypedNoDefaultTokenFactory<'integer', Axes>
  readonly percentage: VaneTypedNoDefaultTokenFactory<'percentage', Axes>
  readonly numberPercentage: VaneTypedNoDefaultTokenFactory<'number-percentage', Axes>
  readonly length: VaneTypedNoDefaultTokenFactory<'length', Axes>
  readonly lengthPercentage: VaneTypedNoDefaultTokenFactory<'length-percentage', Axes>
  readonly angle: VaneTypedNoDefaultTokenFactory<'angle', Axes>
  readonly time: VaneTypedNoDefaultTokenFactory<'time', Axes>
  readonly frequency: VaneTypedNoDefaultTokenFactory<'frequency', Axes>
  readonly resolution: VaneTypedNoDefaultTokenFactory<'resolution', Axes>
  readonly flex: VaneTypedNoDefaultTokenFactory<'flex', Axes>
  readonly color: VaneTypedNoDefaultTokenFactory<'color', Axes>
  readonly image: VaneTypedNoDefaultTokenFactory<'image', Axes>
  readonly position: VaneTypedNoDefaultTokenFactory<'position', Axes>
  readonly easingFunction: VaneTypedNoDefaultTokenFactory<'easing-function', Axes>
  readonly transformFunction: VaneTypedNoDefaultTokenFactory<'transform-function', Axes>
  readonly transformList: VaneTypedNoDefaultTokenFactory<'transform-list', Axes>
  readonly customIdent: VaneTypedNoDefaultTokenFactory<'custom-ident', Axes>
  readonly dashedIdent: VaneTypedNoDefaultTokenFactory<'dashed-ident', Axes>
  readonly string: VaneTypedNoDefaultTokenFactory<'string', Axes>
  readonly url: VaneTypedNoDefaultTokenFactory<'url', Axes>
}

export type VaneTokenFallback<Type extends VaneCssDataType>
  = | VaneValue<Type>
    | string
    | (Type extends 'number' | 'integer' | 'percentage' | 'number-percentage' ? number : never)

declare const VANE_BRANCH_MUTABILITY: unique symbol

export interface VaneTokenBranchHandle<Val = unknown, Mutable extends boolean = boolean> {
  /** Type-only owner trait used to keep runtime tuple batches honest. */
  readonly [VANE_BRANCH_MUTABILITY]: Mutable
  /** Authored branch value; undefined denotes an explicit no-default reservation. */
  readonly $val: VaneResolvedTokenVal<Val>
  readonly $description?: string
  readonly $metadata?: VaneTokenMetadata
  toString: () => string
}

type VaneAxisHandles<Axes, Mutable extends boolean> = Axes extends object ? {
  readonly [Axis in keyof Axes]: Axes[Axis] extends object ? {
    readonly [Mode in keyof Axes[Axis]]: VaneTokenBranchHandle<Axes[Axis][Mode], Mutable>
  } : never
} : Record<never, never>

type VaneCaseWhen<Cases> = Cases extends readonly (infer Case)[]
  ? Case extends { readonly when: infer When } ? When : never
  : never

type VaneCaseVal<Cases, _When> = Cases extends readonly (infer Case)[]
  ? Case extends { readonly val: infer Val } ? Val : never
  : never

type VaneConfiguredAxes<Node> = Node extends VaneConfiguredToken<infer Config, any>
  ? Config extends { readonly axes: infer Axes } ? Axes : Record<never, never>
  : Record<never, never>

type VaneConfiguredCases<Node> = Node extends VaneConfiguredToken<infer Config, any>
  ? Config extends { readonly cases: infer Cases } ? Cases : readonly []
  : readonly []

type VaneConfiguredVal<Node> = Node extends VaneConfiguredToken<infer Config, any>
  ? Config extends { readonly val: infer Val } ? Val : undefined
  : Node extends null ? undefined : Node

type VaneConfiguredReference<Node, Policy extends VaneTokenPolicy>
  = Node extends null ? 'var'
    : Node extends VaneConfiguredToken<infer Config, any>
      ? Config extends { readonly reference: infer Reference extends VaneTokenReference } ? Reference
        : Config extends { readonly mutable: true } | { readonly axes: object } | { readonly cases: readonly unknown[] } ? 'var'
          : 'val' extends Policy['reference'] ? Policy['reference'] : 'var'
      : Policy['reference']

type VaneConfiguredEmit<Node, Policy extends VaneTokenPolicy>
  = Node extends null ? false
    : Node extends VaneConfiguredToken<infer Config, any>
      ? Config extends { readonly emit: infer Emit extends boolean } ? Emit
        : Config extends { readonly mutable: true } | { readonly axes: object } | { readonly cases: readonly unknown[] } ? true
          : Config extends { readonly val: unknown } ? Policy['emit'] : false
      : Policy['emit']

type VaneConfiguredMutable<Node> = Node extends VaneConfiguredToken<infer Config, any>
  ? Config extends { readonly mutable: true } ? true : false
  : false

type VaneConfiguredDescription<Node> = Node extends VaneConfiguredToken<infer Config, any>
  ? Config extends { readonly description: infer Description extends string } ? Description : undefined
  : undefined

export type VaneResolvedTokenVal<Val>
  = Val extends null | undefined ? undefined
    : Val extends VaneCssValue<infer Css> ? Css
      : Val extends string | number ? Val
        : string

/** Canonical plane-neutral public-property handle. No legacy mode vocabulary leaks here. */
export interface VaneTokenHandle<
  Val = unknown,
  Name extends string = string,
  Path extends string = string,
  Type extends VaneCssDataType = VaneCssDataType,
  Reference extends VaneTokenReference = VaneTokenReference,
  Emit extends boolean = boolean,
  Mutable extends boolean = boolean,
  Axes = Record<never, never>,
  Cases = readonly [],
  Description extends string | undefined = string | undefined,
> {
  readonly $name: `--${Name}`
  readonly $val: VaneResolvedTokenVal<Val>
  readonly $var: (fallback?: VaneTokenFallback<Type>) => `var(--${Name})` | `var(--${Name}, ${string})`
  readonly $path: Path
  readonly $type: Type
  readonly $reference: Reference
  readonly $emit: Emit
  readonly $mutable: Mutable
  readonly $description: Description
  readonly $deprecated?: string
  readonly $metadata?: VaneTokenMetadata
  readonly $register?: boolean | VaneTokenRegistration<Val>
  readonly $validate?: VaneTokenValidation
  readonly $axes: VaneAxisHandles<Axes, Mutable>
  readonly $case: (
    when: VaneCaseWhen<Cases>,
  ) => VaneTokenBranchHandle<VaneCaseVal<Cases, VaneCaseWhen<Cases>>, Mutable>
  toString: () => string
}

export type VaneTokenHandleAny = VaneTokenHandle<any, string, string, any, any, any, any, any, any, any>
export type VaneColorTokenHandle = VaneTokenHandle<any, string, string, 'color', any, any, any, any, any, any>

// ─── The graph: input shape and inferred output ──────────────────────────────

export type VaneLeafInput
  = | VaneColor<any>
    | VaneAuthoredColor
    | VaneContrast<any>
    | VaneCssValue
    | VaneConfiguredToken
    | string
    | number
    | null
export type VaneDerivedResult
  = | VaneColor<any>
    | VaneAuthoredColor
    | VaneContrast<any>
    | VaneColorTokenAny
    | VaneContrastToken<any, any>
    | VaneValueToken<any, any, any>
    | VaneTokenHandleAny
    | VaneCssValue
    | VaneConfiguredToken
    | string
    | number
    | null

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

/** Semantic engine requirement carried by an unfinished module. */
export interface VaneEngineRequirement {
  readonly protocol: number
  readonly signature: string
  readonly compatibleSignatures: readonly string[]
}

/** Emission intent retained by a module until one system finalizes it. */
export interface VaneTokenModuleOptions {
  readonly root?: string
  readonly layer?: string
}

/**
 * An unfinished, engine-bound token graph. It has structure and derivations,
 * but no prefix, custom-property names, or emitted CSS until `createSystem()`.
 */
declare const VANE_TOKEN_DEFINITION: unique symbol

export interface VaneTokenDefinition<
  G extends object,
  Policy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
> {
  /** Type-only graph carrier; runtime identity uses `Symbol.for`. */
  readonly [VANE_TOKEN_DEFINITION]: G
  /** Type-only engine token policy captured when this unfinished module was defined. */
  readonly __vaneTokenPolicy?: Policy
}

export interface VaneTokenModule<
  G extends object,
  Policy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
> extends VaneTokenDefinition<G, Policy> {
  /**
   * Compose an independently authored token module into this definition.
   * Modules retain their internal stage order; later derivations see the
   * exact combined graph. Duplicate paths fail at this call.
   */
  compose: <const M extends object>(
    module: VaneTokenDefinition<M, Policy> & VaneCompositionGuard<G, M>,
  ) => VaneTokenModule<VaneMergeGraph<G, M>, Policy>
  derive: <const S extends VaneTokenStage>(
    stage: (tokens: VaneCanonicalTokens<G, string, Policy>) => S & VaneAddition<G, S>,
  ) => VaneTokenModule<VaneMergeGraph<G, VaneMarkDerived<S>>, Policy>
}

/**
 * Transitional root-helper builder. Canonical engine modules deliberately do
 * not expose `.build()` because the finalized system is the sole name owner.
 */
export interface VaneTokenBuilder<G extends object> extends VaneTokenDefinition<G> {
  compose: <const M extends object>(
    module: VaneTokenDefinition<M> & VaneCompositionGuard<G, M>,
  ) => VaneTokenBuilder<VaneMergeGraph<G, M>>
  derive: <const S extends VaneTokenStage>(
    stage: (tokens: VaneTokens<G, string>) => S & VaneAddition<G, S>,
  ) => VaneTokenBuilder<VaneMergeGraph<G, VaneMarkDerived<S>>>
  /** @deprecated Finalize engine-bound modules with `de.createSystem()`. */
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

/** The canonical Phase-3 graph: independent traits and `$`-prefixed handle members. */
export type VaneCanonicalTokens<
  T,
  Name extends string = 'vane',
  Policy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
> = VaneResolvedTokens & VaneCanonicalTokenGroup<T, Name, '', Policy>

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

type VaneCanonicalTokenGroup<
  T,
  Name extends string,
  Path extends string,
  Policy extends VaneTokenPolicy,
> = {
  readonly [K in keyof T & string as K extends `$${string}` ? never : K]: VaneCanonicalTokenOf<
    T[K],
    `${Name}-${VaneKebab<K>}`,
    Path extends '' ? K : `${Path}.${K}`,
    Policy
  >
}

type VaneCanonicalTokenOf<
  Node,
  Name extends string,
  Path extends string,
  Policy extends VaneTokenPolicy,
> = Node extends VaneDerived<infer Result>
  ? VaneTokenHandleOf<Result, Name, Path, Policy>
  : Node extends VaneLeafInput
    ? VaneTokenHandleOf<Node, Name, Path, Policy>
    : VaneCanonicalTokenGroup<Node, Name, Path, Policy>

/** Readable resolved handle inferred from one canonical authored token node. */
export type VaneTokenHandleOf<
  Node,
  Name extends string,
  Path extends string,
  Policy extends VaneTokenPolicy,
> = VaneTokenHandle<
  VaneConfiguredVal<Node>,
  Name,
  Path,
  Node extends VaneConfiguredToken<any, infer Type> ? Type : VaneDataTypeOf<VaneConfiguredVal<Node>>,
  VaneConfiguredReference<Node, Policy>,
  VaneConfiguredEmit<Node, Policy>,
  VaneConfiguredMutable<Node>,
  VaneConfiguredAxes<Node>,
  VaneConfiguredCases<Node>,
  VaneConfiguredDescription<Node>
>

export type VaneTokensFromDefinition<SystemTokens, Definition>
  = Definition extends VaneTokenDefinition<infer Graph, any>
    ? VaneSelectionFromGraph<SystemTokens, Graph>
    : Definition

type VaneSelectionFromGraph<SystemTokens, Graph> = {
  readonly [K in keyof Graph & keyof SystemTokens as K extends `$${string}` ? never : K]:
  Graph[K] extends VaneDefinitionLeaf
    ? SystemTokens[K]
    : VaneSelectionFromGraph<SystemTokens[K], Graph[K]>
}

export type VaneNamesOf<Selection> = Selection extends VaneTokenHandle<any, infer Name, any, any, any, any, any, any, any, any>
  ? `--${Name}`
  : Selection extends object ? { readonly [K in keyof Selection]: VaneNamesOf<Selection[K]> } : never

export type VaneVarsOf<Selection> = Selection extends VaneTokenHandle<any, infer Name, any, any, any, any, any, any, any, any>
  ? `var(--${Name})`
  : Selection extends object ? { readonly [K in keyof Selection]: VaneVarsOf<Selection[K]> } : never

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

// ─── Build-time token override shapes ────────────────────────────────────────

/** Canonical `ds.tokenOverride()` accepts typed leaves from the bound graph. */
export type VaneTokenOverrides<T> = {
  [K in keyof T]?: T[K] extends VaneTokenHandleAny
    ? VaneTokenFallback<T[K]['$type']>
    : T[K] extends object
      ? VaneTokenOverrides<T[K]>
      : never
}

/** @deprecated D66 compatibility shape for the package-root `theme()` adapter. */
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
