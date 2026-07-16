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
import type { VaneDtcgCodec } from '../internal/interchange'
import type { VaneTokenExplanation } from '../introspect/explain'
import type { VanePortFactory, VanePortInput } from '../ports/types'
import type { VaneAnatomyFactory, VaneRecipeFactory } from '../recipes/types'
import type { VaneTokenPhaseLayers } from '../tokens/graph'
import type {
  VaneCanonicalTokens,
  VaneCheck,
  VaneDefaultTokenPolicy,
  VaneEngineRequirement,
  VaneGraphInput,
  VaneNamesOf,
  VaneResolvedTokens,
  VaneTokenBuilder,
  VaneTokenHandleAny,
  VaneTokenModule,
  VaneTokenOverrides,
  VaneTokenPolicy,
  VaneTokens,
  VaneTokensFromDefinition,
  VaneVarsOf,
} from '../tokens/types'
import type { VaneCssValue, VaneValue } from '../values/types'
import type { VaneAxisDefinitions, VaneAxisRegistry } from './axes'
import type { VaneBaseConditionName, VaneConditionInput } from './conditions'
import type { VaneRuntimeServices } from './live'
import { globalLayer } from '@vanilla-extract/css'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { bindAtoms } from '../atoms/atoms'
import { bindCss } from '../css/css'
import { bindGlobalCss } from '../css/global'
import { bindFontFace, bindKeyframes } from '../css/keyframes'
import { diagnosticSource, VaneError } from '../diagnostics'
import { checkSelector } from '../internal/cssParser'
import { isHandle } from '../internal/handle'
import { record } from '../internal/inspect'
import { VANE_SYSTEM_INTERCHANGE } from '../internal/interchange'
import { requireStyleModule } from '../internal/styleModule'
import { explainToken } from '../introspect/explain'
import { VANE_PROPERTY_ALIASES } from '../plugins/propertyAliases'
import { createPort } from '../ports/port'
import { bindAnatomy } from '../recipes/anatomy'
import { bindRecipe } from '../recipes/recipe'
import { defineTokenModule, finalizeTokenModule, graphOf, isTokenBuilder, runtimeContractOf, runtimeSchemasOf, tokenModuleEngine, tokenModulePaths } from '../tokens/graph'
import { tokenOverride as standaloneTokenOverride } from '../tokens/theme'
import { isVaneValue } from '../values/types'
import { describeAxisRegistry } from './axes'
import { baseConditions, describeConditions, normalizeConditions } from './conditions'
import { createRuntimeServices } from './live'

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
export type VaneSystemTokens<
  T extends object,
  P extends string,
  Policy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
  Canonical extends boolean = false,
> = T extends VaneTokenBuilder<infer G> ? VaneTokens<G, P>
  : T extends VaneTokenModule<infer G, infer ModulePolicy>
    ? Canonical extends true ? VaneCanonicalTokens<G, P, ModulePolicy> : VaneTokens<G, P>
    : T extends VaneGraphInput
      ? Canonical extends true ? VaneCanonicalTokens<T, P, Policy> : VaneTokens<T, P>
      : T

export type VaneEngineSystemOptions<
  T extends object,
  C extends Record<string, VaneConditionInput>,
  L extends readonly string[],
  P extends string,
  B extends boolean,
  Policy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
> = Omit<VaneSystemOptions<T, C, L, P, B>, 'tokens' | 'checks'> & {
  tokens: T & (T extends VaneTokenModule<infer _Graph, infer _ModulePolicy> ? unknown : T extends VaneGraphInput ? unknown : never)
  checks?: (tokens: VaneSystemTokens<T, P, Policy, true>) => readonly VaneCheck[]
}

export type VaneSystemConditionName<C, B extends boolean>
  = (keyof C & string) | (B extends false ? never : VaneBaseConditionName)

// ─── The system ──────────────────────────────────────────────────────────────

export interface VaneBoundSystem<
  T,
  C extends string,
  L extends string,
  Axes extends VaneAxisDefinitions = Record<never, never>,
  Css = VaneCssFunction<C, L>,
