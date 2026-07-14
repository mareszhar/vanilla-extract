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
import type { VaneEngineKernel } from '../internal/engineKernel'
import type { VaneAuditConfig } from '../internal/inspect'
import type { VanePort, VanePortInput, VanePortOptions, VanePortWiden } from '../ports/types'
import type { VaneAnatomyFactory, VaneRecipeFactory } from '../recipes/types'
import type {
  VaneCheck,
  VaneEngineRequirement,
  VaneGraphInput,
  VaneResolvedTokens,
  VaneThemeOverrides,
  VaneTokenBuilder,
  VaneTokenModule,
  VaneTokens,
} from '../tokens/types'
import type { VaneCssValue, VaneValue } from '../values/types'
import type { VaneBaseConditionName, VaneConditionInput } from './conditions'
import { globalLayer } from '@vanilla-extract/css'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { bindAtoms } from '../atoms/atoms'
import { bindCss } from '../css/css'
import { bindGlobalCss } from '../css/global'
import { bindFontFace, bindKeyframes } from '../css/keyframes'
import { diagnosticSource, VaneError } from '../diagnostics'
import { checkSelector } from '../internal/cssParser'
import { record } from '../internal/inspect'
import { requireStyleModule } from '../internal/styleModule'
import { createPort } from '../ports/port'
import { bindAnatomy } from '../recipes/anatomy'
import { bindRecipe } from '../recipes/recipe'
import { defineTokenModule, defineTokens, finalizeTokenModule, graphOf, isTokenBuilder, tokenModuleEngine } from '../tokens/graph'
import { theme as standaloneTheme } from '../tokens/theme'
import { defaultEngine } from '../values/defaultEngine'
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
  /** A static graph, a topological `defineTokens` builder, or built tokens — `t` is always returned. */
  tokens: T & VaneSystemTokenInput<T>
  conditions?: C & VaneConditionsInput<C>
  /** Cascade-layer order, `['reset', 'tokens', 'recipes', 'utilities', 'overrides']` by default. */
  layers?: L
  /** The emitted custom-property prefix: `--vane-*` by default. */
  prefix?: P
  /** The absolute selector that owns ordinary token declarations. */
  root?: string
  /** The declared layer that owns ordinary token declarations. */
  tokenLayer?: L[number]
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

type VaneSystemTokenInput<T>
  = T extends VaneResolvedTokens ? unknown
    : T extends VaneTokenBuilder<infer _Graph> ? unknown
      : T extends VaneGraphInput ? unknown
        : never

/** Static graphs and unfinished builders compile here; built tokens pass through untouched. */
export type VaneSystemTokens<T extends object, P extends string>
  = T extends VaneTokenBuilder<infer G> ? VaneTokens<G, P>
    : T extends VaneTokenModule<infer G> ? VaneTokens<G, P>
      : T extends VaneGraphInput ? VaneTokens<T, P>
        : T

export type VaneEngineSystemOptions<
  T extends object,
  C extends Record<string, VaneConditionInput>,
  L extends readonly string[],
  P extends string,
  B extends boolean,
> = Omit<VaneSystemOptions<T, C, L, P, B>, 'tokens'> & {
  tokens: T & (T extends VaneTokenModule<infer _Graph> ? unknown : T extends VaneGraphInput ? unknown : never)
}

export type VaneSystemConditionName<C, B extends boolean>
  = (keyof C & string) | (B extends false ? never : VaneBaseConditionName)

// ─── The system ──────────────────────────────────────────────────────────────

export interface VaneBoundSystem<T, C extends string, L extends string> {
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
  /** Serialize a portable value with this system's finalized reference map. */
  readonly serialize: (value: VaneValue) => string
  /** Read-only normalized authoring context for integrations and inspection. */
  readonly conditions: Readonly<Record<C, string>>
  readonly layers: readonly L[]
}

export type VaneSystem<
  T,
  C extends string,
  L extends string,
  Constructors extends object = Record<never, never>,
> = VaneBoundSystem<T, C, L> & Readonly<Constructors>

export interface VaneSystemEngineBinding<Constructors extends object> {
  readonly kernel: VaneEngineKernel<Constructors>
  readonly requirement: VaneEngineRequirement
}

