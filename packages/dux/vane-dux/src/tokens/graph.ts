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
import type { VaneColorExpr } from './color'
import type { VaneOklch } from './math'
import type { VaneExprTraits, VaneResolver, VaneScheme } from './resolve'
import type { VaneGraphInput, VaneTokens, VaneTokensOptions } from './types'
import { createGlobalTheme, createGlobalThemeContract, globalStyle } from '@vanilla-extract/css'
import { getFileScope, hasFileScope } from '@vanilla-extract/css/fileScope'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { didYouMean, VaneError } from '../diagnostics'
import { createHandle } from '../internal/handle'
import { TextContrastCheck } from './checks'
import { ColorValue, ContrastValue, handleColorMethods, toExpr } from './color'
import { apcaContrast, formatOklch, parseColor, pickLegible, wcagContrast } from './math'
import { kebab, tokenName } from './names'
import { defaultElevationCurve, exprTraits, foldExpr, serializeContrastPick, serializeExpr } from './resolve'

export const GRAPH = Symbol.for('vane.graph')
const NODE = Symbol.for('vane.node')

const CONTRAST_COLOR_SUPPORT = '(color: contrast-color(red))'

// ─── Graph structures ────────────────────────────────────────────────────────

type VaneLeafDefinition
  = | { kind: 'literal', value: string | number }
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
  resolverConfig: VaneResolver['elevation']
  file?: string
}

export function graphOf(tokens: object): TokenGraph | undefined {
  return (tokens as { [GRAPH]?: TokenGraph })[GRAPH]
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

  return node.definition.kind === 'literal' ? 'value' : 'color'
}

// ─── defineTokens ────────────────────────────────────────────────────────────

export function defineTokens<const T extends object, Prefix extends string = 'vane'>(
  graph: T & VaneGraphInput,
  options: VaneTokensOptions<T, Prefix> = {},
): VaneTokens<T, Prefix> {
  const prefix = options.prefix ?? 'vane'
  const file = hasFileScope() ? getFileScope().filePath : undefined
  const nodes = new Map<string, TokenNode>()
  const derivations: Array<{ node: TokenNode, derive: (refs: unknown) => unknown }> = []

  const tree = walk(graph as object, [], prefix, nodes, derivations)

  for (const { node, derive } of derivations) {
    node.definition = classifyLeaf(derive(refsProxy(tree, [], node.key, file)), node)

    if (node.definition.kind === 'literal')
      node.handle.value = node.definition.value
  }

  const resolverConfig = {
    hue: options.elevation?.hue ?? 0,
    chroma: options.elevation?.chroma ?? 0,
    curve: options.elevation?.curve ?? defaultElevationCurve,
  }

  const { results, diagnostics } = resolveGraph({ prefix, nodes, results: new Map(), resolverConfig, file })

  diagnostics.push(...runChecks(options.checks?.(tree as VaneTokens<T, Prefix>) ?? [], { prefix, nodes, results, resolverConfig, file }))

  if (diagnostics.length > 0)
    throw new VaneError(diagnostics)

  for (const node of nodes.values()) {
    const result = results.get(node.key)!
    node.handle.mode = result.mode
    node.handle.description = node.meta.description
    node.handle.deprecated = node.meta.deprecated
    addFunctionSerializer(node.handle as unknown as (...args: unknown[]) => unknown, {
      importPath: '@mszr/vane-dux/runtime',
      importName: 'restoreToken',
      args: [{
        name: node.name,
        path: node.key,
        mode: result.mode,
        ...(node.definition.kind === 'literal' ? { value: node.definition.value } : {}),
        ...(node.meta.description === undefined ? {} : { description: node.meta.description }),
        ...(node.meta.deprecated === undefined ? {} : { deprecated: node.meta.deprecated }),
      }],
    })
  }

  emitGraph({ prefix, nodes, results, resolverConfig, file })

  Object.defineProperty(tree, GRAPH, { value: { prefix, nodes, results, resolverConfig, file } satisfies TokenGraph })

  return tree as VaneTokens<T, Prefix>
}

function walk(
  group: object,
  path: string[],
  prefix: string,
  nodes: Map<string, TokenNode>,
  derivations: Array<{ node: TokenNode, derive: (refs: unknown) => unknown }>,
): Record<string, unknown> {
  const tree: Record<string, unknown> = {}

  for (const [key, raw] of Object.entries(group)) {
    const leafPath = [...path, key]

    if (isGroup(raw)) {
      tree[key] = walk(raw, leafPath, prefix, nodes, derivations)
      continue
    }

    const node = createNode(leafPath, prefix, raw)
    nodes.set(node.key, node)
    tree[key] = node.handle

    if (typeof raw === 'function')
      derivations.push({ node, derive: raw as (refs: unknown) => unknown })
  }

  return tree
}

function isGroup(value: unknown): value is object {
  return typeof value === 'object' && value !== null
    && !(value instanceof ColorValue) && !(value instanceof ContrastValue)
}

