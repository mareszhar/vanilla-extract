/**
 * `defineTokens` — the graph in plain TS ([dux-spec-tokens.md §1]).
 *
 * The walk builds a handle for every leaf, derivations then run once against
 * the finished handle tree (so references are ordinary property accesses), and
 * one resolution pass classifies liveness, folds or serializes every value,
 * runs the checks, and emits a single `:root` declaration through the
 * vanilla-extract substrate — which is never re-exported.
 */

import type { VaneDiagnostic } from '../diagnostics'
import type { VaneRuntimeBranchHandle, VaneRuntimeHandle, VaneSemanticTokenAddress, VaneTokenMode } from '../internal/handle'
import type { VaneAxisDefinition, VaneAxisRegistry, VaneAxisTriggerArm } from '../system/axes'
import type { VaneRuntimeContract, VaneRuntimeTokenContract } from '../system/live'
import type { VaneCssSupportTarget } from '../values/protocol'
import type { VaneCssValue } from '../values/types'
import type { VaneColorExpr } from './color'
import type { VaneOklch } from './math'
import type { VaneExprTraits, VaneResolver, VaneScheme } from './resolve'
import type {
  VaneEngineRequirement,
  VaneGraphInput,
  VaneTokenBuilder,
  VaneTokenModule,
  VaneTokenModuleOptions,
  VaneTokenPolicy,
  VaneTokens,
  VaneTokensOptions,
} from './types'
import { createGlobalVar, globalLayer, globalStyle } from '@vanilla-extract/css'
import { getFileScope, hasFileScope } from '@vanilla-extract/css/fileScope'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { diagnosticSource, didYouMean, VaneError } from '../diagnostics'
import { checkSelector } from '../internal/cssParser'
import {
  attachAxisBranch,
  attachCaseBranch,
  createBranchHandle,
  createHandle,
  setRuntimeAddress,
  updateHandle,
  VANE_RUNTIME_ADDRESS,
  wireCaseBranches,
} from '../internal/handle'
import { inspecting, record } from '../internal/inspect'
import { sealRuntimeContract } from '../system/live'
import { collectNodeRequirements, nodeOf as valueNodeOf } from '../values/protocol'
import { isCssValue } from '../values/types'
import { TextContrastCheck } from './checks'
import { colorRequirements, handleColorMethods, isColorValue, isContrastValue, toExpr } from './color'
import { isConfiguredToken } from './config'
import { apcaContrast, formatOklch, parseColor, pickLegible, wcagContrast } from './math'
import { tokenName } from './names'
import { collectRefs, exprTraits, foldExpr, serializeContrastPick, serializeExpr } from './resolve'

export const GRAPH = Symbol.for('vane.graph')
export const TOKEN_BUILDER = Symbol.for('vane.tokenBuilder')
const TOKEN_FINALIZE = Symbol.for('vane.tokenFinalize')
const NODE = Symbol.for('vane.node')

const CONTRAST_COLOR_SUPPORT = '(color: contrast-color(red))'

// ─── Graph structures ────────────────────────────────────────────────────────

type VaneLeafDefinition
  = | { kind: 'none' }
    | { kind: 'literal', value: string | number }
    | { kind: 'value', value: VaneCssValue }
    | { kind: 'color', expr: VaneColorExpr, markedLive: boolean }
    | { kind: 'contrast', expr: Extract<VaneColorExpr, { kind: 'contrast' }> }

interface TokenNode {
  /** The dot path: `color.brand`. */
  key: string
  /** The emitted custom-property name: `--vane-color-brand`. */
  name: string
  handle: VaneRuntimeHandle
  derived: boolean
  definition: VaneLeafDefinition
  meta: { description?: string, deprecated?: string }
  contract: TokenContract
  branches: readonly TokenBranch[]
  /** Effective emission location, finalized by the owning system. */
  root: string
  layer?: string
}

interface TokenContract {
  readonly canonical: boolean
  readonly reference: 'val' | 'var'
  readonly emit: boolean
  readonly mutable: boolean
  readonly type: import('../values/types').VaneCssDataType
  readonly register?: unknown
  readonly validate?: unknown
  readonly metadata?: import('./types').VaneTokenMetadata
}

type TokenBranch
  = {
    readonly kind: 'axis'
    readonly axis: string
    readonly mode: string
    readonly definition: VaneLeafDefinition
    readonly handle: VaneRuntimeBranchHandle
  }
  | {
    readonly kind: 'case'
    readonly when: Readonly<Record<string, string>>
    readonly definition: VaneLeafDefinition
    readonly handle: VaneRuntimeBranchHandle
  }

interface NodeResult {
  traits: VaneExprTraits
  mode: VaneTokenMode
  emitted: string
  /** The `contrast-color()` upgrade a live-guarantee pairing declares under `@supports`. */
  supportsUpgrade?: string
}

export interface TokenGraph {
  prefix: string
  root: string
  nodes: Map<string, TokenNode>
  results: Map<string, NodeResult>
  /** Engine-bound serializer; absent only on the deprecated root builder. */
  serializeValue?: (value: VaneCssValue) => string
  support?: VaneCssSupportTarget
  axes?: VaneAxisRegistry<any>
  phaseLayers?: VaneTokenPhaseLayers
  contributions?: ReadonlySet<object>
  file?: string
  runtime?: VaneRuntimeContract
  runtimeSchemas?: Readonly<Record<string, import('./types').VaneStandardSchemaV1>>
}

export function graphOf(tokens: object): TokenGraph | undefined {
  return (tokens as { [GRAPH]?: TokenGraph })[GRAPH]
}

export function runtimeContractOf(tokens: object): VaneRuntimeContract | undefined {
  return graphOf(tokens)?.runtime
}

export function runtimeSchemasOf(tokens: object): Readonly<Record<string, import('./types').VaneStandardSchemaV1>> {
  return graphOf(tokens)?.runtimeSchemas ?? {}
}

function cssOf(graph: TokenGraph, value: VaneCssValue): string {
  return graph.serializeValue?.(value) ?? value.css
}

function nodeOf(handle: VaneRuntimeHandle): TokenNode | undefined {
  return (handle as unknown as { [NODE]?: TokenNode })[NODE]
}

/**
 * Whether a graph handle names a color or a plain value — build-plane
 * knowledge for surfaces that infer a type from a token default (ports).
 * Undefined for handles outside a resolved graph.
 */
export function tokenKindOf(handle: VaneRuntimeHandle): 'color' | 'value' | undefined {
  const node = nodeOf(handle)

  if (!node)
    return undefined

  return node.definition.kind === 'literal' || (node.definition.kind === 'value' && node.definition.value.type !== 'color') ? 'value' : 'color'
}

// ─── defineTokens ────────────────────────────────────────────────────────────

type RuntimeStage = (tokens: Record<string, unknown>) => object
type RuntimeContribution
  = { readonly kind: 'seed', readonly graph: VaneGraphInput, readonly emission: VaneTokenModuleOptions }
    | { readonly kind: 'derive', readonly stage: RuntimeStage, readonly emission: VaneTokenModuleOptions }

const CONTRIBUTION_PATHS = new WeakMap<object, readonly string[]>()

interface RuntimeTokenBuilder {
  readonly [TOKEN_BUILDER]: true
  readonly [TOKEN_FINALIZE]: (options?: RuntimeBuildOptions) => VaneTokens<object, string>
  readonly contributions: readonly RuntimeContribution[]
  readonly engine?: VaneEngineRequirement
  readonly tokenPolicy?: VaneTokenPolicy
  compose: (module: RuntimeTokenBuilder) => RuntimeTokenBuilder
  derive: (stage: RuntimeStage) => RuntimeTokenBuilder
  /** Present only on the deprecated package-root builder. */
  build?: (options?: RuntimeBuildOptions) => VaneTokens<object, string>
}

export interface RuntimeBuildOptions extends VaneTokensOptions<object, string> {
  readonly root?: string
  readonly layer?: string
  readonly layers?: readonly string[]
  readonly serializeValue?: (value: VaneCssValue) => string
  readonly support?: VaneCssSupportTarget
  readonly axes?: VaneAxisRegistry<any>
  readonly phaseLayers?: VaneTokenPhaseLayers
}

export interface VaneTokenPhaseLayers {
  readonly root: string
  readonly base: string
  readonly axes: Readonly<Record<string, string>>
  readonly cases: string
  readonly overrides: string
}

/** Whether a value is the unfinished definition returned by `defineTokens`. */
export function isTokenBuilder(value: unknown): boolean {
  return typeof value === 'object' && value !== null
    && (value as Partial<RuntimeTokenBuilder>)[TOKEN_BUILDER] === true
}

/**
 * Start a topological token definition. Derivation stages are immutable: a
 * shared base can safely branch into independent graphs without stage leakage.
 *
 * @deprecated Use `createEngine().defineTokens()`; this root adapter remains
 * only while inherited domains migrate to the canonical engine dialect.
 */
export function defineTokens<const T extends VaneGraphInput = Record<never, never>>(seed?: T): VaneTokenBuilder<T> {
  const graph = seed ?? {} as T
  return createTokenBuilder([{ kind: 'seed', graph, emission: {} }], undefined, undefined, {}, true) as unknown as VaneTokenBuilder<T>
}

/** Create the canonical unfinished module bound to one semantic engine. */
export function defineTokenModule<
  const T extends VaneGraphInput = Record<never, never>,
  const Policy extends VaneTokenPolicy = VaneTokenPolicy,
>(
  engine: VaneEngineRequirement,
  tokenPolicy: Policy,
  seed?: T,
  options: VaneTokenModuleOptions = {},
): VaneTokenModule<T, Policy> {
  validateModuleOptions(options)
  const graph = snapshotGroup(seed ?? {} as T) as T
  const emission = Object.freeze({ ...options })
  return createTokenBuilder([{ kind: 'seed', graph, emission }], engine, tokenPolicy, emission) as unknown as VaneTokenModule<T, Policy>
}

function createTokenBuilder(
  contributions: readonly RuntimeContribution[],
  engine?: VaneEngineRequirement,
  tokenPolicy?: VaneTokenPolicy,
  derivationEmission: VaneTokenModuleOptions = {},
  exposeLegacyBuild = false,
): RuntimeTokenBuilder {
  const frozenContributions = Object.freeze([...contributions])
  const frozenDerivationEmission = Object.freeze({ ...derivationEmission })
  const finalize = (options?: RuntimeBuildOptions) => buildTokens(frozenContributions, tokenPolicy, options)
  const builder: RuntimeTokenBuilder = {
    [TOKEN_BUILDER]: true as const,
    [TOKEN_FINALIZE]: finalize,
    contributions: frozenContributions,
    engine,
    tokenPolicy,
    compose: (module: RuntimeTokenBuilder) => {
      assertComposableEngine(engine, module.engine)
      return createTokenBuilder(
        [...frozenContributions, ...module.contributions],
        engine ?? module.engine,
        tokenPolicy ?? module.tokenPolicy,
        frozenDerivationEmission,
        exposeLegacyBuild,
      )
    },
    derive: (stage: RuntimeStage) => createTokenBuilder(
      [...frozenContributions, Object.freeze({
        kind: 'derive' as const,
        stage,
        emission: frozenDerivationEmission,
      })],
      engine,
      tokenPolicy,
      frozenDerivationEmission,
      exposeLegacyBuild,
    ),
    ...(exposeLegacyBuild ? { build: finalize } : {}),
  }
  return Object.freeze(builder)
}