/** @deprecated Use `createEngine().createSystem()`; removed at target-doc promotion. */
export function createSystem<
  const T extends object,
  const C extends Record<string, VaneConditionInput> = Record<never, never>,
  const L extends readonly string[] = VaneDefaultLayers,
  P extends string = 'vane',
  B extends boolean = true,
>(
  options: VaneSystemOptions<T, C, L, P, B>,
): VaneSystem<VaneSystemTokens<T, P>, VaneSystemConditionName<C, B>, L[number]> {
  return createSystemInternal(undefined, options)
}

export function createSystemForEngine<
  const Constructors extends object,
  const T extends object,
  const C extends Record<string, VaneConditionInput> = Record<never, never>,
  const L extends readonly string[] = VaneDefaultLayers,
  P extends string = 'vane',
  B extends boolean = true,
>(
  binding: VaneSystemEngineBinding<Constructors>,
  options: VaneEngineSystemOptions<T, C, L, P, B>,
): VaneSystem<VaneSystemTokens<T, P>, VaneSystemConditionName<C, B>, L[number], Constructors> {
  return createSystemInternal(binding, options as VaneSystemOptions<T, C, L, P, B>)
}

function createSystemInternal<
  const Constructors extends object,
  const T extends object,
  const C extends Record<string, VaneConditionInput>,
  const L extends readonly string[],
  P extends string,
  B extends boolean,
