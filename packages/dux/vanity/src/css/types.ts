/**
 * The public authoring types: type the names ([vanity-patterns.md §2]). Property
 * names are csstype's camelCase; condition names flow in as a literal union
 * from the system; selector and at-rule keys are template-literal patterns, so
 * anything that is neither a property, a condition, a selector, nor an at-rule
 * errors at the offending key. Value *grammar* belongs to the build-time
 * parser, not to template-literal types.
 */

import type * as CSS from 'csstype'
import type { VanityAuthoredColor, VanityColor } from '../tokens/types'
import type { VanityCssValue, VanityTokenInput } from '../values/types'

type CSSTypeProperties = CSS.Properties<number | (string & {})>

export type VanityCssPropertyName = keyof CSSTypeProperties

export type VanityPropertyAliasMap = Readonly<Record<string, VanityCssPropertyName>>
export type VanityPropertyAliasMode = 'both' | 'aliases-only'

/**
 * Anything carrying a `var()` reference — token handles and ports. Ports carry
 * the default in the reference (`var(--name, 0)`); tokens don't (`var(--name)`).
 * Both satisfy this structural type, so style values accept either.
 */
export interface VanityVarReference {
  readonly var: `var(--${string})`
}

/**
 * One declared value: the property's csstype grammar, a token handle, or a
 * color-helper expression (`alpha(t.color.ink, 0.42)`). Open-valued by
 * design — the token map guides, it never gates.
 */
export type VanityStyleValue<P extends VanityCssPropertyName = VanityCssPropertyName>
  = CSSTypeProperties[P] | VanityVarReference | VanityTokenInput | VanityColor<any> | VanityAuthoredColor | VanityCssValue

/** A property-first condition map: `color: { base: …, hover: … }`. */
export type VanityPropertyArms<C extends string, V> = { base?: V } & { [K in C]?: V }

/**
 * What a template-pattern key may hold. Deliberately wider than the nested
 * rule alone: a computed key — `` [`${button} + ${button}`] `` — types as a
 * plain string index, and TypeScript then requires every pattern signature to
 * accept the whole object's value union. Literal keys stay fully checked (a
 * malformed nested rule still errors inside); the rest is the build
 * validator's job, which sees every key anyway.
 */
export type VanityRuleEntry<C extends string>
  = | VanityNestedRule<C>
    | VanityRuleScalar

type VanityRuleScalar
  = | string
    | number
    | VanityVarReference
    | VanityTokenInput
    | VanityColor<any>
    | VanityAuthoredColor
    | VanityCssValue
    | readonly (string | number | VanityVarReference | VanityTokenInput | VanityAuthoredColor | VanityCssValue)[]
    | undefined

/** Custom properties are plain keys; the escape audit sees them, `vars` ceremony doesn't exist. */
export interface VanityCustomProperties<C extends string> {
  [customProperty: `--${string}`]: VanityRuleEntry<C>
}

export type VanityDeclarations<C extends string> = {
  [P in VanityCssPropertyName]?:
    | VanityStyleValue<P>
    | readonly (CSSTypeProperties[P] | VanityVarReference | VanityTokenInput)[]
    | VanityPropertyArms<C, VanityStyleValue<P>>
} & VanityCustomProperties<C>

/** Selector keys: `&` anywhere, or an implicit-descendant form, native-nesting style. */
export interface VanitySelectorRules<C extends string> {
  [selector: `${string}&${string}`]: VanityRuleEntry<C>
  [selector: `.${string}`]: VanityRuleEntry<C>
  [selector: `#${string}`]: VanityRuleEntry<C>
  [selector: `[${string}`]: VanityRuleEntry<C>
  [selector: `:${string}`]: VanityRuleEntry<C>
  [selector: `*${string}`]: VanityRuleEntry<C>
  [selector: `>${string}`]: VanityRuleEntry<C>
  [selector: `+${string}`]: VanityRuleEntry<C>
  [selector: `~${string}`]: VanityRuleEntry<C>
  [selector: `${string} ${string}`]: VanityRuleEntry<C>
}