/** Internal system boundary: canonical modules have no public `.build()`. */
export function finalizeTokenModule(
  module: unknown,
  options?: RuntimeBuildOptions,
): VaneTokens<object, string> {
  if (!isTokenBuilder(module))
    throw new TypeError('[vane] only an unfinished token module can be finalized')
  return (module as RuntimeTokenBuilder)[TOKEN_FINALIZE](options)
}

function snapshotGroup(group: object): object {
  return Object.freeze(Object.fromEntries(Object.entries(group).map(([key, value]) => [
    key,
    isGroup(value) ? snapshotGroup(value) : value,
  ])))
}

export function tokenModuleEngine(value: unknown): VaneEngineRequirement | undefined {
  return isTokenBuilder(value) ? (value as RuntimeTokenBuilder).engine : undefined
}

function assertComposableEngine(
  target: VaneEngineRequirement | undefined,
  module: VaneEngineRequirement | undefined,
): void {
  if (target === undefined && module === undefined)
    return

  if (target === undefined || module === undefined || !target.compatibleSignatures.includes(module.signature)) {
    throw new VaneError({
      code: 'VANE_ENGINE_INCOMPATIBLE',
      message: 'token modules were created by incompatible design engines',
      detail: [
        `target engine: ${target?.signature ?? 'legacy/unbound'}`,
        `module engine: ${module?.signature ?? 'legacy/unbound'}`,
      ],
      fix: 'define and compose the module with an equivalent engine, or install the same plugin/policy revision',
    })
  }
}

function validateModuleOptions(options: VaneTokenModuleOptions): void {
  if (options.root !== undefined) {
    if (options.root.includes('&') || checkSelector(options.root))
      throw new TypeError(`[vane] token module root '${options.root}' is not a valid absolute CSS selector`)
  }
  if (options.layer !== undefined && !isLayerPath(options.layer))
    throw new TypeError(`[vane] token module layer '${options.layer}' is not a valid dotted CSS layer path`)
}

function isLayerPath(value: string): boolean {
  return value.length > 0 && value.split('.').every(part => /^-?(?:[_a-z]|[^\0-\x7F])(?:[-\w]|[^\0-\x7F])*$/i.test(part))
}

function normalizeEmission(
  module: VaneTokenModuleOptions,
  system: {
    readonly root: string
    readonly layer?: string
    readonly layers?: readonly string[]
    readonly prefix?: string
  },
): { readonly root: string, readonly layer?: string } {
  const root = module.root ?? system.root
  const authoredLayer = module.layer

  if (authoredLayer === undefined)
    return system.layer === undefined ? { root } : { root, layer: system.layer }

  const top = authoredLayer.split('.')[0]!
  if (system.layers && !system.layers.includes(top)) {
    throw new VaneError({
      code: 'VANE_SYSTEM_UNKNOWN_LAYER',
      message: `token module layer '${authoredLayer}' is outside this system's declared layers`,
      detail: [`declared layers: ${system.layers.join(', ')}`],
      fix: `start the module layer with one of: ${system.layers.join(', ')}`,
    })
  }

  const layer = system.prefix === undefined || authoredLayer.startsWith(`${system.prefix}.`)
    ? authoredLayer
    : `${system.prefix}.${authoredLayer}`
  return { root, layer }
}

function buildTokens<T extends object, Prefix extends string = 'vane'>(
  contributions: readonly RuntimeContribution[],
  tokenPolicy: VaneTokenPolicy | undefined,
  options: RuntimeBuildOptions = {},
): VaneTokens<T, Prefix> {
  const prefix = options.prefix ?? 'vane'
  const defaultRoot = options.root ?? ':root'
  const defaultLayer = options.layer
  const file = hasFileScope() ? getFileScope().filePath : undefined
  const nodes = new Map<string, TokenNode>()
  const tree: Record<string, unknown> = {}

  let stageIndex = 0

  for (const contribution of contributions) {
    if (contribution.kind === 'seed') {
      const emission = normalizeEmission(contribution.emission, {
        root: defaultRoot,
        layer: defaultLayer,
        layers: options.layers,
        prefix,
      })
      const added: string[] = []
      walkInto(contribution.graph, [], prefix, nodes, tree, false, emission, tokenPolicy, options.axes, added, file)
      CONTRIBUTION_PATHS.set(contribution, Object.freeze(added))
      continue
    }

    stageIndex++
    hydratePartialGraph(prefix, nodes, options, file)
    const additions = contribution.stage(refsProxy(tree, [], `derivation stage ${stageIndex}`, file))

    if (!isGroup(additions)) {
      throw new VaneError({
        code: 'VANE_TOKENS_INVALID_COLOR',
        message: `derivation stage ${stageIndex} did not return a token group`,
        file,
        fix: 'return an object whose leaves are token values',
      })
    }

    const emission = normalizeEmission(contribution.emission, {
      root: defaultRoot,
      layer: defaultLayer,
      layers: options.layers,
      prefix,
    })
    const added: string[] = []
    walkInto(additions, [], prefix, nodes, tree, true, emission, tokenPolicy, options.axes, added, file)
    CONTRIBUTION_PATHS.set(contribution, Object.freeze(added))
  }

  const unresolved: TokenGraph = {
    prefix,
    root: defaultRoot,
    nodes,
    results: new Map(),
    file,
    contributions: new Set(contributions),
    ...(options.serializeValue === undefined ? {} : { serializeValue: options.serializeValue }),
    ...(options.support === undefined ? {} : { support: options.support }),
    ...(options.axes === undefined ? {} : { axes: options.axes }),
    ...(options.phaseLayers === undefined ? {} : { phaseLayers: options.phaseLayers }),
  }
  const { results, diagnostics } = resolveGraph(unresolved)
  const resolved: TokenGraph = { ...unresolved, results }

  diagnostics.push(...runChecks(options.checks?.(tree as VaneTokens<T, Prefix>) ?? [], resolved))

  if (diagnostics.length > 0)
    throw new VaneError(diagnostics)

  hydrateGraphHandles(resolved)
  resolved.runtime = buildRuntimeContract(resolved)
  resolved.runtimeSchemas = collectRuntimeSchemas(resolved)
  attachRuntimeAddresses(resolved)

  for (const node of nodes.values()) {
    const result = results.get(node.key)!
    const axes: Record<string, Record<string, { value?: string | number, runtime?: import('../internal/handle').VaneHandleRuntimeAddress }>> = {}
    const cases: { when: Readonly<Record<string, string>>, value?: string | number, runtime?: import('../internal/handle').VaneHandleRuntimeAddress }[] = []
    for (const branch of node.branches) {
      if (branch.kind === 'axis') {
        axes[branch.axis] ??= {}
        axes[branch.axis]![branch.mode] = {
          ...(branch.handle.$val === undefined ? {} : { value: branch.handle.$val }),
          ...(branch.handle[VANE_RUNTIME_ADDRESS] === undefined ? {} : { runtime: branch.handle[VANE_RUNTIME_ADDRESS] }),
        }
      }
      else {
        cases.push({
          when: branch.when,
          ...(branch.handle.$val === undefined ? {} : { value: branch.handle.$val }),
          ...(branch.handle[VANE_RUNTIME_ADDRESS] === undefined ? {} : { runtime: branch.handle[VANE_RUNTIME_ADDRESS] }),
        })
      }
    }
    addFunctionSerializer(node.handle as unknown as (...args: unknown[]) => unknown, {
      importPath: '@mszr/vane-dux/runtime',
      importName: 'restoreToken',
      args: [{
        name: node.name,
        path: node.key,
        mode: result.mode,
        reference: node.contract.reference,
        emit: node.contract.emit,
        mutable: node.contract.mutable,
        type: node.contract.type,
        ...(node.definition.kind === 'none' ? {} : { value: result.emitted }),
        ...(node.meta.description === undefined ? {} : { description: node.meta.description }),
        ...(node.meta.deprecated === undefined ? {} : { deprecated: node.meta.deprecated }),
        ...(node.contract.metadata === undefined ? {} : { metadata: node.contract.metadata }),
        ...(node.contract.register === undefined ? {} : { register: serializableRegistration(node, resolved) }),
        ...(runtimeValidationOf(node, resolved) === undefined ? {} : { validate: runtimeValidationOf(node, resolved) }),
        ...(node.handle[VANE_RUNTIME_ADDRESS] === undefined ? {} : { runtime: node.handle[VANE_RUNTIME_ADDRESS] }),
        ...(Object.keys(axes).length === 0 ? {} : { axes }),
        ...(cases.length === 0 ? {} : { cases }),
      } as any],
    })
  }

  emitGraph(resolved)

  Object.defineProperty(tree, GRAPH, { value: resolved })

  if (inspecting())
    recordGraph(resolved)

  return tree as VaneTokens<T, Prefix>
}

function hydratePartialGraph(
  prefix: string,
  nodes: Map<string, TokenNode>,
  options: RuntimeBuildOptions,
  file?: string,
): void {
  if (nodes.size === 0)
    return
  const unresolved: TokenGraph = {
    prefix,
    root: options.root ?? ':root',
    nodes,
    results: new Map(),
    file,
    ...(options.serializeValue === undefined ? {} : { serializeValue: options.serializeValue }),
    ...(options.support === undefined ? {} : { support: options.support }),
    ...(options.axes === undefined ? {} : { axes: options.axes }),
    ...(options.phaseLayers === undefined ? {} : { phaseLayers: options.phaseLayers }),
  }
  const { results, diagnostics } = resolveGraph(unresolved)
  if (diagnostics.length > 0)
    throw new VaneError(diagnostics)
  hydrateGraphHandles({ ...unresolved, results })
}

function hydrateGraphHandles(graph: TokenGraph): void {
  for (const node of graph.nodes.values()) {
    const result = graph.results.get(node.key)!
    updateHandle(node.handle, {
      mode: result.mode,
      value: node.definition.kind === 'none' ? undefined : result.emitted,
      description: node.meta.description,
      deprecated: node.meta.deprecated,
      metadata: node.contract.metadata,
    })

    for (const branch of node.branches)
      branch.handle.$val = serializeBranch(branch.definition, graph)
  }
}

