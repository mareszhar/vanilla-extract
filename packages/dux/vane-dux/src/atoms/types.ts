/**
 * The public atoms types ([dux-spec-preset.md §3]): the strict utility lane.
 * Token keys autocomplete; values outside the map are rejected at the key —
 * unless passed through the labeled escape (`unsafe.value`). Conditional maps
 * use the same condition grammar as everything else (principle 5), over the
 * conditions the atoms declare — declaring them is what keeps the emitted CSS
 * bounded by construction.
 */

import type { VaneCssPropertyName, VaneNestedRule, VaneVarReference } from '../css/types'
import type { VaneNoInput, VanePrettify } from '../recipes/types'
import type { VaneCssValue } from '../values/types'

// ─── The definition side ─────────────────────────────────────────────────────

/** One value a property map may hold: a CSS literal, or a token handle. */
export type VaneAtomValue = string | number | VaneVarReference | VaneCssValue

/** A property's declared values: a literal list, or a token-keyed map (`gap: t.space`). */
export type VaneAtomValues = readonly (string | number)[] | Record<string, VaneAtomValue>

/**
 * The `properties` shape, checked key by key: a name that is not a CSS
 * property errors at that key ([dux-patterns.md §2]).
 */
export type VaneAtomsPropertiesInput<P> = {
  [K in keyof P]: K extends VaneCssPropertyName ? VaneAtomValues : never
}

export type VaneAtomsToggles<C extends string, G> = { [K in keyof G]: VaneNestedRule<C> }

export interface VaneAtomsOptions<
  C extends string,
  L extends string,
  P,
  S extends Record<string, keyof P & string>,
  G,
  TCond extends readonly C[],
> {
  /** Property → its closed value set. The token map guides *and* gates — that's the lane. */
  properties?: P & VaneAtomsPropertiesInput<P>
  /** Call-site aliases: `{ p: 'padding', bg: 'background' }`. */
  shorthands?: S
  /** Boolean one-liners, each a full vane rule: `stack: { display: 'flex', flexDirection: 'column' }`. */
  toggles?: VaneAtomsToggles<C, G>
  /**
   * The conditions available at atoms call sites. Each declared condition
   * pre-generates one class per property value, so output stays bounded —
   * and none are declared by default (principle 10).
   */
  conditions?: TCond
  /** The cascade layer; `utilities` when the system declares it. */
  layer?: L
}

// ─── The call side ───────────────────────────────────────────────────────────

/** The labeled escape: an off-map value carries a reason and surfaces in the audit. */
export interface VaneUnsafeValue {
  readonly value: string | number
  readonly reason: string
}

/** A declared value's call-site key: a list member, or a map key. */
export type VaneAtomKey<V> = V extends readonly (infer U)[] ? U : keyof V & string

export type VaneAtomArms<V, C extends string>
  = { base?: VaneAtomKey<V> | VaneUnsafeValue } & { [K in C]?: VaneAtomKey<V> | VaneUnsafeValue }

export type VaneAtomInput<V, C extends string> = VaneAtomKey<V> | VaneUnsafeValue | VaneAtomArms<V, C>

/** The inferred call-site props: properties, shorthands, and toggles, all optional. */
export type VaneAtomsProps<P, S extends Record<string, keyof P & string>, G, C extends string> = VanePrettify<
  { [K in keyof P]?: VaneAtomInput<P[K], C> }
  & { [K in keyof S]?: VaneAtomInput<P[S[K]], C> }
  & { [K in keyof G]?: boolean }
>

/** What `defineAtoms` returns: props in, a class string out — never new CSS at runtime. */
export interface VaneAtoms<TProps extends object = VaneNoInput> {
  (props?: TProps): string
}

/** The system-bound `defineAtoms` — one signature, generics inferred from the options literal. */
export interface VaneAtomsFactory<C extends string, L extends string> {
  <
    const P extends object = VaneNoInput,
    const S extends Record<string, keyof P & string> = VaneNoInput,
    G extends Record<string, unknown> = VaneNoInput,
    const TCond extends readonly C[] = readonly [],
  >(
    options: VaneAtomsOptions<C, L, P, S, G, TCond>,
    debugId?: string,
  ): VaneAtoms<VaneAtomsProps<P, S, G, TCond[number]>>
}

// ─── The serialized boundary crossing ────────────────────────────────────────

/** What survives the build/app wall: precompiled class tables, never a rule. */
export interface VaneAtomsRuntime {
  /** The debug name, for dev-mode call-site warnings. */
  name?: string
  /** Property → value key → `'base'` or condition name → class. */
  classes: Record<string, Record<string, Record<string, string>>>
  /** Shorthand → the property it resolves to. */
  shorthands: Record<string, string>
  /** Toggle → its class. */
  toggles: Record<string, string>
}
