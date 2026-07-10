/**
 * `createSystem` — bind once, typed everywhere ([dux-spec-css.md §1]): a
 * factory that closes over tokens, conditions, and layers and returns
 * authoring functions whose types are inferred. No codegen, no artifact
 * directory — inference is the codegen. The floor is engineered: tokens can be
 * defined inline and `t` always comes back out, layers default, and the base
 * condition set is already there. The happy path is one file, one call.
 */

import type { VaneAtomsFactory } from '../atoms/types'
import type { VaneCssFunction, VaneCssPropertyName, VaneFontFaceFunction, VaneGlobalCssFunction, VaneKeyframesFunction } from '../css/types'
import type { VaneAuditConfig } from '../internal/inspect'
import type { VanePort, VanePortInput, VanePortOptions, VanePortWiden } from '../ports/types'
import type { VaneAnatomyFactory, VaneRecipeFactory } from '../recipes/types'
import type { VaneCheck, VaneGraphInput, VaneResolvedTokens, VaneThemeOverrides, VaneTokens } from '../tokens/types'
import type { VaneBaseConditionName, VaneConditionInput } from './conditions'
import { globalLayer } from '@vanilla-extract/css'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { bindAtoms } from '../atoms/atoms'
import { bindCss } from '../css/css'
import { bindGlobalCss } from '../css/global'
import { bindFontFace, bindKeyframes } from '../css/keyframes'
import { VaneError } from '../diagnostics'
import { record } from '../internal/inspect'
import { requireStyleModule } from '../internal/styleModule'
import { createPort } from '../ports/port'
import { bindAnatomy } from '../recipes/anatomy'
import { bindRecipe } from '../recipes/recipe'
import { defineTokens, graphOf } from '../tokens/graph'
import { theme as standaloneTheme } from '../tokens/theme'
import { baseConditions, describeConditions, normalizeConditions } from './conditions'

export const VANE_DEFAULT_LAYERS = ['reset', 'tokens', 'recipes', 'utilities', 'overrides'] as const

export type VaneDefaultLayers = typeof VANE_DEFAULT_LAYERS

/** The system's own layers; authored styles default to the first layer after them. */
const SYSTEM_LAYERS: readonly string[] = ['reset', 'tokens']

// ─── Options ─────────────────────────────────────────────────────────────────

/**
 * A condition name colliding with a CSS property is refused at the definition
 * key (`never` value → error at that key); the build diagnostic carries the
 * full sentence (`VANE_SYSTEM_CONDITION_COLLISION`).
 */
export type VaneConditionsInput<C> = {
  [K in keyof C]: K extends VaneCssPropertyName ? never : VaneConditionInput
}

export interface VaneSystemOptions<
  T extends object,
  C extends Record<string, VaneConditionInput>,
  L extends readonly string[],
  P extends string,
  B extends boolean,
> {
  /** A raw token graph or a `defineTokens` result — `t` is always returned beside the functions. */
  tokens: T & (VaneGraphInput | VaneResolvedTokens)
  conditions?: C & VaneConditionsInput<C>
  /** Cascade-layer order, `['reset', 'tokens', 'recipes', 'utilities', 'overrides']` by default. */
  layers?: L
  /** The emitted custom-property prefix: `--vane-*` by default. */
  prefix?: P
  /** Build-time checks over an inline token graph ([dux-spec-tokens.md §5]); a `defineTokens` result brings its own. */
  checks?: (tokens: VaneSystemTokens<T, P>) => readonly VaneCheck[]
  /** Opt out of the built-in base condition set. */
  baseConditions?: B
  /**
   * Per-audit promotion ([dux-spec-introspection.md §3]): every audit warns by
   * default; `'error'` makes one a hard gate, `'off'` silences one. Declared
   * on the system so the quality bar travels with the design system.
   */
  audit?: VaneAuditConfig
}

/** Inline graphs bind here; a `defineTokens` result passes through untouched. */
export type VaneSystemTokens<T extends object, P extends string> = T extends VaneGraphInput ? VaneTokens<T, P> : T

export type VaneSystemConditionName<C, B extends boolean>
  = (keyof C & string) | (B extends false ? never : VaneBaseConditionName)

// ─── The system ──────────────────────────────────────────────────────────────