function serializeBranch(definition: VaneLeafDefinition, graph: TokenGraph): string | number | undefined {
  if (definition.kind === 'none')
    return undefined
  if (definition.kind === 'literal')
    return definition.value
  if (definition.kind === 'value')
    return cssOf(graph, definition.value)

  const base = checkResolver(graph, 'light')
  const resolver: VaneResolver = {
    ...base,
    refTraits: (handle) => {
      const node = nodeOf(handle)
      const result = node ? graph.results.get(node.key) : undefined
      return {
        cssLive: (result?.traits.cssLive ?? false) || node?.contract.reference === 'var',
        volatile: (result?.traits.volatile ?? false) || node?.contract.mutable === true,
        conditional: result?.traits.conditional ?? false,
      }
    },
    serializeRef: (handle) => {
      const node = nodeOf(handle)
      if (!node)
        return handle.var
      return node.contract.reference === 'var' ? handle.var : graph.results.get(node.key)!.emitted
    },
  }

  if (definition.kind === 'contrast')
    return serializeContrastPick(definition.expr, resolver)

  const traits = exprTraits(definition.expr, resolver)
  return traits.cssLive || traits.volatile
    ? serializeExpr(definition.expr, resolver)
    : formatOklch(foldExpr(definition.expr, 'light', resolver))
}

function buildRuntimeContract(graph: TokenGraph): VaneRuntimeContract {
  const axisOrder = [...(graph.axes?.order ?? [])]
  const axes = Object.fromEntries(axisOrder.map((axis) => {
    const definition = graph.axes!.definitions[axis]!
    const runtimeArms: { mode: string, arm: VaneAxisTriggerArm | undefined }[] = definition.modeOrder.map((mode: string) => ({
      mode,
      arm: [...definition.modes[mode]!.arms]
        .filter(arm => arm.runtime !== undefined)
        .sort((left, right) => right.priority - left.priority)[0],
    }))
    const names = new Set<string>(runtimeArms.flatMap(entry => entry.arm?.runtime?.name ?? []))
    let attribute: import('../system/live').VaneRuntimeAxisContract['attribute']
    if (names.size === 1) {
      const name = [...names][0]!
      const values: Record<string, string | null> = {}
      let complete = true
      for (const { mode, arm } of runtimeArms) {
        if (arm?.runtime?.name === name)
          values[mode] = arm.runtime.value
        else if (mode === definition.defaultMode && definition.modes[mode]!.arms.length === 0)
          values[mode] = null
        else
          complete = false
      }
      if (complete)
        attribute = { name, values: Object.freeze(values) }
    }
    return [axis, Object.freeze({
      ...(definition.defaultMode === undefined ? {} : { defaultMode: definition.defaultMode }),
      modes: Object.freeze([...definition.modeOrder]),
      ...(attribute === undefined ? {} : { attribute: Object.freeze(attribute) }),
    })]
  }))

  const tokens: VaneRuntimeTokenContract[] = []
  for (const node of graph.nodes.values()) {
    const result = graph.results.get(node.key)!
    const branches = node.branches.map((branch) => {
      const address: Exclude<VaneSemanticTokenAddress, { readonly kind: 'base' }> = branch.kind === 'axis'
        ? { kind: 'axis', axis: branch.axis, mode: branch.mode }
        : { kind: 'case', when: orderedWhen(branch.when, axisOrder) }
      return Object.freeze({
        address,
        ...(usesMutableSlots(node) ? { slot: slotOfBranch(graph.prefix, node, branch) } : {}),
        ...(branch.handle.$val === undefined ? {} : { value: branch.handle.$val }),
      })
    })
    const validation = runtimeValidationOf(node, graph)
    tokens.push(Object.freeze({
      token: Object.freeze(node.key.split('.')),
      name: node.name as `--${string}`,
      root: node.root,
      type: node.contract.type,
      reference: node.contract.reference,
      emit: node.contract.emit,
      mutable: node.contract.mutable,
      ...(node.definition.kind === 'none' ? {} : { value: result.emitted }),
      ...(node.meta.description === undefined ? {} : { description: node.meta.description }),
      ...(node.meta.deprecated === undefined ? {} : { deprecated: node.meta.deprecated }),
      ...(node.contract.metadata === undefined ? {} : { metadata: node.contract.metadata }),
      ...(validation === undefined ? {} : { validation }),
      ...(usesMutableSlots(node) ? { baseSlot: privateAddress(graph.prefix, node.key, 'base') } : {}),
      branches: Object.freeze(branches),
    }))
  }

  return sealRuntimeContract({
    protocol: 1,
    prefix: graph.prefix,
    root: graph.root,
    axisOrder: Object.freeze(axisOrder),
    axes: Object.freeze(axes),
    tokens: Object.freeze(tokens),
  })
}

function collectRuntimeSchemas(graph: TokenGraph): Readonly<Record<string, import('./types').VaneStandardSchemaV1>> {
  const schemas: Record<string, import('./types').VaneStandardSchemaV1> = {}
  for (const node of graph.nodes.values()) {
    const validate = node.contract.validate as import('./types').VaneTokenValidation | undefined
    if (!validate?.schema)
      continue
    const existing = schemas[validate.id]
    if (existing && existing['~standard'].vendor !== validate.schema['~standard'].vendor)
      throw new TypeError(`[vane] runtime validation id '${validate.id}' is claimed by multiple Standard Schema vendors`)
    schemas[validate.id] ??= validate.schema
  }
  return Object.freeze(schemas)
}

function runtimeValidationOf(
  node: TokenNode,
  graph: TokenGraph,
): import('../system/live').VaneRuntimeValidationContract | undefined {
  const validate = node.contract.validate as import('./types').VaneTokenValidation | undefined
  if (!validate)
    return undefined
  const fallback = validate.fallback === undefined
    ? undefined
    : serializeBranch(classifyLeafValue(validate.fallback, `${node.key}.validate.fallback`), graph)
  return Object.freeze({
    id: validate.id,
    runtime: validate.runtime ?? 'dev',
    onInvalid: validate.onInvalid ?? 'throw',
    ...(fallback === undefined ? {} : { fallback: String(fallback) }),
  })
}

function serializableRegistration(node: TokenNode, graph: TokenGraph): unknown {
  if (node.contract.register === true)
    return true
  const plan = planTokenEmission(node, graph).registration
  return plan === undefined
    ? undefined
    : Object.freeze({
        syntax: plan.syntax,
        inherits: plan.inherits,
        ...(plan.initialValue === undefined ? {} : { initialVal: plan.initialValue }),
      })
}

function attachRuntimeAddresses(graph: TokenGraph): void {
  const contract = graph.runtime!
  for (const node of graph.nodes.values()) {
    const token = contract.tokens.find(entry => entry.token.join('.') === node.key)!
    if (!token.mutable || !token.baseSlot)
      continue
    setRuntimeAddress(node.handle, Object.freeze({
      system: contract.system,
      token: token.token,
      address: Object.freeze({ kind: 'base' as const }),
      slot: token.baseSlot,
    }))
    for (const branch of node.branches) {
      const address: Exclude<VaneSemanticTokenAddress, { readonly kind: 'base' }> = branch.kind === 'axis'
        ? { kind: 'axis', axis: branch.axis, mode: branch.mode }
        : { kind: 'case', when: orderedWhen(branch.when, contract.axisOrder) }
      const runtimeBranch = token.branches.find(candidate => sameSemanticAddress(candidate.address, address))!
      setRuntimeAddress(branch.handle, Object.freeze({
        system: contract.system,
        token: token.token,
        address,
        slot: runtimeBranch.slot!,
      }))
    }
  }
}

function orderedWhen(
  when: Readonly<Record<string, string>>,
  axisOrder: readonly string[],
): Readonly<Record<string, string>> {
  const rank = new Map(axisOrder.map((axis, index) => [axis, index]))
  return Object.freeze(Object.fromEntries(Object.entries(when).sort(([left], [right]) =>
    (rank.get(left) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right) ?? Number.MAX_SAFE_INTEGER)
    || left.localeCompare(right))))
}

function sameSemanticAddress(left: VaneSemanticTokenAddress, right: VaneSemanticTokenAddress): boolean {
  if (left.kind !== right.kind)
    return false
  if (left.kind === 'base')
    return true
  if (left.kind === 'axis' && right.kind === 'axis')
    return left.axis === right.axis && left.mode === right.mode
  return left.kind === 'case' && right.kind === 'case'
    && JSON.stringify(left.when) === JSON.stringify(right.when)
}

/** Paths contributed by a module after this system finalized it. */
export function tokenModulePaths(value: unknown, owner?: object): readonly string[] | undefined {
  if (!isTokenBuilder(value))
    return undefined
  const ownerGraph = owner ? graphOf(owner) : undefined
  const paths: string[] = []
  for (const contribution of (value as RuntimeTokenBuilder).contributions) {
    if (ownerGraph?.contributions && !ownerGraph.contributions.has(contribution))
      return undefined
    const contributionPaths = CONTRIBUTION_PATHS.get(contribution)
    if (!contributionPaths)
      return undefined
    paths.push(...contributionPaths)
  }
  return Object.freeze([...new Set(paths)])
}

function walkInto(
  group: object,
  path: string[],
  prefix: string,
  nodes: Map<string, TokenNode>,
  tree: Record<string, unknown>,
  derived: boolean,
  emission: { readonly root: string, readonly layer?: string },
  tokenPolicy: VaneTokenPolicy | undefined,
  axes: VaneAxisRegistry<any> | undefined,
  added: string[],
  file?: string,
): void {
  const groupEmission = tokenPolicy === undefined
    ? emission
    : emissionForGroup(group, emission, path, file)

  for (const [key, raw] of Object.entries(group)) {
    if (tokenPolicy !== undefined && (key === '$description' || key === '$root'))
      continue
    if (tokenPolicy !== undefined && key === '$axes') {
      throw new VaneError({
        code: 'VANE_TOKENS_INVALID_COLOR',
        message: `${path.join('.') || 'the token root'}.$axes is not part of the canonical token language`,
        path: [...path, key].join('.'),
        file,
        fix: 'author axes on each token with de.token({ axes }); the transposed bulk form remains deliberately deferred',
      })
    }
    const leafPath = [...path, key]
    const keyPath = leafPath.join('.')

    if (isGroup(raw)) {
      const existing = tree[key]

      if (existing !== undefined && !isGroup(existing))
        duplicateToken(keyPath, file)

      const child = existing as Record<string, unknown> | undefined ?? {}
      tree[key] = child
      walkInto(raw, leafPath, prefix, nodes, child, derived, groupEmission, tokenPolicy, axes, added, file)
      continue
    }

    if (key in tree)
      duplicateToken(keyPath, file)

    const node = createNode(leafPath, prefix, raw, derived, groupEmission, tokenPolicy, axes)
    nodes.set(node.key, node)
    tree[key] = node.handle
    added.push(node.key)
  }
}

