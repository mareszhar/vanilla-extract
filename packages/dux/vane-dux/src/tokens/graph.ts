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
import type { VaneRuntimeHandle, VaneTokenMode } from '../internal/handle'
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
  VaneTokens,
  VaneTokensOptions,
} from './types'
import { globalStyle } from '@vanilla-extract/css'
import { getFileScope, hasFileScope } from '@vanilla-extract/css/fileScope'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { diagnosticSource, didYouMean, VaneError } from '../diagnostics'
import { checkSelector } from '../internal/cssParser'
import { createHandle } from '../internal/handle'
import { inspecting, record } from '../internal/inspect'
import { collectNodeRequirements, nodeOf as valueNodeOf } from '../values/protocol'
import { isCssValue } from '../values/types'
import { TextContrastCheck } from './checks'
import { colorRequirements, handleColorMethods, isColorValue, isContrastValue, toExpr } from './color'
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
  = | { kind: 'literal', value: string | number }
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
  /** Effective emission location, finalized by the owning system. */
  root: string
  layer?: string
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
  nodes: Map<string, TokenNode>
  results: Map<string, NodeResult>
  /** Engine-bound serializer; absent only on the deprecated root builder. */
  serializeValue?: (value: VaneCssValue) => string
  file?: string
}

export function graphOf(tokens: object): TokenGraph | undefined {
  return (tokens as { [GRAPH]?: TokenGraph })[GRAPH]
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

interface RuntimeTokenBuilder {
  readonly [TOKEN_BUILDER]: true
  readonly [TOKEN_FINALIZE]: (options?: RuntimeBuildOptions) => VaneTokens<object, string>
  readonly contributions: readonly RuntimeContribution[]
  readonly engine?: VaneEngineRequirement
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
  return createTokenBuilder([{ kind: 'seed', graph, emission: {} }], undefined, {}, true) as unknown as VaneTokenBuilder<T>
}

/** Create the canonical unfinished module bound to one semantic engine. */
export function defineTokenModule<const T extends VaneGraphInput = Record<never, never>>(
  engine: VaneEngineRequirement,
  seed?: T,
  options: VaneTokenModuleOptions = {},
): VaneTokenModule<T> {
  validateModuleOptions(options)
  const graph = snapshotGroup(seed ?? {} as T) as T
  const emission = Object.freeze({ ...options })
  return createTokenBuilder([{ kind: 'seed', graph, emission }], engine, emission) as unknown as VaneTokenModule<T>
}

function createTokenBuilder(
  contributions: readonly RuntimeContribution[],
  engine?: VaneEngineRequirement,
  derivationEmission: VaneTokenModuleOptions = {},
  exposeLegacyBuild = false,
): RuntimeTokenBuilder {
  const frozenContributions = Object.freeze([...contributions])
  const frozenDerivationEmission = Object.freeze({ ...derivationEmission })
  const finalize = (options?: RuntimeBuildOptions) => buildTokens(frozenContributions, options)
  const builder: RuntimeTokenBuilder = {
    [TOKEN_BUILDER]: true as const,
    [TOKEN_FINALIZE]: finalize,
    contributions: frozenContributions,
    engine,
    compose: (module: RuntimeTokenBuilder) => {
      assertComposableEngine(engine, module.engine)
      return createTokenBuilder(
        [...frozenContributions, ...module.contributions],
        engine ?? module.engine,
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
      walkInto(contribution.graph, [], prefix, nodes, tree, false, emission, file)
      continue
    }

    stageIndex++
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
    walkInto(additions, [], prefix, nodes, tree, true, emission, file)
  }

  const unresolved: TokenGraph = {
    prefix,
    nodes,
    results: new Map(),
    file,
    ...(options.serializeValue === undefined ? {} : { serializeValue: options.serializeValue }),
  }
  const { results, diagnostics } = resolveGraph(unresolved)
  const resolved: TokenGraph = { ...unresolved, results }

  diagnostics.push(...runChecks(options.checks?.(tree as VaneTokens<T, Prefix>) ?? [], resolved))

  if (diagnostics.length > 0)
    throw new VaneError(diagnostics)

  for (const node of nodes.values()) {
    const result = results.get(node.key)!
    node.handle.mode = result.mode
    if (node.definition.kind === 'literal' || node.definition.kind === 'value')
      node.handle.value = node.definition.kind === 'literal' ? node.definition.value : result.emitted
    node.handle.description = node.meta.description
    node.handle.deprecated = node.meta.deprecated
    addFunctionSerializer(node.handle as unknown as (...args: unknown[]) => unknown, {
      importPath: '@mszr/vane-dux/runtime',
      importName: 'restoreToken',
      args: [{
        name: node.name,
        path: node.key,
        mode: result.mode,
        ...(node.definition.kind === 'literal' || node.definition.kind === 'value' ? { value: result.emitted } : {}),
        ...(node.meta.description === undefined ? {} : { description: node.meta.description }),
        ...(node.meta.deprecated === undefined ? {} : { deprecated: node.meta.deprecated }),
      }],
    })
  }

  emitGraph(resolved)

  Object.defineProperty(tree, GRAPH, { value: resolved })

  if (inspecting())
    recordGraph(resolved)

  return tree as VaneTokens<T, Prefix>
}

function walkInto(
  group: object,
  path: string[],
  prefix: string,
  nodes: Map<string, TokenNode>,
  tree: Record<string, unknown>,
  derived: boolean,
  emission: { readonly root: string, readonly layer?: string },
  file?: string,
): void {
  for (const [key, raw] of Object.entries(group)) {
    const leafPath = [...path, key]
    const keyPath = leafPath.join('.')

    if (isGroup(raw)) {
      const existing = tree[key]

      if (existing !== undefined && !isGroup(existing))
        duplicateToken(keyPath, file)

      const child = existing as Record<string, unknown> | undefined ?? {}
      tree[key] = child
      walkInto(raw, leafPath, prefix, nodes, child, derived, emission, file)
      continue
    }

    if (key in tree)
      duplicateToken(keyPath, file)

    const node = createNode(leafPath, prefix, raw, derived, emission)
    nodes.set(node.key, node)
    tree[key] = node.handle
  }
}

function isGroup(value: unknown): value is object {
  return typeof value === 'object' && value !== null
    && !isColorValue(value) && !isContrastValue(value) && !isCssValue(value)
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
): TokenNode {
  const key = path.join('.')
  const handle = createHandle({ name: tokenName(prefix, path), path: key, mode: 'static' })
  Object.assign(handle, handleColorMethods(handle))

  const node: TokenNode = {
    key,
    name: handle.name,
    handle,
    derived,
    root: emission.root,
    ...(emission.layer === undefined ? {} : { layer: emission.layer }),
    definition: { kind: 'literal', value: '' },
    meta: isColorValue(raw) || isContrastValue(raw) ? raw.meta : {},
  }

  Object.defineProperty(handle, NODE, { value: node })
  node.definition = derived ? classifyLeaf(raw, node) : classifyLeafValue(raw, key)

  if (node.definition.kind === 'literal')
    handle.value = node.definition.value

  return node
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
    refTraits: handle => resolve(requireNode(handle)).traits,
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

    // A pure alias keeps the graph edge visible: always the `var()` reference.
    if (expr.kind === 'ref')
      return { traits, mode: 'derived', emitted: expr.handle.var }

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

    if (definition.kind === 'contrast')
      return pickLegible(foldExpr(definition.expr.target, scheme, resolvers[scheme])).keyword

    return formatOklch(foldExpr(definition.expr, scheme, resolvers[scheme]))
  }

  const previewOf = (node: TokenNode): import('../internal/inspect').VaneTokenPreviewRecord => {
    const definition = node.definition
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
    else if (node.definition.kind !== 'literal') {
      collectRefs(node.definition.expr, refs)
    }

    const requirements = node.definition.kind === 'value'
      ? [...collectNodeRequirements(valueNodeOf(node.definition.value))]
      : node.definition.kind === 'literal' ? [] : [...colorRequirements(node.definition.expr)]
    const preview = previewOf(node)

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
    readonly vars: Record<string, string>
    readonly upgrades: Record<string, string>
    hasSchemePairs: boolean
  }

  const groups = new Map<string, EmissionGroup>()
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

  for (const { node } of orderedNodes) {
    const result = graph.results.get(node.key)!
    const key = `${node.root}\0${node.layer ?? ''}`
    let group = groups.get(key)
    if (!group) {
      group = {
        root: node.root,
        ...(node.layer === undefined ? {} : { layer: node.layer }),
        vars: {},
        upgrades: {},
        hasSchemePairs: false,
      }
      groups.set(key, group)
    }

    group.vars[node.name] = result.emitted

    if (result.supportsUpgrade)
      group.upgrades[node.name] = result.supportsUpgrade

    if (result.emitted.includes('light-dark(')) {
      hasSchemePairs = true
      group.hasSchemePairs = true
    }
  }

  const schemeRoots = new Set<string>()
  for (const group of groups.values()) {
    if (group.hasSchemePairs && !schemeRoots.has(group.root)) {
      schemeRoots.add(group.root)
      globalStyle(group.root, { colorScheme: 'light dark' })
    }

    let rule: Record<string, unknown> = { vars: group.vars }
    if (Object.keys(group.upgrades).length > 0) {
      rule = {
        ...rule,
        '@supports': {
          [CONTRAST_COLOR_SUPPORT]: { vars: group.upgrades },
        },
      }
    }
    if (group.layer !== undefined)
      rule = { '@layer': { [group.layer]: rule } }

    globalStyle(group.root, rule)
  }

  if (hasSchemePairs) {
    // Forcing a scheme is standard CSS: the scopes pin `color-scheme`;
    // `/runtime`'s `setScheme` writes the attribute ([dux-spec-tokens.md §3]).
    globalStyle('[data-scheme=\'light\']', { colorScheme: 'light' })
    globalStyle('[data-scheme=\'dark\']', { colorScheme: 'dark' })
  }
}
