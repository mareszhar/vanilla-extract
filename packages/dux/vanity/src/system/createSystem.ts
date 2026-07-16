/**
 * `createSystem` — bind once, typed everywhere ([vanity-spec-css.md §1]): a
 * factory that closes over tokens, conditions, and layers and returns
 * authoring functions whose types are inferred. No codegen, no artifact
 * directory — inference is the codegen. The floor is engineered: tokens can be
 * defined inline and `t` always comes back out, layers default, and the base
 * condition set is already there. The happy path is one file, one call.
 */

import type { VanityAtomsFactory } from '../atoms/types'
import type { VanityCssFunction, VanityCssPropertyName, VanityFontFaceFunction, VanityGlobalCssFunction, VanityKeyframesFunction } from '../css/types'
import type { VanityEngineKernel } from '../internal/engineKernel'
import type { VanityAuditConfig } from '../internal/inspect'
import type { VanityDtcgCodec } from '../internal/interchange'
import type { VanityTokenExplanation } from '../introspect/explain'
import type { VanityPortFactory, VanityPortInput } from '../ports/types'
import type { VanityAnatomyFactory, VanityRecipeFactory } from '../recipes/types'
import type { VanityTokenPhaseLayers } from '../tokens/graph'
import type {
  VanityCanonicalTokens,
  VanityCheck,
  VanityDefaultTokenPolicy,
  VanityEngineRequirement,
  VanityGraphInput,
  VanityNamesOf,
  VanityResolvedTokens,
  VanityTokenBuilder,
  VanityTokenHandleAny,
  VanityTokenModule,
  VanityTokenOverrides,
  VanityTokenPolicy,
  VanityTokens,
  VanityTokensFromDefinition,
  VanityVarsOf,
} from '../tokens/types'
import type { VanityCssValue, VanityValue } from '../values/types'
import type { VanityAxisDefinitions, VanityAxisRegistry } from './axes'
import type { VanityBaseConditionName, VanityConditionInput } from './conditions'
import type { VanityRuntimeServices } from './live'
import { globalLayer } from '@vanilla-extract/css'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { bindAtoms } from '../atoms/atoms'
import { bindCss } from '../css/css'
import { bindGlobalCss } from '../css/global'
import { bindFontFace, bindKeyframes } from '../css/keyframes'
import { diagnosticSource, VanityError } from '../diagnostics'
import { checkSelector } from '../internal/cssParser'
import { isHandle } from '../internal/handle'
import { record } from '../internal/inspect'
import { VANITY_SYSTEM_INTERCHANGE } from '../internal/interchange'
import { requireStyleModule } from '../internal/styleModule'
import { explainToken } from '../introspect/explain'
import { VANITY_PROPERTY_ALIASES } from '../plugins/propertyAliases'
import { createPort } from '../ports/port'
import { bindAnatomy } from '../recipes/anatomy'
import { bindRecipe } from '../recipes/recipe'
import { defineTokenModule, finalizeTokenModule, graphOf, isTokenBuilder, runtimeContractOf, runtimeSchemasOf, tokenModuleEngine, tokenModulePaths } from '../tokens/graph'
import { tokenOverride as standaloneTokenOverride } from '../tokens/theme'
import { isVanityValue } from '../values/types'
import { describeAxisRegistry } from './axes'
import { baseConditions, describeConditions, normalizeConditions } from './conditions'
import { createRuntimeServices } from './live'

export const VANITY_DEFAULT_LAYERS = ['reset', 'tokens', 'recipes', 'utilities', 'overrides'] as const

export type VanityDefaultLayers = typeof VANITY_DEFAULT_LAYERS

/** The system's own layers; authored styles default to the first layer after them. */
const SYSTEM_LAYERS: readonly string[] = ['reset', 'tokens']

// ─── Options ─────────────────────────────────────────────────────────────────