function emissionForGroup(
  group: object,
  inherited: { readonly root: string, readonly layer?: string },
  path: readonly string[],
  file?: string,
): { readonly root: string, readonly layer?: string } {
  const authored = (group as { readonly $root?: unknown }).$root
  if (authored === undefined)
    return inherited
  if (typeof authored !== 'string' || authored.trim().length === 0) {
    throw new VaneError({
      code: 'VANE_SYSTEM_INVALID_ROOT',
      message: `${path.join('.') || 'the token root'}.$root must be a non-empty selector`,
      path: [...path, '$root'].join('.'),
      file,
    })
  }

  const root = authored.includes('&')
    ? authored.replaceAll('&', `:is(${inherited.root})`)
    : authored
  const reason = checkSelector(root)
  if (reason) {
    throw new VaneError({
      code: 'VANE_SYSTEM_INVALID_ROOT',
      message: `${path.join('.') || 'the token root'}.$root does not parse: ${reason}`,
      path: [...path, '$root'].join('.'),
      file,
      fix: 'use an absolute selector, or anchor a relative selector with &',
    })
  }
  return inherited.layer === undefined ? { root } : { root, layer: inherited.layer }
}

function isGroup(value: unknown): value is object {
  return typeof value === 'object' && value !== null
    && !isColorValue(value) && !isContrastValue(value) && !isCssValue(value) && !isConfiguredToken(value)
}

/**
 * Runtime backstop for JavaScript and escaped TypeScript. The public builder
 * catches unknown names at the cursor; this proxy preserves the same exact
 * failure (with a fix) when the type system has been bypassed.
 */
function refsProxy(tree: Record<string, unknown>, path: string[], context: string, file?: string): Record<string, unknown> {
  return new Proxy(tree, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol' || prop in target) {
        const value = Reflect.get(target, prop, receiver)

        return typeof value === 'object' && value !== null && typeof prop === 'string'
          ? refsProxy(value as Record<string, unknown>, [...path, prop], context, file)
          : value
      }

      const refPath = [...path, prop].join('.')
      const suggestion = didYouMean(prop, Object.keys(target))

      throw new VaneError({
        code: 'VANE_TOKENS_UNKNOWN_REF',
        message: `${refPath} is not a token in this graph${suggestion ? ` — did you mean '${suggestion}'?` : ''}`,
        detail: [`while deriving ${context}`],
        path: refPath,
        file,
        fix: suggestion ? `reference ${[...path, suggestion].join('.')}` : 'reference an existing token',
      })
    },
  })
}

function createNode(
  path: string[],
  prefix: string,
  raw: unknown,
  derived: boolean,
  emission: { readonly root: string, readonly layer?: string },
  tokenPolicy: VaneTokenPolicy | undefined,
  axes: VaneAxisRegistry<any> | undefined,
): TokenNode {
  const key = path.join('.')
  const normalized = normalizeToken(raw, key, tokenPolicy, axes)
  const name = tokenName(prefix, path)
  const handle = createHandle({
    name,
    path: key,
    mode: 'static',
    reference: normalized.contract.reference,
    emit: normalized.contract.emit,
    mutable: normalized.contract.mutable,
    type: normalized.contract.type,
    description: normalized.meta.description,
    deprecated: normalized.meta.deprecated,
    metadata: normalized.contract.metadata,
    register: normalized.contract.register,
    validate: normalized.contract.validate,
  })
  wireCaseBranches(handle)
  Object.assign(handle, handleColorMethods(handle))

  const node: TokenNode = {
    key,
    name,
    handle,
    derived,
    root: emission.root,
    ...(emission.layer === undefined ? {} : { layer: emission.layer }),
    definition: { kind: 'none' },
    meta: normalized.meta,
    contract: normalized.contract,
    branches: normalized.branches.map((branch) => {
      const branchHandle = createBranchHandle()
      if (branch.kind === 'axis')
        attachAxisBranch(handle, branch.axis, branch.mode, branchHandle)
      else
        attachCaseBranch(handle, branch.when, branchHandle)
      return { ...branch, handle: branchHandle }
    }),
  }

  Object.defineProperty(handle, NODE, { value: node })
  node.definition = derived && !isConfiguredToken(raw) && raw !== null
    ? classifyLeaf(normalized.rawVal, node)
    : normalized.definition

  if (node.definition.kind === 'literal')
    handle.$val = node.definition.value

  return node
}

interface NormalizedToken {
  readonly rawVal: unknown
  readonly definition: VaneLeafDefinition
  readonly contract: TokenContract
  readonly meta: { description?: string, deprecated?: string }
  readonly branches: readonly (
    | { readonly kind: 'axis', readonly axis: string, readonly mode: string, readonly definition: VaneLeafDefinition }
    | { readonly kind: 'case', readonly when: Readonly<Record<string, string>>, readonly definition: VaneLeafDefinition }
  )[]
}

function normalizeToken(
  raw: unknown,
  key: string,
  policy: VaneTokenPolicy | undefined,
  axes: VaneAxisRegistry<any> | undefined,
): NormalizedToken {
  if (policy === undefined) {
    return {
      rawVal: raw,
      definition: classifyLeafValue(raw, key),
      contract: {
        canonical: false,
        reference: 'var',
        emit: true,
        mutable: isColorValue(raw) && raw.markedLive,
        type: inferTokenType(raw),
      },
      meta: isColorValue(raw) || isContrastValue(raw) ? raw.meta : {},
      branches: [],
    }
  }

  if (raw === null) {
    return {
      rawVal: undefined,
      definition: { kind: 'none' },
      contract: { canonical: true, reference: 'var', emit: false, mutable: false, type: 'unknown' },
      meta: {},
      branches: [],
    }
  }

  const configured = isConfiguredToken(raw)
  const config = configured ? raw.config : undefined
  const hasVal = configured ? Object.hasOwn(config!, 'val') : true
  const rawVal = configured ? config!.val : raw
  const conditional = configured && (config!.mutable === true || config!.axes !== undefined || config!.cases !== undefined)
  const reference = configured
    ? config!.reference ?? (conditional || !hasVal ? 'var' : policy.reference)
    : policy.reference
  const emit = configured
    ? config!.emit ?? (conditional ? true : hasVal ? policy.emit : false)
    : policy.emit

  if (conditional && reference !== 'var')
    invalidTrait(key, 'reference', 'use reference: \'var\' because mutable/axes/cases need a public binding')
  if (conditional && emit !== true)
    invalidTrait(key, 'emit', 'use emit: true because mutable/axes/cases need a public binding')
  if (hasVal && reference === 'var' && emit === false)
    invalidTrait(key, 'emit', 'use reference: \'val\' for a known nonemitted value')

  const type = configured ? raw.type : inferTokenType(rawVal)
  const valueMeta = isColorValue(rawVal) || isContrastValue(rawVal) ? rawVal.meta : {}
  const description = config?.description ?? valueMeta.description
  const deprecated = config?.deprecated === undefined
    ? valueMeta.deprecated
    : typeof config.deprecated === 'string'
      ? config.deprecated
      : config.deprecated.reason ?? config.deprecated.use
  const meta = {
    ...(description === undefined ? {} : { description }),
    ...(deprecated === undefined ? {} : { deprecated }),
  }
  const branches: NormalizedToken['branches'][number][] = []
  const authoredAxes = new Map<string, Record<string, unknown | null>>()

  for (const [axis, modes] of Object.entries(config?.axes ?? {})) {
    const definition = requireAxis(axes, axis, key)
    const authored = { ...modes }
    for (const mode of Object.keys(authored)) {
      if (!(mode in definition.modes))
        invalidTrait(key, `axes.${axis}.${mode}`, `use one of the declared modes: ${definition.modeOrder.join(', ')}`)
    }

    authoredAxes.set(axis, authored)
  }

  const caseAxes = new Set<string>()
  const caseAddresses = new Set<string>()
  for (const entry of config?.cases ?? []) {
    const entries = Object.entries(entry.when)
    if (entries.length < 2)
      invalidTrait(key, 'cases.when', 'a sparse case intersects at least two declared axes; use an axis mode for one dimension')
    const normalizedWhen: Record<string, string> = {}
    for (const axis of axes?.order ?? []) {
      if (!(axis in entry.when))
        continue
      const mode = entry.when[axis]!
      const definition = requireAxis(axes, axis, key)
      if (!(mode in definition.modes))
        invalidTrait(key, `cases.when.${axis}`, `use one of the declared modes: ${definition.modeOrder.join(', ')}`)
      normalizedWhen[axis] = mode
      caseAxes.add(axis)
    }
    for (const axis of Object.keys(entry.when)) {
      if (!(axis in normalizedWhen))
        requireAxis(axes, axis, key)
    }
    const address = Object.entries(normalizedWhen).map(([axis, mode]) => `${axis}:${mode}`).join('|')
    if (caseAddresses.has(address))
      invalidTrait(key, 'cases', `remove the duplicate case ${address}`)
    caseAddresses.add(address)
  }

  const usedAxes = new Set([...authoredAxes.keys(), ...caseAxes])
  if (!hasVal && usedAxes.size > 1)
    invalidTrait(key, 'val', 'a token varying across multiple independent axes needs a base val before sparse overrides')

  if (!hasVal && authoredAxes.size === 1) {
    const [axis, authored] = [...authoredAxes][0]!
    const definition = requireAxis(axes, axis, key)
    const missing = definition.modeOrder.filter(mode => !(mode in authored))
    if (missing.length > 0) {
      invalidTrait(
        key,
        `axes.${axis}`,
        `author every mode when no base val exists; missing: ${missing.join(', ')}`,
      )
    }
  }

  for (const [axis, modes] of authoredAxes) {
    const definition = requireAxis(axes, axis, key)
    for (const [mode, val] of Object.entries(modes)) {
      if (val === null && config?.mutable !== true)
        invalidTrait(key, `axes.${axis}.${mode}`, 'null reserves a runtime address and therefore requires mutable: true')
      if (hasVal && definition.defaultMode === mode && definition.modes[mode]!.arms.length === 0) {
        invalidTrait(
          key,
          `axes.${axis}.${mode}`,
          `the triggerless default mode already uses val; omit this branch or give defaultMode() an explicit condition`,
        )
      }
      assertBranchType(type, val, key, `axes.${axis}.${mode}`)
      branches.push({
        kind: 'axis',
        axis,
        mode,
        definition: val === null ? { kind: 'none' } : classifyLeafValue(val, `${key}.$axes.${axis}.${mode}`),
      })
    }
  }

  for (const entry of config?.cases ?? []) {
    if (entry.val === null && config?.mutable !== true)
      invalidTrait(key, 'cases.val', 'null reserves a runtime address and therefore requires mutable: true')
    assertBranchType(type, entry.val, key, 'cases.val')
    const orderedWhen = Object.freeze(Object.fromEntries((axes?.order ?? Object.keys(entry.when))
      .filter(axis => axis in entry.when)
      .map(axis => [axis, entry.when[axis]!]),
    ))
    branches.push({
      kind: 'case',
      when: orderedWhen,
      definition: entry.val === null ? { kind: 'none' } : classifyLeafValue(entry.val, `${key}.$case`),
    })
  }

  return {
    rawVal,
    definition: hasVal ? classifyLeafValue(rawVal, key) : { kind: 'none' },
    contract: {
      canonical: true,
      reference,
      emit,
      mutable: config?.mutable === true,
      type,
      ...(config?.register === undefined ? {} : { register: config.register }),
      ...(config?.validate === undefined ? {} : { validate: config.validate }),
      ...(config?.metadata === undefined ? {} : { metadata: config.metadata }),
    },
    meta,
    branches,
  }
}