export interface VanityAtRules<C extends string> {
  [atRule: `@media ${string}`]: VanityRuleEntry<C>
  [atRule: `@supports ${string}`]: VanityRuleEntry<C>
  [atRule: `@container ${string}`]: VanityRuleEntry<C>
  '@starting-style'?: VanityNestedRule<C>
}

/** The recursive rule body: declarations, bare condition keys, selectors, at-rules. */
export type VanityNestedRule<C extends string>
  = VanityDeclarations<C>
    & { [K in C]?: VanityNestedRule<C> }
    & VanitySelectorRules<C>
    & VanityAtRules<C>

/** What `css()` takes: a rule, optionally re-homed to another declared layer. */
export type VanityStyleRule<C extends string, L extends string> = VanityNestedRule<C> & { layer?: L }

// Alias declarations layer onto the stable standard grammar. Keeping the
// alias map shallow avoids cloning csstype's 870-property recursive graph for
// every engine/plugin chain while preserving exact keys and target values.
type VanityAliasDeclarations<
  C extends string,
  Aliases extends VanityPropertyAliasMap,
> = {
  [Alias in keyof Aliases]?: Aliases[Alias] extends VanityCssPropertyName
    ? | VanityStyleValue<Aliases[Alias]>
    | readonly (CSSTypeProperties[Aliases[Alias]] | VanityVarReference | VanityTokenInput)[]
    | VanityPropertyArms<C, VanityStyleValue<Aliases[Alias]>>
    : never
}

type VanityAliasedStyleRule<C extends string, L extends string, Aliases extends VanityPropertyAliasMap>
  = VanityAliasedNestedRule<C, Aliases> & { layer?: L }

type VanityStrictAliasedStyleRule<C extends string, L extends string, Aliases extends VanityPropertyAliasMap>
  = VanityStrictAliasedNestedRule<C, Aliases> & { layer?: L }

type VanityAliasedRuleEntry<C extends string, Aliases extends VanityPropertyAliasMap>
  = VanityAliasedNestedRule<C, Aliases> | VanityRuleScalar

type VanityStrictAliasedRuleEntry<C extends string, Aliases extends VanityPropertyAliasMap>
  = VanityStrictAliasedNestedRule<C, Aliases> | VanityRuleScalar