>(
  binding: VaneSystemEngineBinding<Constructors> | undefined,
  options: VaneSystemOptions<T, C, L, P, B>,
): VaneSystem<VaneSystemTokens<T, P>, VaneSystemConditionName<C, B>, L[number], Constructors> {
  const file = requireStyleModule('createSystem')
  const prefix = options.prefix ?? 'vane'
  const root = options.root ?? ':root'
  const layers = options.layers ?? VANE_DEFAULT_LAYERS

  if (!/^-?(?:[_a-z]|[^\0-\x7F])(?:[-\w]|[^\0-\x7F])*$/i.test(prefix)) {
    throw new VaneError({
      code: 'VANE_SYSTEM_INVALID_PREFIX',
      message: `'${prefix}' is not a valid design-system prefix`,
      file,
      fix: 'use a stable CSS identifier such as \'app\', \'prism\', or \'acme-ui\'',
    })
  }

  if (root.includes('&') || checkSelector(root)) {
    throw new VaneError({
      code: 'VANE_SYSTEM_INVALID_ROOT',
      message: `'${root}' is not a valid absolute system root selector`,
      file,
      fix: 'use an absolute selector such as \':root\', \'#app\', or \'#widget\' without \'&\'',
    })
  }

  if (layers.length === 0) {
    throw new VaneError({
      code: 'VANE_SYSTEM_UNKNOWN_LAYER',
      message: 'a system declares at least one layer',
      file,
      fix: 'drop the layers key to accept the default order, or declare your own',
    })
  }

  const declaredLayers = layers as readonly string[]
  const tokenLayer = options.tokenLayer ?? (binding === undefined ? undefined : declaredLayers.includes('tokens') ? 'tokens' : layers[0])
  if (tokenLayer !== undefined && !declaredLayers.includes(tokenLayer)) {
    throw new VaneError({
      code: 'VANE_SYSTEM_UNKNOWN_LAYER',
      message: `token layer '${tokenLayer}' is not declared by this system`,
      detail: [`declared layers: ${layers.join(', ')}`],
      file,
      fix: 'add the layer to layers, or choose one of the declared layer names',
    })
  }
  const qualifiedTokenLayer = tokenLayer === undefined ? undefined : `${prefix}.${tokenLayer}`

  // Establish the complete layer order before token/style declarations.
  globalLayer(prefix)
  for (const layer of layers)
    globalLayer({ parent: prefix }, layer)

  // Static graphs and staged builders finalize exactly once at the system
  // boundary. Canonical engine systems refuse already-finalized graphs because
  // their prefix/root identity has already been claimed elsewhere.
  let tokens: object
  if (graphOf(options.tokens)) {
    if (binding !== undefined) {
      throw new VaneError({
        code: 'VANE_ENGINE_INCOMPATIBLE',
        message: 'an engine system cannot consume an already-finalized token graph',
        file,
        fix: 'pass the unfinished module returned by de.defineTokens(); the system owns final names',
      })
    }
    tokens = options.tokens
  }
  else {
    const builder = isTokenBuilder(options.tokens)
      ? options.tokens as unknown as RuntimeTokenBuilder
      : binding === undefined
        ? defineTokens(options.tokens as VaneGraphInput) as unknown as RuntimeTokenBuilder
        : defineTokenModule(binding.requirement, options.tokens as VaneGraphInput) as unknown as RuntimeTokenBuilder

    if (binding !== undefined) {
      const moduleEngine = tokenModuleEngine(builder)
      if (!moduleEngine || !binding.requirement.compatibleSignatures.includes(moduleEngine.signature)) {
        throw new VaneError({
          code: 'VANE_ENGINE_INCOMPATIBLE',
          message: 'this token module is not compatible with the system engine',
          detail: [
            `system engine: ${binding.kernel.signature}`,
            `module engine: ${moduleEngine?.signature ?? 'legacy/unbound'}`,
          ],
          file,
          fix: 'define the module with this engine or an equivalent/compatible parent engine',
        })
      }
    }

    tokens = finalizeTokenModule(builder, {
      prefix,
      root,
      layers,
      ...(binding === undefined ? {} : { serializeValue: (value: VaneCssValue) => binding.kernel.serializeValue(value) }),
      ...(qualifiedTokenLayer === undefined ? {} : { layer: qualifiedTokenLayer }),
      ...(options.checks === undefined ? {} : { checks: options.checks as () => readonly VaneCheck[] }),
    })
  }

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
    ...diagnosticSource(),
    prefix,
    root,
    ...(qualifiedTokenLayer === undefined ? {} : { tokenLayer: qualifiedTokenLayer }),
    ...(binding === undefined ? {} : { engine: binding.kernel.signature }),
    layers: [...layers],
    conditions: describeConditions(conditions),
    ...(options.audit === undefined ? {} : { audit: options.audit }),
  })

  type Bound = VaneSystem<VaneSystemTokens<T, P>, VaneSystemConditionName<C, B>, L[number], Constructors>

  const describedConditions = Object.freeze(describeConditions(conditions)) as Readonly<Record<VaneSystemConditionName<C, B>, string>>
  const kernel = binding?.kernel ?? defaultEngine
  const resolvedGraph = graphOf(tokens)!

  const bound = {
    ...(binding?.kernel.constructors ?? {} as Constructors),

    t: tokens as Bound['t'],
    css: buildPlane('css', bindCss(system) as Bound['css']),
    keyframes: buildPlane('keyframes', bindKeyframes(system)),
    fontFace: buildPlane('fontFace', bindFontFace()),
    globalCss: buildPlane('globalCss', bindGlobalCss(system) as Bound['globalCss']),
    theme: buildPlane('theme', (overrides: VaneThemeOverrides<Bound['t']>, debugId?: string) => standaloneTheme(
      tokens as Bound['t'],
      overrides as VaneThemeOverrides<Bound['t']>,
      debugId,
    )),
    recipe: buildPlane('recipe', bindRecipe(system) as Bound['recipe']),
    anatomy: buildPlane('anatomy', bindAnatomy(system) as Bound['anatomy']),
    port: buildPlane('port', <TValue extends VanePortInput>(defaultValue: TValue, options?: VanePortOptions) =>
      createPort(defaultValue, options, { prefix }) as unknown as VanePort<VanePortWiden<TValue>>),
    defineAtoms: buildPlane('defineAtoms', bindAtoms(system) as Bound['defineAtoms']),
    serialize: (value: VaneValue) => kernel.serializeValue(value, (reference) => {
      if (reference.name)
        return reference.name
      if (reference.path) {
        const node = resolvedGraph.nodes.get(reference.path)
        if (node)
          return node.name
      }
      throw new TypeError(`[vane] system '${prefix}' cannot resolve ${reference.path ?? 'an unnamed value reference'}`)
    }),
    conditions: describedConditions,
    layers: Object.freeze([...layers]) as readonly L[number][],
  }

  return Object.freeze(bound) as Bound
}

type RuntimeTokenBuilder = object

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
