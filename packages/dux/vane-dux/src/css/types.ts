/**
 * The public authoring types: type the names ([dux-patterns.md §2]). Property
 * names are csstype's camelCase; condition names flow in as a literal union
 * from the system; selector and at-rule keys are template-literal patterns, so
 * anything that is neither a property, a condition, a selector, nor an at-rule
 * errors at the offending key. Value *grammar* belongs to the build-time
 * parser, not to template-literal types.
 */

import type * as CSS from 'csstype'
import type { VaneColor } from '../tokens/types'
import type { VaneCssValue, VaneTokenInput } from '../values/types'

type CSSTypeProperties = CSS.Properties<number | (string & {})>

export type VaneCssPropertyName = keyof CSSTypeProperties

export type VanePropertyAliasMap = Readonly<Record<string, VaneCssPropertyName>>
export type VanePropertyAliasMode = 'both' | 'aliases-only'

/**
 * Anything carrying a `var()` reference — token handles and ports. Ports carry
 * the default in the reference (`var(--name, 0)`); tokens don't (`var(--name)`).
 * Both satisfy this structural type, so style values accept either.
 */
export interface VaneVarReference {
  readonly var: `var(--${string})`
}

/**
 * One declared value: the property's csstype grammar, a token handle, or a
 * color-helper expression (`alpha(t.color.ink, 0.42)`). Open-valued by
 * design — the token map guides, it never gates.
 */
export type VaneStyleValue<P extends VaneCssPropertyName = VaneCssPropertyName>
  = CSSTypeProperties[P] | VaneVarReference | VaneTokenInput | VaneColor<any> | VaneCssValue

/** A property-first condition map: `color: { base: …, hover: … }`. */
export type VanePropertyArms<C extends string, V> = { base?: V } & { [K in C]?: V }

/**
 * What a template-pattern key may hold. Deliberately wider than the nested
 * rule alone: a computed key — `` [`${button} + ${button}`] `` — types as a
 * plain string index, and TypeScript then requires every pattern signature to
 * accept the whole object's value union. Literal keys stay fully checked (a
 * malformed nested rule still errors inside); the rest is the build
 * validator's job, which sees every key anyway.
 */
export type VaneRuleEntry<C extends string>
  = | VaneNestedRule<C>
    | VaneRuleScalar

type VaneRuleScalar
  = | string
    | number
    | VaneVarReference
    | VaneTokenInput
    | VaneColor<any>
    | VaneCssValue
    | readonly (string | number | VaneVarReference | VaneTokenInput | VaneCssValue)[]
    | undefined

/** Custom properties are plain keys; the escape audit sees them, `vars` ceremony doesn't exist. */
export interface VaneCustomProperties<C extends string> {
  [customProperty: `--${string}`]: VaneRuleEntry<C>
}

export type VaneDeclarations<C extends string> = {
  [P in VaneCssPropertyName]?:
    | VaneStyleValue<P>
    | readonly (CSSTypeProperties[P] | VaneVarReference | VaneTokenInput)[]
    | VanePropertyArms<C, VaneStyleValue<P>>
} & VaneCustomProperties<C>

/** Selector keys: `&` anywhere, or an implicit-descendant form, native-nesting style. */
export interface VaneSelectorRules<C extends string> {
  [selector: `${string}&${string}`]: VaneRuleEntry<C>
  [selector: `.${string}`]: VaneRuleEntry<C>
  [selector: `#${string}`]: VaneRuleEntry<C>
  [selector: `[${string}`]: VaneRuleEntry<C>
  [selector: `:${string}`]: VaneRuleEntry<C>
  [selector: `*${string}`]: VaneRuleEntry<C>
  [selector: `>${string}`]: VaneRuleEntry<C>
  [selector: `+${string}`]: VaneRuleEntry<C>
  [selector: `~${string}`]: VaneRuleEntry<C>
  [selector: `${string} ${string}`]: VaneRuleEntry<C>
}