/**
 * A condition name colliding with a CSS property is refused at the definition
 * key (`never` value → error at that key); the build diagnostic carries the
 * full sentence (`VANITY_SYSTEM_CONDITION_COLLISION`).
 */
export type VanityConditionsInput<C> = {
  [K in keyof C]: K extends VanityCssPropertyName ? never : VanityConditionInput
}

export interface VanitySystemOptions<
  T extends object,
  C extends Record<string, VanityConditionInput>,
  L extends readonly string[],
  P extends string,
  B extends boolean,
> {
  /** A raw token graph or an unfinished engine-bound module; `t` is always returned. */
  tokens: T & VanitySystemTokenInput<T>
  conditions?: C & VanityConditionsInput<C>
  /** Cascade-layer order, `['reset', 'tokens', 'recipes', 'utilities', 'overrides']` by default. */
  layers?: L
  /** The emitted custom-property prefix: `--vanity-*` by default. */
  prefix?: P
  /** The absolute selector that owns ordinary token declarations. */
  root?: string
  /** The declared layer that owns ordinary token declarations. */
  tokenLayer?: L[number]
  /** Build-time checks over an inline token graph ([vanity-spec-tokens.md §5]); a `defineTokens` result brings its own. */
  checks?: (tokens: VanitySystemTokens<T, P>) => readonly VanityCheck[]
  /** Opt out of the built-in base condition set. */
  baseConditions?: B
  /**
   * Per-audit promotion ([vanity-spec-introspection.md §3]): every audit warns by
   * default; `'error'` makes one a hard gate, `'off'` silences one. Declared
   * on the system so the quality bar travels with the design system.
   */
  audit?: VanityAuditConfig
}

type VanitySystemTokenInput<T>
  = T extends VanityResolvedTokens ? unknown
    : T extends VanityTokenBuilder<infer _Graph> ? unknown
      : T extends VanityGraphInput ? unknown
        : never

/** Static graphs and unfinished builders compile here; built tokens pass through untouched. */
export type VanitySystemTokens<
  T extends object,
  P extends string,
  Policy extends VanityTokenPolicy = VanityDefaultTokenPolicy,
  Canonical extends boolean = false,
> = T extends VanityTokenBuilder<infer G> ? VanityTokens<G, P>
  : T extends VanityTokenModule<infer G, infer ModulePolicy>
    ? Canonical extends true ? VanityCanonicalTokens<G, P, ModulePolicy> : VanityTokens<G, P>
    : T extends VanityGraphInput
      ? Canonical extends true ? VanityCanonicalTokens<T, P, Policy> : VanityTokens<T, P>
      : T

export type VanityEngineSystemOptions<
  T extends object,
  C extends Record<string, VanityConditionInput>,
  L extends readonly string[],
  P extends string,
  B extends boolean,
  Policy extends VanityTokenPolicy = VanityDefaultTokenPolicy,
> = Omit<VanitySystemOptions<T, C, L, P, B>, 'tokens' | 'checks'> & {
  tokens: T & (T extends VanityTokenModule<infer _Graph, infer _ModulePolicy> ? unknown : T extends VanityGraphInput ? unknown : never)
  checks?: (tokens: VanitySystemTokens<T, P, Policy, true>) => readonly VanityCheck[]
}

export type VanitySystemConditionName<C, B extends boolean>
  = (keyof C & string) | (B extends false ? never : VanityBaseConditionName)

// ─── The system ──────────────────────────────────────────────────────────────

export interface VanityBoundSystem<
  T,
  C extends string,
  L extends string,
  Axes extends VanityAxisDefinitions = Record<never, never>,
  Css = VanityCssFunction<C, L>,
