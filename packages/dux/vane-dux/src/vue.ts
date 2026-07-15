/**
 * The Vue overlay ([dux-spec-vue.md]): thin sugar over the core's currencies —
 * class strings and style-object fragments. Two composables, deliberately:
 * `usePorts` because reactivity needs a binding, `useAnatomy` because a record
 * of part classes silently loses reactivity without one. Single-class recipes
 * stay wrapper-free — `:class="button(props)"` inline is already reactive, and
 * no `useRecipe` exists (principle 10: a wrapper must carry something).
 */

import type { ComputedRef, CSSProperties, MaybeRefOrGetter, PropType } from 'vue'
import type { VaneRuntimeStyle } from './runtime'
import { computed, toValue } from 'vue'
import { ports } from './runtime'

export type VanePortSource = VaneRuntimeStyle | false | null | undefined
export type VanePortSourceFactory = () => VanePortSource | readonly VanePortSource[]

/**
 * Bind port fragments to `:style` — everything `v-bind()` in CSS offers
 * (cascade-powered, no style recalc storms) with none of its limits: typed,
 * cross-file, rename-safe ([dux-spec-vue.md §1]). Accepts a thunk returning
 * fragments (reactive) or plain fragments (static); the thunk's array **is**
 * the merge — no `ports()` wrapper inside. SSR-safe: the computed serializes
 * into the rendered `style` attribute ([dux-spec-ports.md §5]).
 */
export function usePorts(
  source: VanePortSource | readonly VanePortSource[] | VanePortSourceFactory,
): ComputedRef<CSSProperties> {
  return computed(() => {
    const value = typeof source === 'function' ? source() : source
    const styles = Array.isArray(value) ? value : [value]

    return ports(...styles) as CSSProperties
  })
}

/** What `propsOf` reads: the props carrier plus the runtime variant space every recipe and anatomy publishes. */
export interface VanePropsSource<TProps extends object> {
  readonly props: TProps
  readonly variants: object
  readonly toggles: readonly string[]
}

/** The Vue props declaration `propsOf` builds — `defineProps` extracts `TProps` back out of it. */
export type VanePropsOptions<TProps extends object> = {
  [K in keyof TProps]-?: { type: PropType<Exclude<TProps[K], undefined>> }
}

type VaneOptionMap = Readonly<Record<string, { type: unknown }>>
type VaneProjectedOptions<Source> = Source extends VanePropsSource<infer Props>
  ? VanePropsOptions<Props>
  : Source extends VaneOptionMap ? Source : never
type VaneUnionToIntersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (value: infer Intersection) => void ? Intersection : never
export type VaneNamespacedPropsOptions<Sources extends Readonly<Record<string, VanePropsSource<object> | VaneOptionMap>>>
  = VaneUnionToIntersection<{
    [Prefix in keyof Sources & string]: {
      [Key in keyof VaneProjectedOptions<Sources[Prefix]> & string as `${Prefix}-${Key}`]: VaneProjectedOptions<Sources[Prefix]>[Key]
    }
  }[keyof Sources & string]>

/**
 * Project a recipe's (or anatomy's) variant space into a Vue runtime props
 * declaration: `defineProps({ ...propsOf(button), disabled: Boolean })`. One
 * source of truth — the recipe — so component props can never drift from the
 * variants, and toggles get native boolean casting (`<AppButton pill>` just
 * works). The runtime form exists because Vue's SFC compiler resolves types
 * syntactically: it cannot infer a `recipe()` call's instantiation, so a typed
 * `defineProps<VaneProps<…>>` macro is structurally out of its reach — while
 * the variant space is right there on the handle at runtime.
 */
export function propsOf<TProps extends object>(recipe: VanePropsSource<TProps>): VanePropsOptions<TProps>
export function propsOf<const Sources extends Readonly<Record<string, VanePropsSource<object> | VaneOptionMap>>>(
  sources: Sources,
): VaneNamespacedPropsOptions<Sources>
export function propsOf<TProps extends object>(recipe: VanePropsSource<TProps> | Readonly<Record<string, VanePropsSource<object> | VaneOptionMap>>): VanePropsOptions<TProps> {
  if (!isPropsSource(recipe)) {
    const namespaced: Record<string, { type: unknown }> = {}
    for (const [prefix, source] of Object.entries(recipe)) {
      const projected = isPropsSource(source) ? propsOf(source) : source
      for (const [key, option] of Object.entries(projected))
        namespaced[`${prefix}-${key}`] = option
    }
    return namespaced as VanePropsOptions<TProps>
  }

  const options: Record<string, { type: unknown }> = {}

  for (const axis of Object.keys(recipe.variants))
    options[axis] = { type: String }

  for (const toggle of recipe.toggles)
    options[toggle] = { type: Boolean }

  return options as VanePropsOptions<TProps>
}

function isPropsSource(value: unknown): value is VanePropsSource<object> {
  return (typeof value === 'object' || typeof value === 'function')
    && value !== null
    && 'variants' in value
    && 'toggles' in value
}

export type VaneAnatomyResolver<TProps extends object, TParts extends Record<string, string>>
  = (props?: TProps) => TParts

/**
 * The blessed one-liner for anatomy in Vue ([dux-spec-vue.md §2]): a typed
 * `computed` that keeps part classes reactive — `d.content` in the template,
 * no `.value`, no repeated calls. The bare `const d = dialog(props)` computes
 * once and silently stops tracking; this is the one place the "a typed
 * function needs no wrapper" rule bends, because here the wrapper carries
 * reactivity, not ceremony. Accepts the reactive props object directly, a
 * getter, or nothing — the anatomy's defaults resolve.
 */
export function useAnatomy<TProps extends object, TParts extends Record<string, string>>(
  anatomy: VaneAnatomyResolver<TProps, TParts>,
  props?: MaybeRefOrGetter<TProps>,
): ComputedRef<TParts> {
  return computed(() => anatomy(props === undefined ? undefined : toValue(props)))
}