export interface VaneAtRules<C extends string> {
  [atRule: `@media ${string}`]: VaneRuleEntry<C>
  [atRule: `@supports ${string}`]: VaneRuleEntry<C>
  [atRule: `@container ${string}`]: VaneRuleEntry<C>
  '@starting-style'?: VaneNestedRule<C>
}

/** The recursive rule body: declarations, bare condition keys, selectors, at-rules. */
export type VaneNestedRule<C extends string>
  = VaneDeclarations<C>
    & { [K in C]?: VaneNestedRule<C> }
    & VaneSelectorRules<C>
    & VaneAtRules<C>

/** What `css()` takes: a rule, optionally re-homed to another declared layer. */
export type VaneStyleRule<C extends string, L extends string> = VaneNestedRule<C> & { layer?: L }

// Alias declarations layer onto the stable standard grammar. Keeping the
// alias map shallow avoids cloning csstype's 870-property recursive graph for
// every engine/plugin chain while preserving exact keys and target values.
type VaneAliasDeclarations<
  C extends string,
  Aliases extends VanePropertyAliasMap,
> = {
  [Alias in keyof Aliases]?: Aliases[Alias] extends VaneCssPropertyName
    ? | VaneStyleValue<Aliases[Alias]>
    | readonly (CSSTypeProperties[Aliases[Alias]] | VaneVarReference | VaneTokenInput)[]
    | VanePropertyArms<C, VaneStyleValue<Aliases[Alias]>>
    : never
}

type VaneAliasedStyleRule<C extends string, L extends string, Aliases extends VanePropertyAliasMap>
  = VaneAliasedNestedRule<C, Aliases> & { layer?: L }

type VaneStrictAliasedStyleRule<C extends string, L extends string, Aliases extends VanePropertyAliasMap>
  = VaneStrictAliasedNestedRule<C, Aliases> & { layer?: L }

type VaneAliasedRuleEntry<C extends string, Aliases extends VanePropertyAliasMap>
  = VaneAliasedNestedRule<C, Aliases> | VaneRuleScalar

type VaneStrictAliasedRuleEntry<C extends string, Aliases extends VanePropertyAliasMap>
  = VaneStrictAliasedNestedRule<C, Aliases> | VaneRuleScalar