export interface VaneSystem<T, C extends string, L extends string> {
  /** The bound token graph — one import line serves every style file. */
  readonly t: T
  readonly css: VaneCssFunction<C, L>
  readonly keyframes: VaneKeyframesFunction
  readonly fontFace: VaneFontFaceFunction
  readonly globalCss: VaneGlobalCssFunction<C, L>
  /** The bound form of `theme(t, overrides)` — the graph argument dropped. */
  readonly theme: (overrides: VaneThemeOverrides<T>, debugId?: string) => string
  /** Variants compress state: props in, classes out ([dux-spec-recipes.md §1]). */
  readonly recipe: VaneRecipeFactory<C, L>
  /** The recipe pattern applied to parts ([dux-spec-recipes.md §3]). */
  readonly anatomy: VaneAnatomyFactory<C, L>
  /** The typed runtime boundary: declare a port with a default, typed by it. */
  readonly port: <TValue extends VanePortInput>(defaultValue: TValue, options?: VanePortOptions) => VanePort<VanePortWiden<TValue>>
  /** The strict utility lane, defined over your token map ([dux-spec-preset.md §3]). */
  readonly defineAtoms: VaneAtomsFactory<C, L>
}

export function createSystem<
  const T extends object,
  const C extends Record<string, VaneConditionInput> = Record<never, never>,
  const L extends readonly string[] = VaneDefaultLayers,
  P extends string = 'vane',
  B extends boolean = true,
>(
  options: VaneSystemOptions<T, C, L, P, B>,
): VaneSystem<VaneSystemTokens<T, P>, VaneSystemConditionName<C, B>, L[number]> {
  const file = requireStyleModule('createSystem')
  const prefix = options.prefix ?? 'vane'

  // The inline-graph path forwards the graph options; a `defineTokens` result
  // already resolved with its own. The cast narrows `checks` to the erased
  // graph type defineTokens sees — the public signature stays precise.
  const tokens = graphOf(options.tokens)
    ? options.tokens
    : defineTokens(options.tokens as VaneGraphInput & object, {
        prefix,
        ...(options.checks === undefined ? {} : { checks: options.checks as () => readonly VaneCheck[] }),
      })
  const layers = options.layers ?? VANE_DEFAULT_LAYERS

  if (layers.length === 0) {
    throw new VaneError({
      code: 'VANE_SYSTEM_UNKNOWN_LAYER',
      message: 'a system declares at least one layer',
      file,
      fix: 'drop the layers key to accept the default order, or declare your own',
    })
  }

  // The system's layers nest under one root named by the prefix: authoring
  // says `layer: 'overrides'`, the CSS says `@layer vane.overrides`. The only
  // global layer name a system claims is its own namespace, so coexisting
  // frameworks' layer orders stay exactly as they declared them
  // ([dux-patterns.md §6]).
  globalLayer(prefix)

  for (const layer of layers)
    globalLayer({ parent: prefix }, layer)

  const conditions = normalizeConditions(
    {
      ...(options.baseConditions === false ? {} : baseConditions()),
      ...options.conditions,
    },
    file,
  )

  const system = {
    conditions,
    layers,
    defaultLayer: layers.find(layer => !SYSTEM_LAYERS.includes(layer)) ?? layers[0],
    globalDefaultLayer: layers.includes('reset') ? 'reset' : layers[0],
    layerRoot: prefix,
  }

  record({
    kind: 'system',
    file,
    prefix,
    layers: [...layers],
    conditions: describeConditions(conditions),
    ...(options.audit === undefined ? {} : { audit: options.audit }),
  })

  type Bound = VaneSystem<VaneSystemTokens<T, P>, VaneSystemConditionName<C, B>, L[number]>

  return {
    t: tokens as Bound['t'],
    css: buildPlane('css', bindCss(system) as Bound['css']),
    keyframes: buildPlane('keyframes', bindKeyframes(system)),
    fontFace: buildPlane('fontFace', bindFontFace()),
    globalCss: buildPlane('globalCss', bindGlobalCss(system) as Bound['globalCss']),
    theme: buildPlane('theme', (overrides, debugId) => standaloneTheme(tokens, overrides, debugId)),
    recipe: buildPlane('recipe', bindRecipe(system) as Bound['recipe']),
    anatomy: buildPlane('anatomy', bindAnatomy(system) as Bound['anatomy']),
    port: buildPlane('port', <TValue extends VanePortInput>(defaultValue: TValue, options?: VanePortOptions) =>
      createPort(defaultValue, options, { prefix }) as unknown as VanePort<VanePortWiden<TValue>>),
    defineAtoms: buildPlane('defineAtoms', bindAtoms(system) as Bound['defineAtoms']),
  }
}

/**
 * Let a bound authoring function cross the build/app boundary as a stub:
 * importing the system module from app code is legal and useful (`t` for
 * `applyTheme`, published classes), so the build-plane functions beside those
 * exports serialize into throwing stubs instead of poisoning the module
 * ([dux-patterns.md §1] — app code never executes styling work at runtime).
 */
function buildPlane<F>(name: string, fn: F): F {
  addFunctionSerializer(fn as Parameters<typeof addFunctionSerializer>[0], {
    importPath: '@mszr/vane-dux/runtime',
    importName: 'restoreBuildPlane',
    args: [{ name }],
  })

  return fn
}