function requireAxis(
  axes: VaneAxisRegistry<any> | undefined,
  axis: string,
  token: string,
): import('../system/axes').VaneAxisDefinition {
  const definition = axes?.definitions[axis]
  if (!definition)
    invalidTrait(token, `axes.${axis}`, 'declare this axis on the engine before defining tokens')
  return definition
}

function assertBranchType(
  expected: import('../values/types').VaneCssDataType,
  value: unknown,
  token: string,
  field: string,
): void {
  if (value === null || expected === 'unknown' || expected === 'declaration')
    return
  const actual = inferTokenType(value)
  if (actual !== 'unknown' && actual !== expected) {
    invalidTrait(
      token,
      field,
      `use a ${expected} value; this branch is ${actual}`,
    )
  }
}

function invalidTrait(path: string, field: string, fix: string): never {
  throw new VaneError({
    code: 'VANE_TOKENS_INVALID_COLOR',
    message: `${path}.${field} conflicts with this token's independent traits`,
    path: `${path}.${field}`,
    fix,
  })
}

function inferTokenType(raw: unknown): import('../values/types').VaneCssDataType {
  if (isColorValue(raw) || isContrastValue(raw))
    return 'color'
  if ((typeof raw === 'object' || typeof raw === 'function') && raw !== null && 'type' in raw && typeof raw.type === 'string')
    return raw.type as import('../values/types').VaneCssDataType
  if (typeof raw === 'number')
    return Number.isInteger(raw) ? 'integer' : 'number'
  return 'unknown'
}

function duplicateToken(path: string, file?: string): never {
  throw new VaneError({
    code: 'VANE_TOKENS_DUPLICATE',
    message: `${path} is already defined by an earlier token stage`,
    path,
    file,
    fix: 'give the new token a distinct name',
  })
}

function classifyLeafValue(raw: unknown, key: string): VaneLeafDefinition {
  if (raw === null)
    return { kind: 'none' }

  if (typeof raw === 'function' && nodeOf(raw as VaneRuntimeHandle))
    return { kind: 'color', expr: { kind: 'ref', handle: raw as VaneRuntimeHandle }, markedLive: false }

  if (isContrastValue(raw))
    return { kind: 'contrast', expr: raw.expr }

  if (isColorValue(raw))
    return { kind: 'color', expr: raw.expr, markedLive: raw.markedLive }

  if (typeof raw === 'string' || typeof raw === 'number')
    return { kind: 'literal', value: raw }

  if (isCssValue(raw))
    return { kind: 'value', value: raw }

  throw new VaneError({
    code: 'VANE_TOKENS_INVALID_COLOR',
    message: `${key} is not a token value — expected a string, number, color, or derivation`,
    path: key,
  })
}

/** Classify what a derivation returned; a returned handle is an alias — a plain graph edge. */
function classifyLeaf(result: unknown, node: TokenNode): VaneLeafDefinition {
  if (typeof result === 'function' && nodeOf(result as VaneRuntimeHandle))
    return { kind: 'color', expr: { kind: 'ref', handle: result as VaneRuntimeHandle }, markedLive: false }

  if (isColorValue(result) || isContrastValue(result))
    node.meta = { ...result.meta, ...node.meta }

  return classifyLeafValue(result, node.key)
}

// ─── Resolution ──────────────────────────────────────────────────────────────

export type VaneOverride = VaneLeafDefinition

export function resolveGraph(
  graph: TokenGraph,
  overrides?: Map<string, VaneOverride>,
  context?: string,
): { results: Map<string, NodeResult>, diagnostics: VaneDiagnostic[] } {
  const results = new Map<string, NodeResult>()
  const stack: string[] = []
  const diagnostics: VaneDiagnostic[] = []

  const resolver: VaneResolver = {
    foldRef: (handle, scheme) => foldNode(requireNode(handle), scheme),
    refTraits: (handle) => {
      const referenced = requireNode(handle)
      const traits = resolve(referenced).traits
      return {
        cssLive: traits.cssLive || (referenced.contract.canonical && referenced.contract.reference === 'var'),
        volatile: traits.volatile || (referenced.contract.canonical && referenced.contract.mutable),
        conditional: traits.conditional,
      }
    },
    serializeRef: (handle) => {
      const referenced = requireNode(handle)
      return referenced.contract.reference === 'var'
        ? referenced.handle.var
        : resolve(referenced).emitted
    },
    invalidColor: (detail) => {
      throw new VaneError({
        code: 'VANE_TOKENS_INVALID_COLOR',
        message: `${stack[stack.length - 1] ?? 'a token'} cannot resolve: ${detail}`,
        path: stack[stack.length - 1],
        file: graph.file,
        fix: 'give it a color value, or reference a color token',
      })
    },
  }

  function requireNode(handle: VaneRuntimeHandle): TokenNode {
    const node = nodeOf(handle)

    if (!node) {
      throw new VaneError({
        code: 'VANE_TOKENS_INVALID_OVERRIDE',
        message: `a referenced token does not belong to this graph`,
        file: graph.file,
      })
    }

    return node
  }

  function definitionOf(node: TokenNode): VaneLeafDefinition {
    return overrides?.get(node.key) ?? node.definition
  }

  function guardCycles<R>(node: TokenNode, compute: () => R): R {
    if (stack.includes(node.key)) {
      throw new VaneError({
        code: 'VANE_TOKENS_CYCLE',
        message: `token derivation cycle: ${[...stack.slice(stack.indexOf(node.key)), node.key].join(' → ')}`,
        path: node.key,
        file: graph.file,
        fix: 'break the loop — one of these derivations must resolve to a value',
      })
    }

    stack.push(node.key)

    try {
      return compute()
    }
    finally {
      stack.pop()
    }
  }

  function foldNode(node: TokenNode, scheme: VaneScheme): VaneOklch {
    return guardCycles(node, () => {
      const definition = definitionOf(node)

      if (definition.kind === 'literal' || definition.kind === 'value') {
        const css = definition.kind === 'literal' ? String(definition.value) : cssOf(graph, definition.value)
        const parsed = parseColor(css)

        if (!parsed)
          return resolver.invalidColor(`${node.key} holds '${css}', which is not a color`)

        return parsed
      }

      if (definition.kind === 'none')
        return resolver.invalidColor(`${node.key} has no authored default value`)

      return foldExpr(definition.expr, scheme, resolver)
    })
  }

  function resolve(node: TokenNode): NodeResult {
    const memoized = results.get(node.key)

    if (memoized)
      return memoized

    const result = guardCycles(node, () => computeResult(node))
    results.set(node.key, result)
    return result
  }

  function computeResult(node: TokenNode): NodeResult {
    const definition = definitionOf(node)
    // A theme override changes a token's value, never its liveness: a live
    // token stays a runtime input, so its live derivations stay live.
    const originallyLive = node.definition.kind === 'color' && node.definition.markedLive

    if (definition.kind === 'none') {
      return {
        traits: { cssLive: false, volatile: node.contract.mutable, conditional: false },
        mode: node.contract.mutable ? 'live' : 'static',
        emitted: '',
      }
    }

    if (definition.kind === 'literal') {
      return {
        traits: { cssLive: false, volatile: originallyLive, conditional: false },
        mode: node.derived ? 'derived' : 'static',
        emitted: String(definition.value),
      }
    }

    if (definition.kind === 'value') {
      const valueNode = valueNodeOf(definition.value)
      const reactive = valueNode.dependencies.length > 0
      return {
        traits: { cssLive: reactive, volatile: reactive, conditional: false },
        mode: node.derived || reactive ? 'derived' : 'static',
        emitted: cssOf(graph, definition.value),
      }
    }

    if (definition.kind === 'contrast')
      return contrastResult(node, definition.expr)

    const { expr } = definition
    const markedLive = definition.markedLive || originallyLive
    const inner = exprTraits(expr, resolver)
    const traits = { ...inner, volatile: inner.volatile || markedLive }

    const mode: VaneTokenMode = markedLive
      ? 'live'
      : node.derived
        ? 'derived'
        : traits.conditional ? 'scheme' : traits.volatile ? 'derived' : 'static'

    if (node.contract.canonical && graph.support) {
      const missing = [...colorRequirements(expr)].filter(feature => !graph.support!.features.has(feature))
      if (missing.length > 0) {
        throw new VaneError({
          code: 'VANE_TOKENS_INVALID_COLOR',
          message: `${node.key} requires ${missing.join(', ')}, outside CSS support target "${graph.support.id}"`,
          path: node.key,
          file: graph.file,
          fix: 'author the referenced inputs with reference: \'val\', or choose a support target with a proven equivalent',
        })
      }
    }

    // A pure alias keeps the graph edge visible: always the `var()` reference.
    if (expr.kind === 'ref')
      return { traits, mode: 'derived', emitted: resolver.serializeRef?.(expr.handle) ?? expr.handle.var }

    const emitted = inner.cssLive || inner.volatile
      ? serializeExpr(expr, resolver)
      : formatOklch(foldExpr(expr, 'light', resolver))

    return { traits, mode, emitted }
  }

  function contrastResult(node: TokenNode, expr: Extract<VaneColorExpr, { kind: 'contrast' }>): NodeResult {
    const traits = exprTraits(expr.target, resolver)
    const emitted = serializeContrastPick(expr, resolver)

    if (traits.volatile) {
      // The guarantee cannot be total over a live target: emit the computed
      // fallback here, and upgrade to `contrast-color()` where supported.
      return { traits, mode: 'derived', emitted, supportsUpgrade: `contrast-color(${serializeExpr(expr.target, resolver)})` }
    }

    const schemes: VaneScheme[] = traits.cssLive ? ['light', 'dark'] : ['light']

    for (const scheme of schemes) {
      const target = foldExpr(expr.target, scheme, resolver)
      const pick = pickLegible(target)

      if (Math.abs(pick.lc) < expr.minLc) {
        const where = traits.cssLive ? ` in scheme "${scheme}"` : ''
        diagnostics.push({
          code: 'VANE_TOKENS_CONTRAST',
          message: `${node.key} / ${describeTarget(expr.target)} fails APCA Lc ${expr.minLc}${where}${context ? ` (${context})` : ''}`,
          detail: [`target (${scheme}) → ${formatOklch(target)}; best pairing ${pick.keyword} = Lc ${Math.abs(pick.lc).toFixed(1)}`],
          path: node.key,
          file: graph.file,
          fix: expr.explicitMin
            ? 'adjust the target color — even the accepted threshold fails'
            : `adjust the target color, or accept explicitly: legibleOn(…, { minLc: ${Math.floor(Math.abs(pick.lc))} })`,
        })
      }
    }

    return { traits, mode: 'derived', emitted }
  }

  for (const node of graph.nodes.values())
    resolve(node)

  return { results, diagnostics }
}

function describeTarget(target: VaneColorExpr): string {
  return target.kind === 'ref' ? nodeOf(target.handle)?.key ?? 'its target' : 'its target'
}