> extends VaneRuntimeServices<T, Axes> {
  /** The bound token graph — one import line serves every style file. */
  readonly t: T
  readonly css: Css
  readonly keyframes: VaneKeyframesFunction
  readonly fontFace: VaneFontFaceFunction
  readonly globalCss: VaneGlobalCssFunction<C, L>
  /** A grouped build-time override class in the system token override layer. */
  readonly tokenOverride: (overrides: VaneTokenOverrides<T>, debugId?: string) => string
  /** Variants compress state: props in, classes out ([dux-spec-recipes.md §1]). */
  readonly recipe: VaneRecipeFactory<C, L>
  /** The recipe pattern applied to parts ([dux-spec-recipes.md §3]). */
  readonly anatomy: VaneAnatomyFactory<C, L>
  /** The typed runtime boundary: declare a port with a default, typed by it. */
  readonly port: VanePortFactory
  /** The strict utility lane, defined over your token map ([dux-spec-preset.md §3]). */
  readonly defineAtoms: VaneAtomsFactory<C, L>
  /** Resolve an unfinished module, subtree, or composed selection against this system. */
  readonly tokensOf: <const Selection extends object>(
    selection: Selection,
  ) => VaneTokensFromDefinition<T, Selection>
  /** Project final custom-property names without emitting CSS. */
  readonly namesOf: <const Selection extends object>(
    selection: Selection,
  ) => VaneNamesOf<VaneTokensFromDefinition<T, Selection>>
  /** Project final `var()` references without emitting CSS. */
  readonly varsOf: <const Selection extends object>(
    selection: Selection,
  ) => VaneVarsOf<VaneTokensFromDefinition<T, Selection>>
  /** Serialize a portable value with this system's finalized reference map. */
  readonly serialize: (value: VaneValue) => string
  /** Explain one token from authored expression through every emitted context. */
  readonly explain: (token: VaneTokenHandleAny) => VaneTokenExplanation
  /** Read-only normalized authoring context for integrations and inspection. */
  readonly conditions: Readonly<Record<C, string>>
  readonly layers: readonly L[]
}

export type VaneSystem<
  T,
  C extends string,
  L extends string,
  Constructors extends object = Record<never, never>,
  Axes extends VaneAxisDefinitions = Record<never, never>,
  Css = VaneCssFunction<C, L>,
> = VaneBoundSystem<T, C, L, Axes, Css> & Readonly<Constructors>

export interface VaneSystemEngineBinding<
  Constructors extends object,
  TokenPolicy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
  Axes extends VaneAxisDefinitions = VaneAxisDefinitions,
> {
  readonly kernel: VaneEngineKernel<Constructors>
  readonly requirement: VaneEngineRequirement
  readonly tokenPolicy: TokenPolicy
  readonly axes: VaneAxisRegistry<Axes>
  readonly dtcg: readonly VaneDtcgCodec[]
}

export function createSystemForEngine<
  const Constructors extends object,
  const TokenPolicy extends VaneTokenPolicy,
  const Axes extends VaneAxisDefinitions,
  Css,
  const T extends object,
  const C extends Record<string, VaneConditionInput> = Record<never, never>,
  const L extends readonly string[] = VaneDefaultLayers,
  P extends string = 'vane',
  B extends boolean = true,
>(
  binding: VaneSystemEngineBinding<Constructors, TokenPolicy, Axes>,
  options: VaneEngineSystemOptions<T, C, L, P, B, TokenPolicy>,
): VaneSystem<VaneSystemTokens<T, P, TokenPolicy, true>, VaneSystemConditionName<C, B>, L[number], Constructors, Axes, Css> {
  return createSystemInternal<Constructors, T, C, L, P, B, TokenPolicy, true, Axes, Css>(
    binding,
    options as VaneSystemOptions<T, C, L, P, B>,
  )
}