> extends VanityRuntimeServices<T, Axes> {
  /** The bound token graph — one import line serves every style file. */
  readonly t: T
  readonly css: Css
  readonly keyframes: VanityKeyframesFunction
  readonly fontFace: VanityFontFaceFunction
  readonly globalCss: VanityGlobalCssFunction<C, L>
  /** A grouped build-time override class in the system token override layer. */
  readonly tokenOverride: (overrides: VanityTokenOverrides<T>, debugId?: string) => string
  /** Variants compress state: props in, classes out ([vanity-spec-recipes.md §1]). */
  readonly recipe: VanityRecipeFactory<C, L>
  /** The recipe pattern applied to parts ([vanity-spec-recipes.md §3]). */
  readonly anatomy: VanityAnatomyFactory<C, L>
  /** The typed runtime boundary: declare a port with a default, typed by it. */
  readonly port: VanityPortFactory
  /** The strict utility lane, defined over your token map ([vanity-spec-preset.md §3]). */
  readonly defineAtoms: VanityAtomsFactory<C, L>
  /** Resolve an unfinished module, subtree, or composed selection against this system. */
  readonly tokensOf: <const Selection extends object>(
    selection: Selection,
  ) => VanityTokensFromDefinition<T, Selection>
  /** Project final custom-property names without emitting CSS. */
  readonly namesOf: <const Selection extends object>(
    selection: Selection,
  ) => VanityNamesOf<VanityTokensFromDefinition<T, Selection>>
  /** Project final `var()` references without emitting CSS. */
  readonly varsOf: <const Selection extends object>(
    selection: Selection,
  ) => VanityVarsOf<VanityTokensFromDefinition<T, Selection>>
  /** Serialize a portable value with this system's finalized reference map. */
  readonly serialize: (value: VanityValue) => string
  /** Explain one token from authored expression through every emitted context. */
  readonly explain: (token: VanityTokenHandleAny) => VanityTokenExplanation
  /** Read-only normalized authoring context for integrations and inspection. */
  readonly conditions: Readonly<Record<C, string>>
  readonly layers: readonly L[]
}

export type VanitySystem<
  T,
  C extends string,
  L extends string,
  Constructors extends object = Record<never, never>,
  Axes extends VanityAxisDefinitions = Record<never, never>,
  Css = VanityCssFunction<C, L>,
> = VanityBoundSystem<T, C, L, Axes, Css> & Readonly<Constructors>

export interface VanitySystemEngineBinding<
  Constructors extends object,
  TokenPolicy extends VanityTokenPolicy = VanityDefaultTokenPolicy,
  Axes extends VanityAxisDefinitions = VanityAxisDefinitions,
> {
  readonly kernel: VanityEngineKernel<Constructors>
  readonly requirement: VanityEngineRequirement
  readonly tokenPolicy: TokenPolicy
  readonly axes: VanityAxisRegistry<Axes>
  readonly dtcg: readonly VanityDtcgCodec[]
}

export function createSystemForEngine<
  const Constructors extends object,
  const TokenPolicy extends VanityTokenPolicy,
  const Axes extends VanityAxisDefinitions,
  Css,
  const T extends object,
  const C extends Record<string, VanityConditionInput> = Record<never, never>,
  const L extends readonly string[] = VanityDefaultLayers,
  P extends string = 'vanity',
  B extends boolean = true,
>(
  binding: VanitySystemEngineBinding<Constructors, TokenPolicy, Axes>,
  options: VanityEngineSystemOptions<T, C, L, P, B, TokenPolicy>,
): VanitySystem<VanitySystemTokens<T, P, TokenPolicy, true>, VanitySystemConditionName<C, B>, L[number], Constructors, Axes, Css> {
  return createSystemInternal<Constructors, T, C, L, P, B, TokenPolicy, true, Axes, Css>(
    binding,
    options as VanitySystemOptions<T, C, L, P, B>,
  )
}

function createSystemInternal<
  const Constructors extends object,
  const T extends object,
  const C extends Record<string, VanityConditionInput>,
  const L extends readonly string[],
  P extends string,
  B extends boolean,
  TokenPolicy extends VanityTokenPolicy = VanityDefaultTokenPolicy,
  Canonical extends boolean = false,
  Axes extends VanityAxisDefinitions = Record<never, never>,
  Css = VanityCssFunction<VanitySystemConditionName<C, B>, L[number]>,