// ─── Checks ──────────────────────────────────────────────────────────────────

function runChecks(checks: readonly unknown[], graph: TokenGraph): VaneDiagnostic[] {
  const diagnostics: VaneDiagnostic[] = []

  for (const entry of checks) {
    if (!(entry instanceof TextContrastCheck))
      continue

    const text = toExpr(entry.text)
    const background = toExpr(entry.background)

    for (const scheme of ['light', 'dark'] as const) {
      const resolver = checkResolver(graph, scheme)
      const textColor = foldExpr(text, scheme, resolver)
      const backgroundColor = foldExpr(background, scheme, resolver)
      const { algorithm, min } = entry.level
      const measured = algorithm === 'apca'
        ? Math.abs(apcaContrast(textColor, backgroundColor))
        : wcagContrast(textColor, backgroundColor)

      record({
        kind: 'contrast',
        file: graph.file,
        pairing: `${describeTarget(text)} on ${describeTarget(background)}`,
        scheme,
        algorithm,
        measured: Math.round(measured * 10) / 10,
        min,
        accepted: false,
      })

      if (measured < min) {
        diagnostics.push({
          code: 'VANE_TOKENS_CONTRAST',
          message: `${describeTarget(text)} / ${describeTarget(background)} fails ${algorithm === 'apca' ? `APCA Lc ${min}` : `WCAG 2 ${min}:1`} in scheme "${scheme}"`,
          detail: [`text (${scheme}) → ${formatOklch(textColor)} on ${formatOklch(backgroundColor)} = ${algorithm === 'apca' ? `Lc ${measured.toFixed(1)}` : `${measured.toFixed(2)}:1`}`],
          file: graph.file,
          fix: 'adjust one endpoint of the pairing, or relax the check level deliberately',
        })
      }
    }
  }

  return diagnostics
}

/** Checks run after the graph resolved cleanly, so folding here needs no cycle guard. */
function checkResolver(graph: TokenGraph, scheme: VaneScheme): VaneResolver {
  const resolver: VaneResolver = {
    foldRef: (handle) => {
      const node = nodeOf(handle)!
      const definition = node.definition

      if (definition.kind === 'literal' || definition.kind === 'value') {
        const css = definition.kind === 'literal' ? String(definition.value) : cssOf(graph, definition.value)
        const parsed = parseColor(css)

        if (!parsed)
          throw new VaneError({ code: 'VANE_TOKENS_INVALID_COLOR', message: `${node.key} holds '${css}', which is not a color`, path: node.key, file: graph.file })

        return parsed
      }

      if (definition.kind === 'none')
        throw new VaneError({ code: 'VANE_TOKENS_INVALID_COLOR', message: `${node.key} has no authored default value`, path: node.key, file: graph.file })

      return foldExpr(definition.expr, scheme, resolver)
    },
    refTraits: (handle) => {
      const result = graph.results.get(nodeOf(handle)!.key)
      return result?.traits ?? { cssLive: false, volatile: false, conditional: false }
    },
    invalidColor: (detail) => {
      throw new VaneError({ code: 'VANE_TOKENS_INVALID_COLOR', message: `a check cannot resolve: ${detail}`, file: graph.file })
    },
  }

  return resolver
}

// ─── Introspection ───────────────────────────────────────────────────────────

/**
 * Record the resolved graph for the manifest ([dux-spec-introspection.md §2]):
 * every token with its per-scheme built values and graph edges, plus the
 * contrast results `legibleOn` pairings measured — passes and consciously-
 * accepted thresholds included. Runs only under an open collector.
 */
function recordGraph(graph: TokenGraph): void {
  const resolvers = { light: checkResolver(graph, 'light'), dark: checkResolver(graph, 'dark') } as const

  const schemeValue = (node: TokenNode, scheme: VaneScheme): string => {
    const definition = node.definition

    if (definition.kind === 'literal')
      return String(definition.value)

    if (definition.kind === 'value')
      return cssOf(graph, definition.value)

    if (definition.kind === 'none')
      return ''

    if (definition.kind === 'contrast')
      return pickLegible(foldExpr(definition.expr.target, scheme, resolvers[scheme])).keyword

    return formatOklch(foldExpr(definition.expr, scheme, resolvers[scheme]))
  }

  const previewOf = (node: TokenNode): import('../internal/inspect').VaneTokenPreviewRecord => {
    const definition = node.definition
    if (definition.kind === 'none')
      return { status: 'unavailable', reason: 'no authored default value' }
    if (definition.kind === 'literal') {
      const value = String(definition.value)
      return { status: 'available', light: value, dark: value }
    }
    if (definition.kind === 'value') {
      const valueNode = valueNodeOf(definition.value)
      if (valueNode.dependencies.length > 0)
        return { status: 'unavailable', reason: 'runtime dependency' }
      if (valueNode.kind !== 'literal')
        return { status: 'unavailable', reason: 'no proven fold evaluator for this expression' }
      const value = cssOf(graph, definition.value)
      return { status: 'available', light: value, dark: value }
    }

    try {
      return {
        status: 'available',
        light: schemeValue(node, 'light'),
        dark: schemeValue(node, 'dark'),
      }
    }
    catch (error) {
      return {
        status: 'unavailable',
        reason: error instanceof Error ? error.message : 'color expression cannot be previewed',
      }
    }
  }

  for (const node of graph.nodes.values()) {
    const result = graph.results.get(node.key)!
    const refs = new Set<string>()

    if (node.definition.kind === 'value') {
      for (const reference of valueNodeOf(node.definition.value).dependencies) {
        if (reference.path)
          refs.add(reference.path)
      }
    }
    else if (node.definition.kind !== 'literal' && node.definition.kind !== 'none') {
      collectRefs(node.definition.expr, refs)
    }

    const requirements = node.definition.kind === 'value'
      ? [...collectNodeRequirements(valueNodeOf(node.definition.value))]
      : node.definition.kind === 'literal' || node.definition.kind === 'none' ? [] : [...colorRequirements(node.definition.expr)]
    const preview = previewOf(node)
    const plan = planTokenEmission(node, graph)
    const runtimeToken = graph.runtime?.tokens.find(token => token.token.join('.') === node.key)
    const emission: import('../internal/inspect').VaneTokenEmissionRecord[] = []
    if (Object.keys(plan.baseVars).length > 0) {
      emission.push({
        kind: 'base',
        root: node.root,
        ...(phaseLayer(graph, node, 'base') === undefined ? {} : { layer: phaseLayer(graph, node, 'base') }),
      })
    }
    if (plan.native !== undefined) {
      emission.push({
        kind: 'native',
        root: node.root,
        layer: phaseLayer(graph, node, 'base'),
        axis: plan.native.axis,
        locality: plan.native.locality,
        mechanism: 'native',
      })
    }
    emission.push(...plan.axisDeclarations.map(entry => ({
      kind: 'axis' as const,
      root: entry.root,
      layer: phaseLayer(graph, node, 'axis', entry.axis),
      axis: entry.axis,
      mode: entry.mode,
      mechanism: entry.mechanism,
      locality: entry.locality,
      placement: entry.placement,
      priority: entry.priority,
      ...(entry.media === undefined ? {} : { media: entry.media }),
      ...(entry.supports === undefined ? {} : { supports: entry.supports }),
      ...(entry.container === undefined ? {} : { container: entry.container }),
    })))
    emission.push(...plan.caseDeclarations.map(entry => ({
      kind: 'case' as const,
      root: entry.root,
      layer: phaseLayer(graph, node, 'case'),
      when: entry.when,
      priority: entry.priority,
      ...(entry.media === undefined ? {} : { media: entry.media }),
      ...(entry.supports === undefined ? {} : { supports: entry.supports }),
      ...(entry.container === undefined ? {} : { container: entry.container }),
    })))

    record({
      kind: 'token',
      file: graph.file,
      ...diagnosticSource(node.key),
      path: node.key,
      var: node.name,
      root: node.root,
      ...(node.layer === undefined ? {} : { layer: node.layer }),
      mode: result.mode,
      light: preview.status === 'available' ? preview.light : result.emitted,
      dark: preview.status === 'available' ? preview.dark : result.emitted,
      css: result.emitted,
      requirements,
      preview,
      ...(result.supportsUpgrade === undefined ? {} : { upgrade: result.supportsUpgrade }),
      refs: [...refs],
      ...(emission.length === 0 ? {} : { emission }),
      ...(runtimeToken?.mutable !== true || runtimeToken.baseSlot === undefined
        ? {}
        : {
            runtime: {
              type: runtimeToken.type,
              ...(runtimeToken.validation === undefined ? {} : { validation: runtimeToken.validation }),
              addresses: [
                ...(runtimeToken.baseSlot === undefined ? [] : [{ address: { kind: 'base' as const }, slot: runtimeToken.baseSlot }]),
                ...runtimeToken.branches.flatMap(branch => branch.slot === undefined ? [] : [{ address: branch.address, slot: branch.slot }]),
              ],
            },
          }),
      ...(node.meta.description === undefined ? {} : { description: node.meta.description }),
      ...(node.meta.deprecated === undefined ? {} : { deprecated: node.meta.deprecated }),
    })

    if (node.definition.kind === 'contrast') {
      const { expr } = node.definition

      for (const scheme of ['light', 'dark'] as const) {
        const pick = pickLegible(foldExpr(expr.target, scheme, resolvers[scheme]))

        record({
          kind: 'contrast',
          file: graph.file,
          ...diagnosticSource(node.key),
          pairing: node.key,
          scheme,
          algorithm: 'apca',
          measured: Math.round(Math.abs(pick.lc) * 10) / 10,
          min: expr.minLc,
          accepted: expr.explicitMin,
        })
      }
    }
  }
}

// ─── Emission ────────────────────────────────────────────────────────────────