function createSystemInternal<
  const Constructors extends object,
  const T extends object,
  const C extends Record<string, VaneConditionInput>,
  const L extends readonly string[],
  P extends string,
  B extends boolean,
  TokenPolicy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
  Canonical extends boolean = false,
  Axes extends VaneAxisDefinitions = Record<never, never>,
  Css = VaneCssFunction<VaneSystemConditionName<C, B>, L[number]>,
>(
  binding: VaneSystemEngineBinding<Constructors, TokenPolicy, Axes>,
  options: VaneSystemOptions<T, C, L, P, B>,
): VaneSystem<VaneSystemTokens<T, P, TokenPolicy, Canonical>, VaneSystemConditionName<C, B>, L[number], Constructors, Axes, Css> {
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
  const tokenLayer = options.tokenLayer ?? (declaredLayers.includes('tokens') ? 'tokens' : layers[0])
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

  let phaseLayers: VaneTokenPhaseLayers | undefined
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
    throw new VaneError({
      code: 'VANE_ENGINE_INCOMPATIBLE',
      message: 'an engine system cannot consume an already-finalized token graph',
      file,
      fix: 'pass the unfinished module returned by de.defineTokens(); the system owns final names',
    })
  }
  else {
    const builder = isTokenBuilder(options.tokens)
      ? options.tokens as unknown as RuntimeTokenBuilder
      : defineTokenModule(binding.requirement, binding.tokenPolicy, options.tokens as VaneGraphInput) as unknown as RuntimeTokenBuilder

    const moduleEngine = tokenModuleEngine(builder)
    if (!moduleEngine || !binding.requirement.compatibleSignatures.includes(moduleEngine.signature)) {
      throw new VaneError({
        code: 'VANE_ENGINE_INCOMPATIBLE',
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
      serializeValue: (value: VaneCssValue) => binding.kernel.serializeValue(value),
      support: binding.kernel.support,
      axes: binding.axes,
      dtcgCodecIds: new Set(binding.dtcg.map(codec => codec.extension)),
      ...(phaseLayers === undefined ? {} : { phaseLayers }),
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

  const aliasConfig = VANE_PROPERTY_ALIASES in binding.kernel.constructors
    ? (binding.kernel.constructors as any)[VANE_PROPERTY_ALIASES]
    : undefined
  if (aliasConfig) {
    for (const alias of Object.keys(aliasConfig.aliases)) {
      if (conditions.has(alias)) {
        throw new VaneError({
          code: 'VANE_SYSTEM_CONDITION_COLLISION',
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

  type Bound = VaneSystem<VaneSystemTokens<T, P, TokenPolicy, Canonical>, VaneSystemConditionName<C, B>, L[number], Constructors, Axes, Css>

  const describedConditions = Object.freeze(describeConditions(conditions)) as Readonly<Record<VaneSystemConditionName<C, B>, string>>
  const kernel = binding.kernel
  const resolvedGraph = graphOf(tokens)!
  const runtimeServices = createRuntimeServices<Bound['t'], Axes>(runtimeContract, runtimeSchemasOf(tokens))
  const serializeSystemValue = (value: unknown): string | number => {
    if (typeof value === 'number') {
      if (!Number.isFinite(value))
        throw new RangeError(`[vane] a CSS number must be finite; received ${value}`)
      return Object.is(value, -0) ? 0 : value
    }
    if (typeof value === 'string') {
      if (value.trim().length === 0)
        throw new TypeError('[vane] a CSS value cannot be empty')
      return value
    }
    if (isHandle(value))
      return String(value)
    if ((typeof value === 'object' || typeof value === 'function') && value !== null && 'var' in value)
      return (value as { readonly var: string }).var
    if (isVaneValue(value)) {
      return kernel.serializeValue(value, (reference) => {
        if (reference.name)
          return reference.name
        if (reference.path) {
          const node = resolvedGraph.nodes.get(reference.path)
          if (node)
            return node.name
        }
        throw new TypeError(`[vane] system '${prefix}' cannot resolve ${reference.path ?? 'an unnamed value reference'}`)
      })
    }
    throw new TypeError('[vane] a system value must be CSS text, a finite number, a token, a port, or a vane value')
  }
  const projectTokens = (selection: object): object => {
    if (!isTokenBuilder(selection))
      return selection

    const paths = tokenModulePaths(selection, tokens)
    if (!paths) {
      throw new VaneError({
        code: 'VANE_ENGINE_INCOMPATIBLE',
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
    tokenOverride: buildPlane('tokenOverride', (overrides: VaneTokenOverrides<Bound['t']>, debugId?: string) => standaloneTokenOverride(
      tokens as Bound['t'],
      overrides as VaneTokenOverrides<Bound['t']>,
      debugId,
    )),
    recipe: buildPlane('recipe', bindRecipe(system) as Bound['recipe']),
    anatomy: buildPlane('anatomy', bindAnatomy(system) as Bound['anatomy']),
    port: buildPlane('port', ((input: VanePortInput, options?: object) =>
      createPort(input, options as any, { prefix, serialize: serializeSystemValue })) as Bound['port']),
    defineAtoms: buildPlane('defineAtoms', bindAtoms(system) as Bound['defineAtoms']),
    tokensOf: buildPlane('tokensOf', projectTokens as Bound['tokensOf']),
    namesOf: buildPlane('namesOf', ((selection: object) => project(selection, 'name')) as Bound['namesOf']),
    varsOf: buildPlane('varsOf', ((selection: object) => project(selection, 'var')) as Bound['varsOf']),
    explain: buildPlane('explain', ((token: VaneTokenHandleAny) => explainToken(resolvedGraph, token)) as Bound['explain']),
    runtime: appPlane(runtimeServices.runtime, 'restoreRuntimeFactory', runtimeContract),
    reconcileRuntimeSnapshot: appPlane(runtimeServices.reconcileRuntimeSnapshot, 'restoreRuntimeReconciler', runtimeContract),
    runtimeStyle: appPlane(runtimeServices.runtimeStyle, 'restoreRuntimeStyle', runtimeContract),
    runtimeProps: appPlane(runtimeServices.runtimeProps, 'restoreRuntimeProps', runtimeContract),
    serialize: (value: VaneValue) => String(serializeSystemValue(value)),
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

  Object.defineProperty(bound, VANE_SYSTEM_INTERCHANGE, {
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
      `[vane] ${path.join('.') || 'projection'} is not a resolved token handle or token subtree`,
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

function appPlane<F>(fn: F, importName: string, contract: object): F {
  addFunctionSerializer(fn as Parameters<typeof addFunctionSerializer>[0], {
    importPath: '@mszr/vane-dux/runtime',
    importName,
    args: [contract as any],
  })
  return fn
}

function serializableSystemValue(value: unknown, name: string, seen = new WeakMap<object, unknown>()): unknown {
  if (typeof value === 'function') {
    if (Object.hasOwn(value, '__recipe__'))
      return value

    const wrapper = function (this: unknown, ...args: unknown[]): unknown {
      return Reflect.apply(value, this, args)
    }

    addFunctionSerializer(wrapper, {
      importPath: '@mszr/vane-dux/runtime',
      importName: 'restoreBuildPlane',
      args: [{ name }],
    })

    for (const [key, child] of Object.entries(value)) {
      Object.defineProperty(wrapper, key, {
        configurable: true,
        enumerable: true,
        value: serializableSystemValue(child, `${name}.${key}`),
      })
    }

    return wrapper
  }

  if (Array.isArray(value))
    return value.map((child, index) => serializableSystemValue(child, `${name}[${index}]`, seen))

  if (typeof value !== 'object' || value === null || Object.getPrototypeOf(value) !== Object.prototype)
    return value

  const existing = seen.get(value)
  if (existing !== undefined)
    return existing

  const clone: Record<string, unknown> = {}
  seen.set(value, clone)

  for (const [key, child] of Object.entries(value))
    clone[key] = serializableSystemValue(child, `${name}.${key}`, seen)

  return Object.freeze(clone)
}