interface VanityAliasedSelectorRules<C extends string, Aliases extends VanityPropertyAliasMap> {
  [selector: `${string}&${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [selector: `.${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [selector: `#${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [selector: `[${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [selector: `:${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [selector: `*${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [selector: `>${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [selector: `+${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [selector: `~${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [selector: `${string} ${string}`]: VanityAliasedRuleEntry<C, Aliases>
}

interface VanityStrictAliasedSelectorRules<C extends string, Aliases extends VanityPropertyAliasMap> {
  [selector: `${string}&${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [selector: `.${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [selector: `#${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [selector: `[${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [selector: `:${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [selector: `*${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [selector: `>${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [selector: `+${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [selector: `~${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [selector: `${string} ${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
}

type VanityAliasedAtRules<C extends string, Aliases extends VanityPropertyAliasMap> = {
  [atRule: `@media ${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [atRule: `@supports ${string}`]: VanityAliasedRuleEntry<C, Aliases>
  [atRule: `@container ${string}`]: VanityAliasedRuleEntry<C, Aliases>
} & { '@starting-style'?: VanityAliasedNestedRule<C, Aliases> }

type VanityStrictAliasedAtRules<C extends string, Aliases extends VanityPropertyAliasMap> = {
  [atRule: `@media ${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [atRule: `@supports ${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
  [atRule: `@container ${string}`]: VanityStrictAliasedRuleEntry<C, Aliases>
} & { '@starting-style'?: VanityStrictAliasedNestedRule<C, Aliases> }

type VanityAliasedNestedRule<C extends string, Aliases extends VanityPropertyAliasMap>
  = VanityDeclarations<C>
    & VanityAliasDeclarations<C, Aliases>
    & { [K in C]?: VanityAliasedNestedRule<C, Aliases> }
    & VanityAliasedSelectorRules<C, Aliases>
    & VanityAliasedAtRules<C, Aliases>

type VanityStrictAliasedNestedRule<C extends string, Aliases extends VanityPropertyAliasMap>
  = Omit<VanityDeclarations<C>, Aliases[keyof Aliases]>
    & VanityAliasDeclarations<C, Aliases>
    & { [K in C]?: VanityStrictAliasedNestedRule<C, Aliases> }
    & VanityStrictAliasedSelectorRules<C, Aliases>
    & VanityStrictAliasedAtRules<C, Aliases>

type VanityAliasRuleKeyGuard<Rule, C extends string, L extends string, Aliases extends VanityPropertyAliasMap>
  = Exclude<keyof Rule, keyof VanityAliasedStyleRule<C, L, Aliases>> extends never
    ? unknown
    : { [P in Exclude<keyof Rule, keyof VanityAliasedStyleRule<C, L, Aliases>>]?: never }

// ─── Keyframes and font faces ────────────────────────────────────────────────

/**
 * A keyframe step is declaration-only: conditions and selectors are
 * semantically meaningless inside one, so the grammar refuses them at the key.
 */
export type VanityKeyframeStep = {
  [P in VanityCssPropertyName]?: VanityStyleValue<P> | readonly (CSSTypeProperties[P] | VanityVarReference | VanityTokenInput)[]
} & {
  [customProperty: `--${string}`]: string | number | VanityVarReference
}

export type VanityKeyframeTime = 'from' | 'to' | `${string}%`

export type VanityKeyframesRule = {
  [T in VanityKeyframeTime]?: VanityKeyframeStep
}

export type VanityFontFaceRule
  = Omit<CSS.AtRule.FontFaceFallback, 'src'> & Required<Pick<CSS.AtRule.FontFaceFallback, 'src'>>

// ─── The bound authoring functions ───────────────────────────────────────────

export type VanityRawValue = string | number | VanityVarReference | VanityTokenInput | VanityColor<any> | VanityAuthoredColor | VanityCssValue

interface VanityCssMembers<C extends string, L extends string> {
  /** Full platform-property lane, even when the primary alias policy is aliases-only. */
  standard: (rule: VanityStyleRule<C, L>, debugId?: string) => string
  /** The escape hatch is CSS itself: parsed, validated, scoped under the class ([§8]). */
  raw: (strings: TemplateStringsArray, ...values: VanityRawValue[]) => string
}

export interface VanityCssFunction<C extends string, L extends string> extends VanityCssMembers<C, L> {
  /** The style unit: a scoped class whose rules compile away ([vanity-spec-css.md §2]). */
  (rule: VanityStyleRule<C, L>, debugId?: string): string
}

/** Alias-aware lane installed only by the optional property-alias plugin. */
export interface VanityPropertyAliasCssFunction<
  C extends string,
  L extends string,
  Aliases extends VanityPropertyAliasMap,
> extends VanityCssMembers<C, L> {
  <const Rule extends VanityAliasedStyleRule<C, L, Aliases>>(
    rule: Rule
      & VanityAliasRuleKeyGuard<Rule, C, L, Aliases>,
    debugId?: string,
  ): string
}

/** Strict primary lane: aliased target spellings disappear from completion. */
export interface VanityStrictPropertyAliasCssFunction<
  C extends string,
  L extends string,
  Aliases extends VanityPropertyAliasMap,
> extends VanityCssMembers<C, L> {
  (
    rule: VanityStrictAliasedStyleRule<C, L, Aliases>,
    debugId?: string,
  ): string
}

export type VanityGlobalCssFunction<C extends string, L extends string>
  = (selector: string, rule: VanityStyleRule<C, L>) => void

export type VanityKeyframesFunction = (steps: VanityKeyframesRule, debugId?: string) => string

export type VanityFontFaceFunction = (rule: VanityFontFaceRule, debugId?: string) => string