function emitGraph(graph: TokenGraph): void {
  if (graph.nodes.size === 0)
    return

  interface EmissionGroup {
    readonly root: string
    readonly layer?: string
    readonly media?: string
    readonly supports?: string
    readonly container?: string
    readonly vars: Record<string, string>
    readonly upgrades: Record<string, string>
    hasSchemePairs: boolean
  }

  const baseGroups = new Map<string, EmissionGroup>()
  const conditionalGroups = new Map<string, EmissionGroup>()
  let hasSchemePairs = false

  // The former nested contract emitter kept a reopened top-level group in its
  // original position. Preserve that public declaration order while grouping
  // by root/layer for modular emission.
  const topOrder = new Map<string, number>()
  for (const node of graph.nodes.values()) {
    const top = node.key.split('.')[0]!
    if (!topOrder.has(top))
      topOrder.set(top, topOrder.size)
  }
  const orderedNodes = [...graph.nodes.values()].map((node, index) => ({ node, index })).sort((a, b) => {
    const group = topOrder.get(a.node.key.split('.')[0]!)! - topOrder.get(b.node.key.split('.')[0]!)!
    return group === 0 ? a.index - b.index : group
  })

  const plans = orderedNodes.map(({ node }) => planTokenEmission(node, graph))

  for (const plan of plans) {
    const { node } = plan
    if (plan.registration)
      createGlobalVar(node.name, plan.registration as Parameters<typeof createGlobalVar>[1])

    if (node.layer !== undefined && graph.phaseLayers && node.layer !== graph.phaseLayers.root)
      globalLayer(node.layer)

    if (Object.keys(plan.baseVars).length > 0) {
      const layer = phaseLayer(graph, node, 'base')
      const group = emissionGroup(baseGroups, { root: node.root, layer })
      Object.assign(group.vars, plan.baseVars)
      if (plan.upgrade !== undefined)
        group.upgrades[node.name] = plan.upgrade
      if (Object.values(plan.baseVars).some(value => value.includes('light-dark('))) {
        hasSchemePairs = true
        group.hasSchemePairs = true
      }
    }
  }

  for (const axis of graph.axes?.order ?? []) {
    const entries = plans.flatMap(plan => plan.axisDeclarations.filter(entry => entry.axis === axis))
      .sort((a, b) => a.priority - b.priority || a.modeOrder - b.modeOrder || a.tokenOrder - b.tokenOrder)
    for (const entry of entries) {
      const layer = phaseLayer(graph, entry.node, 'axis', axis)
      const group = emissionGroup(conditionalGroups, {
        root: entry.root,
        layer,
        ...(entry.media === undefined ? {} : { media: entry.media }),
        ...(entry.supports === undefined ? {} : { supports: entry.supports }),
        ...(entry.container === undefined ? {} : { container: entry.container }),
      })
      group.vars[entry.name] = entry.value
    }
  }

  const cases = plans.flatMap(plan => plan.caseDeclarations)
    .sort((a, b) => a.priority - b.priority || a.tokenOrder - b.tokenOrder)
  for (const entry of cases) {
    const layer = phaseLayer(graph, entry.node, 'case')
    const group = emissionGroup(conditionalGroups, {
      root: entry.root,
      layer,
      ...(entry.media === undefined ? {} : { media: entry.media }),
      ...(entry.supports === undefined ? {} : { supports: entry.supports }),
      ...(entry.container === undefined ? {} : { container: entry.container }),
    })
    group.vars[entry.name] = entry.value
  }

  const schemeRoots = new Set<string>()
  for (const group of [...baseGroups.values(), ...conditionalGroups.values()]) {
    if (group.hasSchemePairs && !schemeRoots.has(group.root)) {
      schemeRoots.add(group.root)
      globalStyle(group.root, { colorScheme: 'light dark' })
    }

    emitGroup(group)
  }

  if (hasSchemePairs) {
    // Explicit application selection beats native preference and remains a
    // platform color-scheme declaration, not a parallel JS theme registry.
    globalStyle('[data-scheme=\'light\']', { colorScheme: 'light' })
    globalStyle('[data-scheme=\'dark\']', { colorScheme: 'dark' })
  }

  function emitGroup(group: EmissionGroup): void {
    let rule: Record<string, unknown> = { vars: group.vars }
    if (Object.keys(group.upgrades).length > 0) {
      rule = {
        ...rule,
        '@supports': {
          [CONTRAST_COLOR_SUPPORT]: { vars: group.upgrades },
        },
      }
    }
    if (group.container !== undefined)
      rule = { '@container': { [group.container]: rule } }
    if (group.supports !== undefined)
      rule = { '@supports': { [group.supports]: rule } }
    if (group.media !== undefined)
      rule = { '@media': { [group.media]: rule } }
    if (group.layer !== undefined)
      rule = { '@layer': { [group.layer]: rule } }

    globalStyle(group.root, rule)
  }
}

interface PlannedConditionalDeclaration {
  readonly node: TokenNode
  readonly axis: string
  readonly mode?: string
  readonly when?: Readonly<Record<string, string>>
  readonly mechanism?: VaneAxisTriggerArm['mechanism']
  readonly locality?: VaneAxisTriggerArm['locality']
  readonly placement?: VaneAxisTriggerArm['placement']
  readonly name: string
  readonly value: string
  readonly root: string
  readonly media?: string
  readonly supports?: string
  readonly container?: string
  readonly priority: number
  readonly modeOrder: number
  readonly tokenOrder: number
}

interface PlannedTokenEmission {
  readonly node: TokenNode
  readonly baseVars: Readonly<Record<string, string>>
  readonly axisDeclarations: readonly PlannedConditionalDeclaration[]
  readonly caseDeclarations: readonly PlannedConditionalDeclaration[]
  readonly registration?: {
    readonly syntax: '*' | string
    readonly inherits: boolean
    readonly initialValue?: string
  }
  readonly native?: {
    readonly axis: string
    readonly locality: 'element' | 'root'
  }
  readonly upgrade?: string
}

function planTokenEmission(node: TokenNode, graph: TokenGraph): PlannedTokenEmission {
  const result = graph.results.get(node.key)!
  const baseVars: Record<string, string> = {}
  const axisDeclarations: PlannedConditionalDeclaration[] = []
  const caseDeclarations: PlannedConditionalDeclaration[] = []
  const axes = graph.axes
  const branchAxes = new Map<string, Map<string, TokenBranch & { kind: 'axis' }>>()
  const cases: (TokenBranch & { kind: 'case' })[] = []
  for (const branch of node.branches) {
    if (branch.kind === 'axis') {
      branchAxes.set(branch.axis, branchAxes.get(branch.axis) ?? new Map())
      branchAxes.get(branch.axis)!.set(branch.mode, branch)
    }
    else {
      cases.push(branch)
    }
  }

  const usedAxisOrder = axes?.order.filter(axis => branchAxes.has(axis) || cases.some(branch => axis in branch.when)) ?? []
  const native = nativeSchemePlan(node, graph, branchAxes, usedAxisOrder)
  // Ordinary token branches compose most faithfully by declaring the public
  // property in ordered layers: descendant and absolute triggers then compute
  // where their selector matches. Private stages are only needed for mutable
  // multi-axis fallback chains, whose bindings are constrained to the token's
  // effective root so var() substitution cannot freeze a downstream trigger.
  const needsStages = usesMutableSlots(node) && usedAxisOrder.length > 1
  let priorExpression: string | undefined

  if (usesMutableSlots(node)) {
    const baseSlot = privateAddress(graph.prefix, node.key, 'base')
    if (node.definition.kind !== 'none')
      baseVars[baseSlot] = result.emitted
    priorExpression = `var(${baseSlot})`
    for (const branch of node.branches) {
      if (branch.definition.kind === 'none')
        continue
      baseVars[slotOfBranch(graph.prefix, node, branch)] = serializeBranch(branch.definition, graph)!.toString()
    }
  }
  else if (node.definition.kind !== 'none') {
    priorExpression = result.emitted
  }

  if (priorExpression === undefined && usedAxisOrder.length === 1) {
    const axis = usedAxisOrder[0]!
    const definition = axes?.definitions[axis]
    const defaultBranch = definition?.defaultMode === undefined
      ? undefined
      : branchAxes.get(axis)?.get(definition.defaultMode)
    if (defaultBranch) {
      priorExpression = branchExpression(node, defaultBranch, graph, undefined)
    }
  }

  for (const axis of usedAxisOrder) {
    const definition = axes!.definitions[axis]!
    const stageName = needsStages ? privateAddress(graph.prefix, node.key, `stage:${axis}`) : node.name
    const nativeForAxis = native?.axis === axis ? native : undefined
    const incoming = priorExpression

    if (nativeForAxis) {
      const light = nativeSourceExpression(node, nativeForAxis.light, graph, incoming)
      const dark = nativeSourceExpression(node, nativeForAxis.dark, graph, incoming)
      const nativeExpression = `light-dark(${light}, ${dark})`
      if (needsStages) {
        baseVars[stageName] = nativeExpression
        priorExpression = `var(${stageName})`
      }
      else {
        priorExpression = nativeExpression
      }
    }
    else if (needsStages && incoming !== undefined) {
      baseVars[stageName] = incoming
      priorExpression = `var(${stageName})`
    }

    const branches = branchAxes.get(axis)
    if (!branches && !nativeForAxis)
      continue
    for (const mode of definition.modeOrder) {
      const branch = branches?.get(mode)
      const nativeSource = nativeForAxis === undefined
        ? undefined
        : mode === definition.native?.light
          ? nativeForAxis.light
          : mode === definition.native?.dark
            ? nativeForAxis.dark
            : undefined
      if (!branch && !nativeSource)
        continue
      const trigger = definition.modes[mode]!
      const isTriggerlessDefault = definition.defaultMode === mode && trigger.arms.length === 0
      if (isTriggerlessDefault)
        continue
      const value = branch
        ? branchExpression(node, branch, graph, incoming)
        : nativeSourceExpression(node, nativeSource!, graph, incoming)
      for (const arm of trigger.arms) {
        if (nativeForAxis && arm.mechanism !== 'selector')
          continue
        assertMutablePlacement(node, arm)
        const resolved = resolveArm(node.root, arm)
        axisDeclarations.push({
          node,
          axis,
          mode,
          mechanism: arm.mechanism,
          locality: arm.locality,
          placement: arm.placement,
          name: stageName,
          value,
          root: resolved.selector,
          ...(resolved.media === undefined ? {} : { media: resolved.media }),
          ...(resolved.supports === undefined ? {} : { supports: resolved.supports }),
          ...(resolved.container === undefined ? {} : { container: resolved.container }),
          priority: arm.priority,
          modeOrder: definition.modeOrder.indexOf(mode),
          tokenOrder: [...graph.nodes.keys()].indexOf(node.key),
        })
      }
    }
  }

  if (node.contract.emit && priorExpression !== undefined)
    baseVars[node.name] = priorExpression

  for (const branch of cases) {
    const arms = caseArms(node, branch, graph)
    const fallback = priorExpression
    const value = branchExpression(node, branch, graph, fallback)
    for (const arm of arms) {
      caseDeclarations.push({
        node,
        axis: '$case',
        when: branch.when,
        name: node.name,
        value,
        root: arm.selector,
        ...(arm.media === undefined ? {} : { media: arm.media }),
        ...(arm.supports === undefined ? {} : { supports: arm.supports }),
        ...(arm.container === undefined ? {} : { container: arm.container }),
        priority: arm.priority,
        modeOrder: 0,
        tokenOrder: [...graph.nodes.keys()].indexOf(node.key),
      })
    }
  }

  const registration = registrationOf(node, graph, result.emitted, native)
  return {
    node,
    baseVars,
    axisDeclarations,
    caseDeclarations,
    ...(registration === undefined ? {} : { registration }),
    ...(native === undefined ? {} : { native: { axis: native.axis, locality: native.definition.native!.locality } }),
    ...(result.supportsUpgrade === undefined ? {} : { upgrade: result.supportsUpgrade }),
  }
}