interface VaneAliasedSelectorRules<C extends string, Aliases extends VanePropertyAliasMap> {
  [selector: `${string}&${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [selector: `.${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [selector: `#${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [selector: `[${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [selector: `:${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [selector: `*${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [selector: `>${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [selector: `+${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [selector: `~${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [selector: `${string} ${string}`]: VaneAliasedRuleEntry<C, Aliases>
}

interface VaneStrictAliasedSelectorRules<C extends string, Aliases extends VanePropertyAliasMap> {
  [selector: `${string}&${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [selector: `.${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [selector: `#${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [selector: `[${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [selector: `:${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [selector: `*${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [selector: `>${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [selector: `+${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [selector: `~${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [selector: `${string} ${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
}

type VaneAliasedAtRules<C extends string, Aliases extends VanePropertyAliasMap> = {
  [atRule: `@media ${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [atRule: `@supports ${string}`]: VaneAliasedRuleEntry<C, Aliases>
  [atRule: `@container ${string}`]: VaneAliasedRuleEntry<C, Aliases>
} & { '@starting-style'?: VaneAliasedNestedRule<C, Aliases> }

type VaneStrictAliasedAtRules<C extends string, Aliases extends VanePropertyAliasMap> = {
  [atRule: `@media ${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [atRule: `@supports ${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
  [atRule: `@container ${string}`]: VaneStrictAliasedRuleEntry<C, Aliases>
} & { '@starting-style'?: VaneStrictAliasedNestedRule<C, Aliases> }

type VaneAliasedNestedRule<C extends string, Aliases extends VanePropertyAliasMap>
  = VaneDeclarations<C>
    & VaneAliasDeclarations<C, Aliases>
    & { [K in C]?: VaneAliasedNestedRule<C, Aliases> }
    & VaneAliasedSelectorRules<C, Aliases>
    & VaneAliasedAtRules<C, Aliases>

type VaneStrictAliasedNestedRule<C extends string, Aliases extends VanePropertyAliasMap>
  = Omit<VaneDeclarations<C>, Aliases[keyof Aliases]>
    & VaneAliasDeclarations<C, Aliases>
    & { [K in C]?: VaneStrictAliasedNestedRule<C, Aliases> }
    & VaneStrictAliasedSelectorRules<C, Aliases>
    & VaneStrictAliasedAtRules<C, Aliases>

type VaneAliasRuleKeyGuard<Rule, C extends string, L extends string, Aliases extends VanePropertyAliasMap>
  = Exclude<keyof Rule, keyof VaneAliasedStyleRule<C, L, Aliases>> extends never
    ? unknown
    : { [P in Exclude<keyof Rule, keyof VaneAliasedStyleRule<C, L, Aliases>>]?: never }

// ─── Keyframes and font faces ────────────────────────────────────────────────

/**
 * A keyframe step is declaration-only: conditions and selectors are
 * semantically meaningless inside one, so the grammar refuses them at the key.
 */
export type VaneKeyframeStep = {
  [P in VaneCssPropertyName]?: VaneStyleValue<P> | readonly (CSSTypeProperties[P] | VaneVarReference | VaneTokenInput)[]
} & {
  [customProperty: `--${string}`]: string | number | VaneVarReference
}

export type VaneKeyframeTime = 'from' | 'to' | `${string}%`

export type VaneKeyframesRule = {
  [T in VaneKeyframeTime]?: VaneKeyframeStep
}

export type VaneFontFaceRule
  = Omit<CSS.AtRule.FontFaceFallback, 'src'> & Required<Pick<CSS.AtRule.FontFaceFallback, 'src'>>

// ─── The bound authoring functions ───────────────────────────────────────────

export type VaneRawValue = string | number | VaneVarReference | VaneTokenInput | VaneColor<any> | VaneCssValue

interface VaneCssMembers<C extends string, L extends string> {
  /** Full platform-property lane, even when the primary alias policy is aliases-only. */
  standard: (rule: VaneStyleRule<C, L>, debugId?: string) => string
  /** The escape hatch is CSS itself: parsed, validated, scoped under the class ([§8]). */
  raw: (strings: TemplateStringsArray, ...values: VaneRawValue[]) => string
}

export interface VaneCssFunction<C extends string, L extends string> extends VaneCssMembers<C, L> {
  /** The style unit: a scoped class whose rules compile away ([dux-spec-css.md §2]). */
  (rule: VaneStyleRule<C, L>, debugId?: string): string
}

/** Alias-aware lane installed only by the optional property-alias plugin. */
export interface VanePropertyAliasCssFunction<
  C extends string,
  L extends string,
  Aliases extends VanePropertyAliasMap,
> extends VaneCssMembers<C, L> {
  <const Rule extends VaneAliasedStyleRule<C, L, Aliases>>(
    rule: Rule
      & VaneAliasRuleKeyGuard<Rule, C, L, Aliases>,
    debugId?: string,
  ): string
}

/** Strict primary lane: aliased target spellings disappear from completion. */
export interface VaneStrictPropertyAliasCssFunction<
  C extends string,
  L extends string,
  Aliases extends VanePropertyAliasMap,
> extends VaneCssMembers<C, L> {
  (
    rule: VaneStrictAliasedStyleRule<C, L, Aliases>,
    debugId?: string,
  ): string
}

export type VaneGlobalCssFunction<C extends string, L extends string>
  = (selector: string, rule: VaneStyleRule<C, L>) => void

export type VaneKeyframesFunction = (steps: VaneKeyframesRule, debugId?: string) => string

export type VaneFontFaceFunction = (rule: VaneFontFaceRule, debugId?: string) => string
