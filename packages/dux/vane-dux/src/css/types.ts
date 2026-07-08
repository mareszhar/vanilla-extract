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

type CSSTypeProperties = CSS.Properties<number | (string & {})>

export type VaneCssPropertyName = keyof CSSTypeProperties

/** Anything carrying a `var()` reference — token handles today, ports next. */
export interface VaneVarReference {
  readonly var: `var(--${string})`
}

/**
 * One declared value: the property's csstype grammar, a token handle, or a
 * color-helper expression (`alpha(t.color.ink, 0.42)`). Open-valued by
 * design — the token map guides, it never gates.
 */
export type VaneStyleValue<P extends VaneCssPropertyName = VaneCssPropertyName>
  = CSSTypeProperties[P] | VaneVarReference | VaneColor<any>

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
    | string
    | number
    | VaneVarReference
    | VaneColor<any>
    | readonly (string | number | VaneVarReference)[]
    | undefined

/** Custom properties are plain keys; the escape audit sees them, `vars` ceremony doesn't exist. */
export interface VaneCustomProperties<C extends string> {
  [customProperty: `--${string}`]: VaneRuleEntry<C>
}

export type VaneDeclarations<C extends string> = {
  [P in VaneCssPropertyName]?:
    | VaneStyleValue<P>
    | readonly (CSSTypeProperties[P] | VaneVarReference)[]
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

// ─── Keyframes and font faces ────────────────────────────────────────────────

/**
 * A keyframe step is declaration-only: conditions and selectors are
 * semantically meaningless inside one, so the grammar refuses them at the key.
 */
export type VaneKeyframeStep = {
  [P in VaneCssPropertyName]?: VaneStyleValue<P> | readonly (CSSTypeProperties[P] | VaneVarReference)[]
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

export type VaneRawValue = string | number | VaneVarReference | VaneColor<any>

export interface VaneCssFunction<C extends string, L extends string> {
  /** The style unit: a scoped class whose rules compile away ([dux-spec-css.md §2]). */
  (rule: VaneStyleRule<C, L>, debugId?: string): string
  /** The escape hatch is CSS itself: parsed, validated, scoped under the class ([§8]). */
  raw: (strings: TemplateStringsArray, ...values: VaneRawValue[]) => string
}

export type VaneGlobalCssFunction<C extends string, L extends string>
  = (selector: string, rule: VaneStyleRule<C, L>) => void

export type VaneKeyframesFunction = (steps: VaneKeyframesRule, debugId?: string) => string

export type VaneFontFaceFunction = (rule: VaneFontFaceRule, debugId?: string) => string