/**
 * What a derivation receives: the handle tree behind a proxy, so a mistyped
 * token name fails the build with a `did you mean` the moment the derivation
 * runs — TypeScript cannot type these names at the cursor ([types.ts]
 * `VaneRefs`), so the graph itself keeps the errors-before-pixels promise.
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

function createNode(path: string[], prefix: string, raw: unknown): TokenNode {
  const key = path.join('.')
  const handle = createHandle({ name: tokenName(prefix, path), path: key, mode: 'static' })
  Object.assign(handle, handleColorMethods(handle))

  const node: TokenNode = {
    key,
    name: handle.name,
    handle,
    derived: typeof raw === 'function',
    // Derivations classify after they run; `literal` is a safe placeholder.
    definition: typeof raw === 'function' ? { kind: 'literal', value: '' } : classifyLeafValue(raw, key),
    meta: raw instanceof ColorValue || raw instanceof ContrastValue ? raw.meta : {},
  }

  Object.defineProperty(handle, NODE, { value: node })

  if (node.definition.kind === 'literal' && !node.derived)
    handle.value = node.definition.value

  return node
}

function classifyLeafValue(raw: unknown, key: string): VaneLeafDefinition {
  if (raw instanceof ContrastValue)
    return { kind: 'contrast', expr: raw.expr }

  if (raw instanceof ColorValue)
    return { kind: 'color', expr: raw.expr, markedLive: raw.markedLive }

  if (typeof raw === 'string' || typeof raw === 'number')
    return { kind: 'literal', value: raw }

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

  if (result instanceof ColorValue || result instanceof ContrastValue)
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
    elevation: graph.resolverConfig,
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

      if (definition.kind === 'literal') {
        const parsed = parseColor(String(definition.value))

        if (!parsed)
          return resolver.invalidColor(`${node.key} holds '${definition.value}', which is not a color`)

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
        traits: { cssLive: false, volatile: originallyLive },
        mode: node.derived ? 'derived' : 'static',
        emitted: String(definition.value),
      }
    }

    if (definition.kind === 'contrast')
      return contrastResult(node, definition.expr)

    const { expr } = definition
    const markedLive = definition.markedLive || originallyLive
    const inner = exprTraits(expr, resolver)
    const traits = { cssLive: inner.cssLive, volatile: inner.volatile || markedLive }

    const mode: VaneTokenMode = markedLive
      ? 'live'
      : node.derived
        ? 'derived'
        : traits.cssLive ? 'scheme' : 'static'

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
    elevation: graph.resolverConfig,
    foldRef: (handle) => {
      const node = nodeOf(handle)!
      const definition = node.definition

      if (definition.kind === 'literal') {
        const parsed = parseColor(String(definition.value))

        if (!parsed)
          throw new VaneError({ code: 'VANE_TOKENS_INVALID_COLOR', message: `${node.key} holds '${definition.value}', which is not a color`, path: node.key, file: graph.file })

        return parsed
      }

      return foldExpr(definition.expr, scheme, resolver)
    },
    refTraits: (handle) => {
      const result = graph.results.get(nodeOf(handle)!.key)
      return result?.traits ?? { cssLive: false, volatile: false }
    },
    invalidColor: (detail) => {
      throw new VaneError({ code: 'VANE_TOKENS_INVALID_COLOR', message: `a check cannot resolve: ${detail}`, file: graph.file })
    },
  }

  return resolver
}

// ─── Emission ────────────────────────────────────────────────────────────────

function emitGraph(graph: TokenGraph): void {
  if (graph.nodes.size === 0)
    return

  const values: Record<string, unknown> = {}
  const supportsUpgrades: Record<string, string> = {}
  let hasSchemePairs = false

  for (const node of graph.nodes.values()) {
    const result = graph.results.get(node.key)!
    setAtPath(values, node.key.split('.'), result.emitted)

    if (result.supportsUpgrade)
      supportsUpgrades[node.name] = result.supportsUpgrade

    if (result.emitted.includes('light-dark('))
      hasSchemePairs = true
  }

  if (hasSchemePairs)
    globalStyle(':root', { colorScheme: 'light dark' })

  const contract = createGlobalThemeContract(
    values as Parameters<typeof createGlobalThemeContract>[0],
    (_value, path) => `${graph.prefix}-${path.map(kebab).join('-')}`,
  )

  createGlobalTheme(':root', contract, values as never)

  if (Object.keys(supportsUpgrades).length > 0) {
    globalStyle(':root', {
      '@supports': {
        [CONTRAST_COLOR_SUPPORT]: { vars: supportsUpgrades },
      },
    })
  }

  if (hasSchemePairs) {
    // Forcing a scheme is standard CSS: the scopes pin `color-scheme`;
    // `/runtime`'s `setScheme` writes the attribute ([dux-spec-tokens.md §3]).
    globalStyle('[data-scheme=\'light\']', { colorScheme: 'light' })
    globalStyle('[data-scheme=\'dark\']', { colorScheme: 'dark' })
  }
}

function setAtPath(target: Record<string, unknown>, path: string[], value: string): void {
  const [head, ...rest] = path

  if (rest.length === 0) {
    target[head] = value
    return
  }

  target[head] = target[head] ?? {}
  setAtPath(target[head] as Record<string, unknown>, rest, value)
}