function nativeSchemePlan(
  node: TokenNode,
  graph: TokenGraph,
  branches: ReadonlyMap<string, ReadonlyMap<string, TokenBranch & { kind: 'axis' }>>,
  usedAxisOrder: readonly string[],
): {
  readonly axis: string
  readonly definition: VaneAxisDefinition
  readonly light: NativeSchemeSource
  readonly dark: NativeSchemeSource
} | undefined {
  for (const axis of usedAxisOrder) {
    const definition = graph.axes!.definitions[axis]!
    const native = definition.native
    if (native?.kind !== 'scheme')
      continue
    // CSS light-dark() is a <color> function. Other data types use the same
    // scheme vocabulary through its selector/media trigger arms.
    if (node.contract.type !== 'color')
      continue
    if (axis !== usedAxisOrder[0])
      continue
    const light = branches.get(axis)?.get(native.light)
      ?? (definition.defaultMode === native.light && node.definition.kind !== 'none'
        ? { kind: 'base' as const, definition: node.definition }
        : undefined)
    const dark = branches.get(axis)?.get(native.dark)
      ?? (definition.defaultMode === native.dark && node.definition.kind !== 'none'
        ? { kind: 'base' as const, definition: node.definition }
        : undefined)
    if (!light || !dark)
      continue
    if (node.branches.some(branch => branch.kind === 'case' && axis in branch.when)
      && native.locality === 'element') {
      invalidTrait(
        node.key,
        'cases',
        'an element-local native scheme cannot expose its used mode to a cross-axis selector; choose scheme({ locality: \'root\' })',
      )
    }
    if (!graph.support?.features.has('light-dark')) {
      if (native.locality === 'element' && native.fallback === 'diagnose') {
        throw new VaneError({
          code: 'VANE_TOKENS_INVALID_COLOR',
          message: `${node.key} requests element-local scheme selection, but support target '${graph.support?.id ?? 'unknown'}' lacks light-dark()`,
          path: `${node.key}.axes.${axis}`,
          fix: 'use a support target with light-dark(), choose root locality, or acknowledge fallback: \'document\'',
        })
      }
      return undefined
    }
    return { axis, definition, light, dark }
  }
  return undefined
}

type NativeSchemeSource = (TokenBranch & { kind: 'axis' }) | {
  readonly kind: 'base'
  readonly definition: VaneLeafDefinition
}

function nativeSourceExpression(
  node: TokenNode,
  source: NativeSchemeSource,
  graph: TokenGraph,
  fallback: string | undefined,
): string {
  if (source.kind !== 'base')
    return branchExpression(node, source, graph, fallback)
  if (usesMutableSlots(node)) {
    const slot = privateAddress(graph.prefix, node.key, 'base')
    return `var(${slot})`
  }
  return graph.results.get(node.key)!.emitted
}

function branchExpression(
  node: TokenNode,
  branch: TokenBranch,
  graph: TokenGraph,
  fallback: string | undefined,
): string {
  if (usesMutableSlots(node)) {
    const slot = slotOfBranch(graph.prefix, node, branch)
    return fallback === undefined ? `var(${slot})` : `var(${slot}, ${fallback})`
  }
  const value = serializeBranch(branch.definition, graph)
  if (value === undefined) {
    if (fallback === undefined)
      return ''
    return fallback
  }
  return String(value)
}

function registrationOf(
  node: TokenNode,
  graph: TokenGraph,
  emittedBase: string,
  native: ReturnType<typeof nativeSchemePlan>,
): PlannedTokenEmission['registration'] | undefined {
  const authored = node.contract.register
  if (authored === undefined || authored === false)
    return undefined
  const config = authored === true ? {} : authored as import('./types').VaneTokenRegistration
  const syntax = config.syntax ?? propertySyntax(node.contract.type)
  const inherits = config.inherits ?? true

  if (native?.definition.native?.locality === 'element' && syntax !== '*') {
    invalidTrait(
      node.key,
      'register.syntax',
      'use syntax: \'*\' to preserve element-local light-dark() token streams, or choose scheme({ locality: \'root\' })',
    )
  }

  let initialValue: string | undefined
  if (config.initialVal !== undefined) {
    assertBranchType(node.contract.type, config.initialVal, node.key, 'register.initialVal')
    initialValue = serializeRegistrationValue(config.initialVal, graph, node.key)
  }
  else if (syntax !== '*' && node.definition.kind !== 'none' && isComputationallyIndependent(emittedBase)) {
    initialValue = emittedBase
  }

  if (syntax !== '*' && initialValue === undefined) {
    invalidTrait(
      node.key,
      'register.initialVal',
      `typed @property syntax '${syntax}' requires a computationally independent initialVal`,
    )
  }
  if (initialValue !== undefined && !isComputationallyIndependent(initialValue)) {
    invalidTrait(
      node.key,
      'register.initialVal',
      'use a computationally independent initial value without var(), environment dependencies, or relative units',
    )
  }

  return { syntax, inherits, ...(initialValue === undefined ? {} : { initialValue }) }
}

function propertySyntax(type: import('../values/types').VaneCssDataType): string {
  const syntax: Partial<Record<import('../values/types').VaneCssDataType, string>> = {
    'color': '<color>',
    'length': '<length>',
    'length-percentage': '<length-percentage>',
    'percentage': '<percentage>',
    'number': '<number>',
    'integer': '<integer>',
    'angle': '<angle>',
    'time': '<time>',
    'frequency': '<frequency>',
    'resolution': '<resolution>',
    'flex': '<flex>',
    'custom-ident': '<custom-ident>',
  }
  return syntax[type] ?? '*'
}

function serializeRegistrationValue(value: unknown, graph: TokenGraph, key: string): string {
  return String(serializeBranch(classifyLeafValue(value, `${key}.register.initialVal`), graph))
}

function isComputationallyIndependent(value: string): boolean {
  return !/\b(?:var|env)\(/.test(value)
    && !/(?:^|[^-\w.])-?(?:\d+(?:\.\d+)?|\.\d+)(?:em|rem|ex|cap|ch|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|cqw|cqh|cqi|cqb|cqmin|cqmax)\b/i.test(value)
    && !/\bcurrentColor\b/i.test(value)
}

function slotOfBranch(prefix: string, node: TokenNode, branch: TokenBranch): string {
  return branch.kind === 'axis'
    ? privateAddress(prefix, node.key, `axis:${branch.axis}:${branch.mode}`)
    : privateAddress(prefix, node.key, `case:${Object.entries(branch.when).map(([axis, mode]) => `${axis}:${mode}`).join('|')}`)
}

function usesMutableSlots(node: TokenNode): boolean {
  return node.contract.canonical && node.contract.mutable
}

function privateAddress(prefix: string, token: string, address: string): string {
  let hash = 2166136261
  for (const char of `${token}\0${address}`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `--${prefix}-v-${(hash >>> 0).toString(36)}`
}

function phaseLayer(
  graph: TokenGraph,
  node: TokenNode,
  kind: 'base' | 'axis' | 'case',
  axis?: string,
): string | undefined {
  if (!graph.phaseLayers)
    return node.layer
  const phase = kind === 'base'
    ? graph.phaseLayers.base
    : kind === 'case'
      ? graph.phaseLayers.cases
      : graph.phaseLayers.axes[axis!]!
  const suffix = node.layer?.startsWith(`${graph.phaseLayers.root}.`)
    ? node.layer.slice(graph.phaseLayers.root.length + 1)
    : undefined
  return suffix ? `${phase}.${suffix}` : phase
}

function emissionGroup(
  groups: Map<string, {
    readonly root: string
    readonly layer?: string
    readonly media?: string
    readonly supports?: string
    readonly container?: string
    readonly vars: Record<string, string>
    readonly upgrades: Record<string, string>
    hasSchemePairs: boolean
  }>,
  context: {
    readonly root: string
    readonly layer?: string
    readonly media?: string
    readonly supports?: string
    readonly container?: string
  },
) {
  const key = [context.root, context.layer, context.media, context.supports, context.container].join('\0')
  let group = groups.get(key)
  if (!group) {
    group = { ...context, vars: {}, upgrades: {}, hasSchemePairs: false }
    groups.set(key, group)
  }
  return group
}

function resolveArm(root: string, arm: VaneAxisTriggerArm): {
  readonly selector: string
  readonly media?: string
  readonly supports?: string
  readonly container?: string
} {
  const selector = arm.placement === 'absolute'
    ? arm.selector!
    : arm.selector === undefined ? root : arm.selector.replaceAll('&', `:is(${root})`)
  return {
    selector,
    ...(arm.media === undefined ? {} : { media: arm.media }),
    ...(arm.supports === undefined ? {} : { supports: arm.supports }),
    ...(arm.container === undefined ? {} : { container: arm.container }),
  }
}

function assertMutablePlacement(node: TokenNode, arm: VaneAxisTriggerArm): void {
  if (!node.contract.mutable)
    return
  if (arm.placement === 'descendant' || arm.placement === 'absolute') {
    invalidTrait(
      node.key,
      'axes',
      `mutable bindings must compute on their effective root; '${arm.placement}' placement would move slot substitution elsewhere`,
    )
  }
}

function caseArms(
  node: TokenNode,
  branch: TokenBranch & { kind: 'case' },
  graph: TokenGraph,
): readonly {
  readonly selector: string
  readonly media?: string
  readonly supports?: string
  readonly container?: string
  readonly priority: number
}[] {
  let combinations: readonly {
    readonly selectors: readonly string[]
    readonly media?: string
    readonly supports?: string
    readonly container?: string
    readonly priority: number
  }[] = [{ selectors: [], priority: 0 }]

  for (const [axis, mode] of Object.entries(branch.when)) {
    const definition = graph.axes?.definitions[axis]
    const trigger = definition?.modes[mode]
    if (!definition || !trigger)
      invalidTrait(node.key, `cases.when.${axis}`, 'reference a declared axis mode')
    if (trigger.arms.length === 0) {
      invalidTrait(
        node.key,
        `cases.when.${axis}`,
        `mode '${mode}' has no trigger, so its intersection cannot be selected; give defaultMode() an explicit condition`,
      )
    }
    combinations = combinations.flatMap(existing => trigger.arms.map((arm: VaneAxisTriggerArm) => {
      assertMutablePlacement(node, arm)
      const resolved = resolveArm(node.root, arm)
      return {
        selectors: [...existing.selectors, resolved.selector],
        media: combineQuery(existing.media, resolved.media),
        supports: combineQuery(existing.supports, resolved.supports),
        container: combineQuery(existing.container, resolved.container),
        priority: existing.priority + arm.priority,
      }
    }))
  }

  return combinations.map(combination => ({
    selector: combination.selectors.length === 1
      ? combination.selectors[0]!
      : combination.selectors.map(selector => `:is(${selector})`).join(''),
    ...(combination.media === undefined ? {} : { media: combination.media }),
    ...(combination.supports === undefined ? {} : { supports: combination.supports }),
    ...(combination.container === undefined ? {} : { container: combination.container }),
    priority: combination.priority,
  }))
}

function combineQuery(left: string | undefined, right: string | undefined): string | undefined {
  if (left === undefined)
    return right
  if (right === undefined)
    return left
  return `${left} and ${right}`
}
