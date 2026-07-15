/**
 * The public recipe and anatomy types ([dux-spec-recipes.md]). Variants
 * compress state ([dux-patterns.md §7]): the settled Stitches shape, kept
 * deliberately, with toggles as their own key and full condition support in
 * every arm.
 *
 * Two rules govern the types here:
 *
 * - **One signature with union-typed arms, never sibling overloads**
 *   ([dux-patterns.md §10]) — a malformed options object reports a single
 *   diagnostic at the offending property.
 * - **Strict on literals, permissive on widened props** ([dux-spec-recipes.md
 *   §4]): `button({ intnet: 'brand' })` dies at the cursor via excess-property
 *   checks; `button(props)` with a component's wider props object just works.
 *   Both fall out of one plain optional parameter, used as designed.
 */

import type { VaneNestedRule } from '../css/types'
import type { VanePort } from '../ports/types'

/** Flatten an intersection so hovers read as one plain object, never an internals wall. */
export type VanePrettify<T> = { [K in keyof T]: T[K] } & {}

/** The inferred empty default for variants, toggles, and ports. */
export type VaneNoInput = Record<never, never>

// ─── Recipe options ──────────────────────────────────────────────────────────

/**
 * One arm of a recipe — `base`, a variant value, a toggle, a compound `style`.
 * A full vane rule: conditions, selectors, ports, composite tokens. No `layer`
 * key — a recipe lives in one layer, declared at the recipe root.
 */
export type VaneRecipeArm<C extends string> = VaneNestedRule<C>

/** The variant-space shapes `V` and `G` are inferred against — keys are the contract. */
export type VaneVariantsInput = Record<string, Record<string, unknown>>
export type VaneTogglesInput = Record<string, unknown>
export type VanePortsInput = Record<string, VanePort<any, any>>

/**
 * The declared variants, typed as a mapped shape over the inferred `V` whose
 * leaves are the rule grammar. `V` arrives by reverse mapped-type inference —
 * its *keys* are the variant space — while every arm literal is checked
 * against `VaneRecipeArm` directly, so a typo'd property dies at its key
 * (inferring the arms into `V` itself would launder them into legal keys).
 */
export type VaneVariantsOf<C extends string, V> = {
  [A in keyof V]: { [K in keyof V[A]]: VaneRecipeArm<C> }
}

export type VaneTogglesOf<C extends string, G> = { [K in keyof G]: VaneRecipeArm<C> }

/** A variant/toggle choice map — the shape of `when`, `defaults`, and call-site props. */
export type VaneRecipeSelection<V, G>
  = { -readonly [K in keyof V]?: keyof V[K] & string } & { -readonly [K in keyof G]?: boolean }

/** The inferred call-site props of a recipe or anatomy — also reachable as `VaneProps<typeof button>`. */
export type VaneRecipeProps<V, G> = VanePrettify<VaneRecipeSelection<V, G>>

/** The typed variant map a recipe publishes: axis → its declared values. */
export type VaneVariantValues<V> = VanePrettify<{ readonly [K in keyof V]: readonly (keyof V[K] & string)[] }>

export interface VaneCompoundEntry<C extends string, V, G> {
  /** Typed against the declared variants and toggles — an impossible combination errors at the key. */
  when: VaneRecipeSelection<V, G>
  style: VaneRecipeArm<C>
}

export interface VaneRecipeOptions<C extends string, L extends string, V, G, P> {
  /** Publication, not declaration: module-scope port handles become `button.ports.*` ([dux-spec-recipes.md §2]). */
  ports?: P
  base?: VaneRecipeArm<C>
  variants?: VaneVariantsOf<C, V>
  toggles?: VaneTogglesOf<C, G>
  // `when` and `defaults` are checked against the declared space, never
  // inferred from — NoInfer keeps a typo'd key an error there, not a new axis.
  compound?: readonly VaneCompoundEntry<C, NoInfer<V>, NoInfer<G>>[]
  defaults?: NoInfer<VaneRecipeSelection<V, G>>
  /** The recipe's one layer — `recipes` by default; every arm lives in it. */
  layer?: L
}

// ─── The recipe handle ───────────────────────────────────────────────────────

/**
 * What `recipe()` returns: a resolver from variant props to a class string,
 * carrying the variant space, defaults, and published ports. Interpolates in
 * selectors as its base class — every instance wears it.
 */
export interface VaneRecipe<
  TProps extends object = VaneNoInput,
  TVariants extends object = VaneNoInput,
  TToggle extends string = never,
  TPorts extends VanePortsInput = VaneNoInput,
> {
  /** Props in, classes out — unknown keys ignored, defaults fill the gaps ([dux-spec-recipes.md §4]). */
  (props?: TProps): string
  /**
   * The inferred call-site props, carried as a member so Vue's SFC compiler
   * can resolve them: `defineProps<(typeof button)['props'] & …>()`. The
   * runtime value is the empty selection (`{}`) — a legitimate inhabitant of
   * the all-optional props type, so the type stays honest.
   */
  readonly props: TProps
  /** The typed variant map: axis → declared values, for prop forwarding and docs. */
  readonly variants: TVariants
  readonly toggles: readonly TToggle[]
  readonly defaults: Readonly<Partial<TProps>>
  /** The component's published runtime style API ([dux-spec-recipes.md §2]). */
  readonly ports: TPorts
  toString: () => string
}

/** The system-bound `recipe` — one signature, generics inferred from the options literal. */
export interface VaneRecipeFactory<C extends string, L extends string> {
  <
    V extends VaneVariantsInput = VaneNoInput,
    G extends VaneTogglesInput = VaneNoInput,
    const P extends VanePortsInput = VaneNoInput,
  >(
    options: VaneRecipeOptions<C, L, V, G, P>,
    debugId?: string,
  ): VaneRecipe<VaneRecipeProps<V, G>, VaneVariantValues<V>, keyof G & string, P>
}