>(
  binding: VanitySystemEngineBinding<Constructors, TokenPolicy, Axes>,
  options: VanitySystemOptions<T, C, L, P, B>,
): VanitySystem<VanitySystemTokens<T, P, TokenPolicy, Canonical>, VanitySystemConditionName<C, B>, L[number], Constructors, Axes, Css> {
  const file = requireStyleModule('createSystem')
  const prefix = options.prefix ?? 'vanity'
  const root = options.root ?? ':root'
  const layers = options.layers ?? VANITY_DEFAULT_LAYERS

  if (!/^-?(?:[_a-z]|[^\0-\x7F])(?:[-\w]|[^\0-\x7F])*$/i.test(prefix)) {
    throw new VanityError({
      code: 'VANITY_SYSTEM_INVALID_PREFIX',
      message: `'${prefix}' is not a valid design-system prefix`,
      file,
      fix: 'use a stable CSS identifier such as \'app\', \'prism\', or \'acme-ui\'',
    })
  }

  if (root.includes('&') || checkSelector(root)) {
    throw new VanityError({
      code: 'VANITY_SYSTEM_INVALID_ROOT',
      message: `'${root}' is not a valid absolute system root selector`,
      file,
      fix: 'use an absolute selector such as \':root\', \'#app\', or \'#widget\' without \'&\'',
    })
  }

  if (layers.length === 0) {
    throw new VanityError({
      code: 'VANITY_SYSTEM_UNKNOWN_LAYER',
      message: 'a system declares at least one layer',
      file,
      fix: 'drop the layers key to accept the default order, or declare your own',
    })
  }

  const declaredLayers = layers as readonly string[]
  const tokenLayer = options.tokenLayer ?? (declaredLayers.includes('tokens') ? 'tokens' : layers[0])
  if (tokenLayer !== undefined && !declaredLayers.includes(tokenLayer)) {
    throw new VanityError({
      code: 'VANITY_SYSTEM_UNKNOWN_LAYER',
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

  let phaseLayers: VanityTokenPhaseLayers | undefined
  if (qualifiedTokenLayer !== undefined) {
    const baseLayer = globalLayer({ parent: qualifiedTokenLayer }, 'base')
    const axesLayer = globalLayer({ parent: qualifiedTokenLayer }, 'axes')
    const axisLayers = Object.freeze(Object.fromEntries(binding.axes.order.map(axis => [
      axis,
      globalLayer({ parent: axesLayer }, axis),
    ])))
    const casesLayer = globalLayer({ parent: qualifiedTokenLayer }, 'cases')
    const overridesLayer = globalLayer({ parent: qualifiedTokenLayer }, 'overrides')
    phaseLayers = Object.freeze({
      root: qualifiedTokenLayer,
      base: baseLayer,
      axes: axisLayers,
      cases: casesLayer,
      overrides: overridesLayer,
    })
  }

  // Static graphs and staged builders finalize exactly once at the system
  // boundary. Canonical engine systems refuse already-finalized graphs because
  // their prefix/root identity has already been claimed elsewhere.
  let tokens: object
  if (graphOf(options.tokens)) {
    throw new VanityError({
      code: 'VANITY_ENGINE_INCOMPATIBLE',
      message: 'an engine system cannot consume an already-finalized token graph',
      file,
      fix: 'pass the unfinished module returned by de.defineTokens(); the system owns final names',
    })
  }
  else {
    const builder = isTokenBuilder(options.tokens)
      ? options.tokens as unknown as RuntimeTokenBuilder
      : defineTokenModule(binding.requirement, binding.tokenPolicy, options.tokens as VanityGraphInput) as unknown as RuntimeTokenBuilder

    const moduleEngine = tokenModuleEngine(builder)
    if (!moduleEngine || !binding.requirement.compatibleSignatures.includes(moduleEngine.signature)) {
      throw new VanityError({
        code: 'VANITY_ENGINE_INCOMPATIBLE',
        message: 'this token module is not compatible with the system engine',
        detail: [
          `system engine: ${binding.kernel.signature}`,
          `module engine: ${moduleEngine?.signature ?? 'unbound'}`,
        ],
        file,
        fix: 'define the module with this engine or an equivalent/compatible parent engine',
      })
    }

    tokens = finalizeTokenModule(builder, {
      prefix,
      root,
      layers,
      serializeValue: (value: VanityCssValue) => binding.kernel.serializeValue(value),
      support: binding.kernel.support,
      axes: binding.axes,
      dtcgCodecIds: new Set(binding.dtcg.map(codec => codec.extension)),
      ...(phaseLayers === undefined ? {} : { phaseLayers }),
      ...(qualifiedTokenLayer === undefined ? {} : { layer: qualifiedTokenLayer }),
      ...(options.checks === undefined ? {} : { checks: options.checks as () => readonly VanityCheck[] }),
    })
  }

  const conditions = normalizeConditions(
    {
      ...(options.baseConditions === false ? {} : baseConditions()),
      ...options.conditions,
    },
    file,
  )

  const aliasConfig = VANITY_PROPERTY_ALIASES in binding.kernel.constructors
    ? (binding.kernel.constructors as any)[VANITY_PROPERTY_ALIASES]
    : undefined
  if (aliasConfig) {
    for (const alias of Object.keys(aliasConfig.aliases)) {
      if (conditions.has(alias)) {
        throw new VanityError({
          code: 'VANITY_SYSTEM_CONDITION_COLLISION',
          message: `property alias '${alias}' collides with a condition of this system`,
          path: alias,
          file,
          fix: 'rename either the alias or the condition so a rule key has one meaning',
        })
      }
    }
  }

  const system = {
    conditions,
    layers,
    defaultLayer: layers.find(layer => !SYSTEM_LAYERS.includes(layer)) ?? layers[0],
    globalDefaultLayer: layers.includes('reset') ? 'reset' : layers[0],
    layerRoot: prefix,
    ...(aliasConfig === undefined ? {} : { propertyAliases: aliasConfig }),
  }
  const runtimeContract = runtimeContractOf(tokens)!

  record({
    kind: 'system',
    file,
    ...diagnosticSource(),
    prefix,
    root,
    ...(qualifiedTokenLayer === undefined ? {} : { tokenLayer: qualifiedTokenLayer }),
    engine: binding.kernel.signature,
    supportTarget: binding.kernel.support.id,
    layers: [...layers],
    conditions: describeConditions(conditions),
    ...(binding.axes.order.length === 0 ? {} : { axes: describeAxisRegistry(binding.axes) }),
    ...(options.audit === undefined ? {} : { audit: options.audit }),
    runtime: {
      protocol: runtimeContract.protocol,
      system: runtimeContract.system,
      root: runtimeContract.root,
    },
  })

  type Bound = VanitySystem<VanitySystemTokens<T, P, TokenPolicy, Canonical>, VanitySystemConditionName<C, B>, L[number], Constructors, Axes, Css>

  const describedConditions = Object.freeze(describeConditions(conditions)) as Readonly<Record<VanitySystemConditionName<C, B>, string>>
  const kernel = binding.kernel
  const resolvedGraph = graphOf(tokens)!
  const runtimeServices = createRuntimeServices<Bound['t'], Axes>(runtimeContract, runtimeSchemasOf(tokens))
  const serializeSystemValue = (value: unknown): string | number => {
    if (typeof value === 'number') {
      if (!Number.isFinite(value))
        throw new RangeError(`[vanity] a CSS number must be finite; received ${value}`)
      return Object.is(value, -0) ? 0 : value
    }
    if (typeof value === 'string') {
      if (value.trim().length === 0)
        throw new TypeError('[vanity] a CSS value cannot be empty')
      return value
    }
    if (isHandle(value))
      return String(value)
    if ((typeof value === 'object' || typeof value === 'function') && value !== null && 'var' in value)
      return (value as { readonly var: string }).var
    if (isVanityValue(value)) {
      return kernel.serializeValue(value, (reference) => {
        if (reference.name)
          return reference.name
        if (reference.path) {
          const node = resolvedGraph.nodes.get(reference.path)
          if (node)
            return node.name
        }
        throw new TypeError(`[vanity] system '${prefix}' cannot resolve ${reference.path ?? 'an unnamed value reference'}`)
      })
    }
    throw new TypeError('[vanity] a system value must be CSS text, a finite number, a token, a port, or a vanity value')
  }
  const projectTokens = (selection: object): object => {
    if (!isTokenBuilder(selection))
      return selection

    const paths = tokenModulePaths(selection, tokens)
    if (!paths) {
      throw new VanityError({
        code: 'VANITY_ENGINE_INCOMPATIBLE',
        message: 'this token module was not finalized into the current system',
        file,
        fix: 'compose the module into this system before projecting its tokens, names, or vars',
      })
    }

    const projection: Record<string, unknown> = {}
    for (const path of paths) {
      const parts = path.split('.')
      let source: any = tokens
      let target = projection
      for (let index = 0; index < parts.length; index++) {
        const part = parts[index]!
        source = source[part]
        if (index === parts.length - 1) {
          target[part] = source
        }
        else {
          if (typeof target[part] !== 'object' || target[part] === null)
            target[part] = {}
          target = target[part] as Record<string, unknown>
        }
      }
    }
    return Object.freeze(projection)
  }
  const project = (selection: object, kind: 'name' | 'var'): unknown => mapTokenProjection(
    projectTokens(selection),
    kind,
    [],
  )

  const bound = {
    ...binding.kernel.constructors,

    t: tokens as Bound['t'],
    css: buildPlane('css', bindCss(system) as Bound['css']),
    keyframes: buildPlane('keyframes', bindKeyframes(system)),
    fontFace: buildPlane('fontFace', bindFontFace()),
    globalCss: buildPlane('globalCss', bindGlobalCss(system) as Bound['globalCss']),
    tokenOverride: buildPlane('tokenOverride', (overrides: VanityTokenOverrides<Bound['t']>, debugId?: string) => standaloneTokenOverride(
      tokens as Bound['t'],
      overrides as VanityTokenOverrides<Bound['t']>,
      debugId,
    )),
    recipe: buildPlane('recipe', bindRecipe(system) as Bound['recipe']),
    anatomy: buildPlane('anatomy', bindAnatomy(system) as Bound['anatomy']),
    port: buildPlane('port', ((input: VanityPortInput, options?: object) =>
      createPort(input, options as any, { prefix, serialize: serializeSystemValue })) as Bound['port']),
    defineAtoms: buildPlane('defineAtoms', bindAtoms(system) as Bound['defineAtoms']),
    tokensOf: buildPlane('tokensOf', projectTokens as Bound['tokensOf']),
    namesOf: buildPlane('namesOf', ((selection: object) => project(selection, 'name')) as Bound['namesOf']),
    varsOf: buildPlane('varsOf', ((selection: object) => project(selection, 'var')) as Bound['varsOf']),
    explain: buildPlane('explain', ((token: VanityTokenHandleAny) => explainToken(resolvedGraph, token)) as Bound['explain']),
    runtime: appPlane(runtimeServices.runtime, 'restoreRuntimeFactory', runtimeContract),
    reconcileRuntimeSnapshot: appPlane(runtimeServices.reconcileRuntimeSnapshot, 'restoreRuntimeReconciler', runtimeContract),
    runtimeStyle: appPlane(runtimeServices.runtimeStyle, 'restoreRuntimeStyle', runtimeContract),
    runtimeProps: appPlane(runtimeServices.runtimeProps, 'restoreRuntimeProps', runtimeContract),
    serialize: (value: VanityValue) => String(serializeSystemValue(value)),
    conditions: describedConditions,
    layers: Object.freeze([...layers]) as readonly L[number][],
  }

  // A whole system can cross into app code (for example through a project's
  // explicit Nuxt auto-import surface). Keep build-plane functions callable
  // while the compiler evaluates this module, but give the exported surface a
  // serializable wrapper for the app plane. The wrapper restores the same
  // throwing stub used by individual authoring methods; token handles and
  // runtime services already carry their own serializers and are preserved.
  for (const [key, value] of Object.entries(bound))
    (bound as Record<string, unknown>)[key] = serializableSystemValue(value, key)

  Object.defineProperty(bound, VANITY_SYSTEM_INTERCHANGE, {
    enumerable: false,
    value: Object.freeze({ graph: resolvedGraph, codecs: Object.freeze([...binding.dtcg]) }),
  })

  return Object.freeze(bound) as Bound
}

function mapTokenProjection(
  selection: unknown,
  kind: 'name' | 'var',
  path: string[],
): unknown {
  if (isHandle(selection))
    return kind === 'name' ? selection.$name : selection.$var()

  if (typeof selection !== 'object' || selection === null) {
    throw new TypeError(
      `[vanity] ${path.join('.') || 'projection'} is not a resolved token handle or token subtree`,
    )
  }

  return Object.freeze(Object.fromEntries(Object.entries(selection).map(([key, value]) => [
    key,
    mapTokenProjection(value, kind, [...path, key]),
  ])))
}

type RuntimeTokenBuilder = object

/**
 * Let a bound authoring function cross the build/app boundary as a stub:
 * importing the system module from app code is legal and useful (`t` and
 * published classes), so the build-plane functions beside those
 * exports serialize into throwing stubs instead of poisoning the module
 * ([vanity-patterns.md §1] — app code never executes styling work at runtime).
 */
function buildPlane<F>(name: string, fn: F): F {
  addFunctionSerializer(fn as Parameters<typeof addFunctionSerializer>[0], {
    importPath: '@mszr/vanity/runtime',
    importName: 'restoreBuildPlane',
    args: [{ name }],
  })

  return fn
}

function appPlane<F>(fn: F, importName: string, contract: object): F {
  addFunctionSerializer(fn as Parameters<typeof addFunctionSerializer>[0], {
    importPath: '@mszr/vanity/runtime',
    importName,
    args: [contract as any],
  })
  return fn
}

function serializableSystemValue(value: unknown, name: string, seen = new WeakMap<object, unknown>()): unknown {
  if (typeof value === 'function') {
    const existing = seen.get(value)
    if (existing !== undefined)
      return existing
    seen.set(value, value)

    if (!Object.hasOwn(value, '__recipe__')) {
      addFunctionSerializer(value, {
        importPath: '@mszr/vanity/runtime',
        importName: 'restoreBuildPlane',
        args: [{ name }],
      })
    }

    for (const [key, child] of Object.entries(value))
      serializableSystemValue(child, `${name}.${key}`, seen)

    return value
  }

  if (Array.isArray(value)) {
    const existing = seen.get(value)
    if (existing !== undefined)
      return existing
    seen.set(value, value)
    value.forEach((child, index) => serializableSystemValue(child, `${name}[${index}]`, seen))
    return value
  }

  if (typeof value !== 'object' || value === null || Object.getPrototypeOf(value) !== Object.prototype)
    return value

  const existing = seen.get(value)
  if (existing !== undefined)
    return existing

  seen.set(value, value)

  for (const [key, child] of Object.entries(value))
    serializableSystemValue(child, `${name}.${key}`, seen)

  return value
}