/**
 * The everyday utility: the inferred variant props of a recipe or anatomy.
 * Indexed off the handle's `props` carrier — deliberately not a conditional
 * type, so the definition every tool reads is the same one Vue's SFC compiler
 * can follow. Inside `defineProps`, spell it `(typeof button)['props']` —
 * compiler-sfc resolves indexed access over `typeof`, but not (yet) generic
 * type aliases; the two forms are one type.
 */
export type VaneProps<T extends { props: object }> = T['props']

// ─── Anatomy options ─────────────────────────────────────────────────────────

/**
 * A part's rule: a full vane rule plus part-scoped conditions — `'root:open'`
 * styles this part by another part's state, typed over the declared parts ×
 * the system's conditions ([dux-spec-recipes.md §3]).
 */
export type VaneAnatomyRule<C extends string, TPart extends string>
  = VaneNestedRule<C> & { [K in `${TPart}:${C}`]?: VaneNestedRule<C> }

/** One anatomy arm: rules keyed by part — an undeclared part errors at the key. */
export type VaneAnatomyArms<C extends string, TPart extends string> = {
  [K in TPart]?: VaneAnatomyRule<C, TPart>
}

/** The anatomy twin of `VaneVariantsOf` — arms keyed by part, checked part by part. */
export type VaneAnatomyVariantsOf<C extends string, TPart extends string, V> = {
  [A in keyof V]: { [K in keyof V[A]]: VaneAnatomyArms<C, TPart> }
}

export type VaneAnatomyTogglesOf<C extends string, TPart extends string, G> = {
  [K in keyof G]: VaneAnatomyArms<C, TPart>
}

export interface VaneAnatomyCompoundEntry<C extends string, TPart extends string, V, G> {
  when: VaneRecipeSelection<V, G>
  style: VaneAnatomyArms<C, TPart>
}

export interface VaneAnatomyOptions<
  C extends string,
  L extends string,
  TParts extends readonly string[],
  V,
  G,
  P,
> {
  /** The named parts, styled as one unit — *parts*, never "slots" ([dux-language.md §3]). */
  parts: TParts
  ports?: P
  base?: VaneAnatomyArms<C, TParts[number]>
  variants?: VaneAnatomyVariantsOf<C, TParts[number], V>
  toggles?: VaneAnatomyTogglesOf<C, TParts[number], G>
  compound?: readonly VaneAnatomyCompoundEntry<C, TParts[number], NoInfer<V>, NoInfer<G>>[]
  defaults?: NoInfer<VaneRecipeSelection<V, G>>
  layer?: L
}

// ─── The anatomy handle ──────────────────────────────────────────────────────

/**
 * What `anatomy()` returns: same call-site law as a recipe, resolving to a
 * typed record of part classes. `parts` carries each part's stable class for
 * cross-file selector interpolation (`` [`${dialog.parts.content} &`] ``).
 */
export interface VaneAnatomy<
  TPart extends string,
  TProps extends object = VaneNoInput,
  TVariants extends object = VaneNoInput,
  TToggle extends string = never,
  TPorts extends VanePortsInput = VaneNoInput,
> {
  (props?: TProps): Record<TPart, string>
  /** The inferred call-site props — the same carrier a recipe publishes. */
  readonly props: TProps
  /** Part → its stable class, for typed cross-file references. */
  readonly parts: Readonly<Record<TPart, string>>
  readonly variants: TVariants
  readonly toggles: readonly TToggle[]
  readonly defaults: Readonly<Partial<TProps>>
  readonly ports: TPorts
}

/** The system-bound `anatomy` — same grammar as `recipe`, one added dimension (principle 5). */
export interface VaneAnatomyFactory<C extends string, L extends string> {
  <
    const TParts extends readonly string[],
    V extends VaneVariantsInput = VaneNoInput,
    G extends VaneTogglesInput = VaneNoInput,
    const P extends VanePortsInput = VaneNoInput,
  >(
    options: VaneAnatomyOptions<C, L, TParts, V, G, P>,
    debugId?: string,
  ): VaneAnatomy<TParts[number], VaneRecipeProps<V, G>, VaneVariantValues<V>, keyof G & string, P>
}

// ─── The serialized boundary crossing ────────────────────────────────────────

/**
 * What survives the build/app wall for a recipe: precompiled classes and the
 * resolution table — never a rule, never a stylesheet ([dux-patterns.md §1]).
 * Ports ride along as handles with their own serializers.
 */
export interface VaneRecipeRuntime {
  /** The debug name, for dev-mode call-site warnings. */
  name?: string
  base: string
  /** Axis → value → class; `''` where the arm compiled into base or was empty. */
  variants: Record<string, Record<string, string>>
  toggles: Record<string, string>
  compound: ReadonlyArray<{ when: Record<string, string | boolean>, class: string }>
  defaults: Record<string, string | boolean>
  ports: Record<string, VanePort<any, any>>
}

/** The anatomy equivalent — every class map keyed by part. */
export interface VaneAnatomyRuntime {
  name?: string
  /** Part → its stable class. */
  parts: Record<string, string>
  variants: Record<string, Record<string, Record<string, string>>>
  toggles: Record<string, Record<string, string>>
  compound: ReadonlyArray<{ when: Record<string, string | boolean>, classes: Record<string, string> }>
  defaults: Record<string, string | boolean>
  ports: Record<string, VanePort<any, any>>
}
