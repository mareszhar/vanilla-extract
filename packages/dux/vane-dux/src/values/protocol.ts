/**
 * Shared CSS value IR. This file is the one privileged implementation layer;
 * public extensions construct values through `defineCssValue` and
 * `defineCssOperation`, never by subclassing these classes.
 */

import type {
  VaneCssDataType,
  VaneCssInput,
  VaneCssValue,
  VaneResolution,
  VaneSelfValue,
  VaneValue,
} from './types'
import { cssText, CssValue, isVaneValue } from './types'

export type VaneExpressionKind
  = | 'literal'
    | 'function'
    | 'operation'
    | 'var'
    | 'raw'
    | 'plugin'
    | 'composite'

export type VaneCssFeature
  = | 'calc-basic'
    | 'calc-typed-arithmetic'
    | 'color-level-4'
    | 'color-level-5'
    | 'color-mix'
    | 'custom-properties'
    | 'light-dark'
    | 'relative-color'
    | `plugin:${string}`

export interface VaneSource {
  readonly helper?: string
  readonly authored?: string
  readonly file?: string
  readonly line?: number
  readonly column?: number
  readonly parents?: readonly VaneSource[]
}

export interface VaneExtensionIdentity {
  readonly id: string
  readonly version: string | number
  readonly fingerprint?: string
}

export interface VaneReference {
  readonly kind: 'custom-property' | 'token' | 'plugin'
  readonly name?: `--${string}`
  readonly path?: string
  readonly type: VaneCssDataType
  readonly resolution: VaneResolution
  readonly extension?: VaneExtensionIdentity
}

export interface VaneCssSupportTarget {
  readonly id: string
  readonly features: ReadonlySet<VaneCssFeature>
}

export interface VaneSerializeContext {
  readonly support: VaneCssSupportTarget
  serialize: (value: VaneValue | VaneCssInput) => string
  resolveReference: (reference: VaneReference) => string
}

export interface VaneFoldContext {
  readonly serialize: VaneSerializeContext
}

export type VaneFoldRefusal
  = | 'runtime-dependency'
    | 'raw-or-unknown'
    | 'plugin-without-fold-support'
    | 'platform-dependent'
    | 'color-or-gamut-semantics'
    | 'unsupported-arithmetic'
    | 'preserve-native-policy'

export type VaneFoldResult
  = { readonly kind: 'folded', readonly node: VaneExpressionNode }
    | { readonly kind: 'preserve', readonly reason: VaneFoldRefusal }

interface VaneNodeBase<Type extends VaneCssDataType = VaneCssDataType> {
  readonly kind: VaneExpressionKind
  readonly type: Type
  readonly resolution: VaneResolution
  readonly dependencies: readonly VaneReference[]
  readonly requirements: readonly VaneCssFeature[]
  readonly source?: VaneSource
  readonly extension?: VaneExtensionIdentity
  readonly fold?: (context: VaneFoldContext) => VaneFoldResult
  readonly fallback?: VaneExpressionNode
}

export interface VaneLiteralNode<Type extends VaneCssDataType = VaneCssDataType> extends VaneNodeBase<Type> {
  readonly kind: 'literal'
  readonly value: string | number
}

export interface VaneFunctionNode<Type extends VaneCssDataType = VaneCssDataType> extends VaneNodeBase<Type> {
  readonly kind: 'function'
  readonly name: string
  readonly values: readonly VaneExpressionNode[]
  readonly separator: ', ' | ' ' | ' / '
}

export interface VaneOperationNode<Type extends VaneCssDataType = VaneCssDataType> extends VaneNodeBase<Type> {
  readonly kind: 'operation'
  readonly operator: '+' | '-' | '*' | '/'
  readonly left: VaneExpressionNode
  readonly right: VaneExpressionNode
  readonly parenthesize: boolean
}

export interface VaneVarNode<Type extends VaneCssDataType = VaneCssDataType> extends VaneNodeBase<Type> {
  readonly kind: 'var'
  readonly reference: VaneReference
  readonly valueFallback?: VaneExpressionNode
}

export interface VaneRawNode<Type extends VaneCssDataType = VaneCssDataType> extends VaneNodeBase<Type> {
  readonly kind: 'raw'
  readonly syntax: string
}

export interface VanePluginNode<Type extends VaneCssDataType = VaneCssDataType> extends VaneNodeBase<Type> {
  readonly kind: 'plugin'
  /** Child expressions retained for identity checks and provenance traversal. */
  readonly values: readonly VaneExpressionNode[]
  readonly serialize: (context: VaneSerializeContext) => string
}

export interface VaneCompositeNode<Type extends VaneCssDataType = VaneCssDataType> extends VaneNodeBase<Type> {
  readonly kind: 'composite'
  readonly parts: readonly (string | VaneExpressionNode)[]
}

export type VaneExpressionNode<Type extends VaneCssDataType = VaneCssDataType>
  = | VaneLiteralNode<Type>
    | VaneFunctionNode<Type>
    | VaneOperationNode<Type>
    | VaneVarNode<Type>
    | VaneRawNode<Type>
    | VanePluginNode<Type>
    | VaneCompositeNode<Type>

export const VANE_NODE = Symbol.for('vane.expressionNode')

type VaneNodeValue<Type extends VaneCssDataType = VaneCssDataType> = VaneValue<Type> & {
  readonly [VANE_NODE]: VaneExpressionNode<Type>
}

/** The published, CI-locked zero-config target for this release. */
export const VANE_DEFAULT_CSS_SUPPORT: VaneCssSupportTarget = Object.freeze({
  id: 'vane-2026-07',
  features: immutableSet<VaneCssFeature>([
    'calc-basic',
    'calc-typed-arithmetic',
    'color-level-4',
    'color-level-5',
    'color-mix',
    'custom-properties',
    'light-dark',
    'relative-color',
  ]),
})

export function defineCssSupportTarget(input: {
  id: string
  features: Iterable<VaneCssFeature>
}): VaneCssSupportTarget {
  if (input.id.trim().length === 0)
    throw new TypeError('[vane] a CSS support target needs a stable non-empty id')

  return Object.freeze({ id: input.id, features: immutableSet(input.features) })
}

/** Phase-1 integration adapter; `createEngine({ support })` owns it in Phase 2. */
export function createCssValueSerializer(support: VaneCssSupportTarget): {
  readonly support: VaneCssSupportTarget
  serialize: <Type extends VaneCssDataType>(value: VaneSelfValue<Type>) => string
} {
  const context = createSerializeContext(support)
  return Object.freeze({
    support,
    serialize<Type extends VaneCssDataType>(value: VaneSelfValue<Type>) {
      return context.serialize(value)
    },
  })
}

export function nodeOf<Type extends VaneCssDataType>(value: VaneValue<Type>): VaneExpressionNode<Type> {
  const node = (value as Partial<VaneNodeValue<Type>>)[VANE_NODE]

  if (!node)
    throw new TypeError('[vane] this value does not expose a portable vane expression node')

  return node
}

export function isNodeValue(value: unknown): value is VaneNodeValue {
  return isVaneValue(value) && VANE_NODE in value
}

export function serializeNode(node: VaneExpressionNode, context: VaneSerializeContext): string {
  const missing = node.requirements.filter(feature => !context.support.features.has(feature))

  if (missing.length > 0) {
    if (node.fallback)
      return serializeNode(node.fallback, context)

    throw new TypeError(
      `[vane] ${node.source?.helper ?? node.kind} requires ${missing.join(', ')}, which is outside CSS support target "${context.support.id}"; `
      + 'provide a proven fallback, choose a compatible support target, or use an acknowledged raw/experimental lane',
    )
  }

  switch (node.kind) {
    case 'literal':
      return typeof node.value === 'number' ? finiteNumber(node.value) : node.value
    case 'function':
      return `${node.name}(${node.values.map(value => serializeNode(value, context)).join(node.separator)})`
    case 'operation': {
      const expression = `${serializeNode(node.left, context)} ${node.operator} ${serializeNode(node.right, context)}`
      return node.parenthesize ? `(${expression})` : expression
    }
    case 'var': {
      const name = context.resolveReference(node.reference)
      const fallback = node.valueFallback ? `, ${serializeNode(node.valueFallback, context)}` : ''
      return `var(${name}${fallback})`
    }
    case 'raw':
      return node.syntax
    case 'plugin':
      return node.serialize(context)
    case 'composite':
      return node.parts.map(part => typeof part === 'string' ? part : serializeNode(part, context)).join('')
  }
}

/** Recursively collect the platform capabilities required by an expression. */
export function collectNodeRequirements(node: VaneExpressionNode): readonly VaneCssFeature[] {
  const requirements = new Set<VaneCssFeature>()

  const visit = (current: VaneExpressionNode): void => {
    current.requirements.forEach(requirement => requirements.add(requirement))
    if (current.fallback)
      visit(current.fallback)

    switch (current.kind) {
      case 'function':
      case 'plugin':
        current.values.forEach(visit)
        break
      case 'operation':
        visit(current.left)
        visit(current.right)
        break
      case 'var':
        if (current.valueFallback)
          visit(current.valueFallback)
        break
      case 'composite':
        current.parts.forEach((part) => {
          if (typeof part !== 'string')
            visit(part)
        })
        break
      case 'literal':
      case 'raw':
        break
    }
  }

  visit(node)
  return Object.freeze([...requirements])
}

export function createSerializeContext(
  support: VaneCssSupportTarget = VANE_DEFAULT_CSS_SUPPORT,
  resolveReference: VaneSerializeContext['resolveReference'] = selfReference,
): VaneSerializeContext {
  const context: VaneSerializeContext = {
    support,
    resolveReference,
    serialize(value) {
      if (typeof value === 'number')
        return finiteNumber(value)
      if (typeof value === 'string')
        return nonEmpty(value)
      if (!isNodeValue(value)) {
        if ((typeof value === 'object' || typeof value === 'function') && value !== null && 'var' in value)
          return value.var
        if ((typeof value === 'object' || typeof value === 'function') && value !== null && '$var' in value)
          return String(value)
        throw new TypeError('[vane] the serializer received a value from an incompatible expression protocol')
      }
      return serializeNode(value[VANE_NODE], context)
    },
  }
  return context
}

const SELF_CONTEXT = createSerializeContext()

export function serializeSelf(value: VaneValue | VaneCssInput): string {
  return SELF_CONTEXT.serialize(value)
}

export class ExpressionValue<Type extends VaneCssDataType = VaneCssDataType>
  extends CssValue<string, Type> implements VaneCssValue<string, Type> {
  readonly [VANE_NODE]: VaneExpressionNode<Type>

  constructor(node: VaneExpressionNode<Type>) {
    super(node.type)
    this[VANE_NODE] = node
  }

  get css(): string {
    return serializeSelf(this)
  }
}

export function literalNode<Type extends VaneCssDataType>(
  type: Type,
  value: string | number,
  source?: VaneSource,
): VaneLiteralNode<Type> {
  if (typeof value === 'number')
    finiteNumber(value)
  else
    nonEmpty(value)

  return base({ kind: 'literal', type, value, source })
}

export function rawNode<Type extends VaneCssDataType>(
  type: Type,
  syntax: string,
  source?: VaneSource,
): VaneRawNode<Type> {
  return base({ kind: 'raw', type, syntax: nonEmpty(syntax), source, fold: () => ({ kind: 'preserve', reason: 'raw-or-unknown' }) })
}

export function functionNode<Type extends VaneCssDataType>(input: {
  type: Type
  name: string
  values: readonly VaneExpressionNode[]
  separator?: VaneFunctionNode['separator']
  requirements?: readonly VaneCssFeature[]
  source?: VaneSource
  fallback?: VaneExpressionNode
  fold?: VaneFunctionNode<Type>['fold']
}): VaneFunctionNode<Type> {
  const possibleValues = input.fallback ? [...input.values, input.fallback] : input.values
  return base({
    kind: 'function',
    type: input.type,
    name: input.name,
    values: input.values,
    separator: input.separator ?? ', ',
    requirements: input.requirements,
    source: input.source,
    fallback: input.fallback,
    fold: input.fold,
    resolution: joinResolution(possibleValues),
    dependencies: joinDependencies(possibleValues),
  })
}

export function operationNode<Type extends VaneCssDataType>(input: {
  type: Type
  operator: VaneOperationNode['operator']
  left: VaneExpressionNode
  right: VaneExpressionNode
  parenthesize?: boolean
  requirements?: readonly VaneCssFeature[]
  source?: VaneSource
}): VaneOperationNode<Type> {
  const values = [input.left, input.right]
  return base({
    kind: 'operation',
    type: input.type,
    operator: input.operator,
    left: input.left,
    right: input.right,
    parenthesize: input.parenthesize ?? false,
    requirements: input.requirements,
    source: input.source,
    resolution: joinResolution(values),
    dependencies: joinDependencies(values),
  })
}

export function varNode<Type extends VaneCssDataType>(input: {
  type: Type
  reference: VaneReference
  fallback?: VaneExpressionNode
  source?: VaneSource
}): VaneVarNode<Type> {
  return base({
    kind: 'var',
    type: input.type,
    reference: input.reference,
    valueFallback: input.fallback,
    requirements: ['custom-properties'],
    source: input.source,
    resolution: input.reference.resolution === 'system' || input.fallback?.resolution === 'system' ? 'system' : 'self',
    dependencies: dedupeDependencies([input.reference, ...(input.fallback?.dependencies ?? [])]),
  })
}

export function compositeNode<Type extends VaneCssDataType>(input: {
  type: Type
  parts: readonly (string | VaneExpressionNode)[]
  requirements?: readonly VaneCssFeature[]
  source?: VaneSource
}): VaneCompositeNode<Type> {
  const nodes = input.parts.filter((part): part is VaneExpressionNode => typeof part !== 'string')
  return base({
    kind: 'composite',
    type: input.type,
    parts: input.parts,
    requirements: input.requirements,
    source: input.source,
    resolution: joinResolution(nodes),
    dependencies: joinDependencies(nodes),
  })
}

export function pluginNode<Type extends VaneCssDataType>(input: {
  type: Type
  extension: VaneExtensionIdentity
  dependencies?: readonly VaneExpressionNode[]
  requirements?: readonly VaneCssFeature[]
  source?: VaneSource
  serialize: VanePluginNode<Type>['serialize']
  fold?: VanePluginNode<Type>['fold']
  fallback?: VaneExpressionNode
}): VanePluginNode<Type> {
  const dependencies = input.dependencies ?? []
  const possibleValues = input.fallback ? [...dependencies, input.fallback] : dependencies
  return base({
    kind: 'plugin',
    type: input.type,
    values: dependencies,
    extension: normalizeExtension(input.extension),
    requirements: input.requirements,
    source: input.source,
    serialize: input.serialize,
    fold: input.fold,
    fallback: input.fallback,
    resolution: joinResolution(possibleValues),
    dependencies: joinDependencies(possibleValues),
  })
}

export function inputNode(value: VaneCssInput, assertedType?: VaneCssDataType): VaneExpressionNode {
  if (isNodeValue(value))
    return value[VANE_NODE]

  if ((typeof value === 'object' || typeof value === 'function') && value !== null && 'var' in value) {
    const tokenPath = 'path' in value && typeof value.path === 'string' ? value.path : undefined
    const token = tokenPath !== undefined
    const reference: VaneReference = {
      kind: token ? 'token' : 'custom-property',
      name: customPropertyName(value.var),
      ...(tokenPath === undefined ? {} : { path: tokenPath }),
      type: assertedType ?? 'unknown',
      resolution: 'self',
    }
    return varNode({ type: assertedType ?? 'unknown', reference })
  }

  if ((typeof value === 'object' || typeof value === 'function') && value !== null && '$var' in value) {
    // Prior stages are hydrated before a derivation runs. An explicit val
    // projection can therefore enter the portable IR as its resolved value.
    if ('$reference' in value && value.$reference === 'val')
      return literalNode(assertedType ?? 'unknown', String(value))

    const tokenPath = '$path' in value && typeof value.$path === 'string' ? value.$path : undefined
    const reference: VaneReference = {
      kind: tokenPath === undefined ? 'custom-property' : 'token',
      name: customPropertyName((value as { $var: () => string }).$var()),
      ...(tokenPath === undefined ? {} : { path: tokenPath }),
      type: assertedType ?? 'unknown',
      resolution: 'self',
    }
    return varNode({ type: assertedType ?? 'unknown', reference })
  }

  return literalNode(assertedType ?? inferLiteralType(value), cssText(value))
}

export function normalizeExtension(identity: VaneExtensionIdentity): VaneExtensionIdentity {
  const id = identity.id.trim()
  const version = String(identity.version).trim()
  const fingerprint = identity.fingerprint?.trim()

  if (!id || !version)
    throw new TypeError('[vane] opaque CSS value semantics require a stable extension id and version')

  return Object.freeze({ id, version, ...(fingerprint ? { fingerprint } : {}) })
}

function base<T extends VaneExpressionNode>(
  node: Omit<T, 'dependencies' | 'requirements' | 'resolution'>
    & Partial<Pick<T, 'dependencies' | 'requirements' | 'resolution'>>,
): T {
  return Object.freeze({
    ...node,
    dependencies: Object.freeze(node.dependencies ?? []),
    requirements: Object.freeze(node.requirements ?? []),
    resolution: node.resolution ?? 'self',
  }) as T
}

function selfReference(reference: VaneReference): string {
  if (reference.resolution === 'system')
    throw new TypeError('[vane] this value needs a finalized system before it can be serialized')
  if (!reference.name)
    throw new TypeError('[vane] a self-contained custom-property reference needs its final name')
  return reference.name
}

function joinResolution(nodes: readonly VaneExpressionNode[]): VaneResolution {
  return nodes.some(node => node.resolution === 'system') ? 'system' : 'self'
}

function joinDependencies(nodes: readonly VaneExpressionNode[]): readonly VaneReference[] {
  return dedupeDependencies(nodes.flatMap(node => node.dependencies))
}

function dedupeDependencies(dependencies: readonly VaneReference[]): readonly VaneReference[] {
  const seen = new Set<string>()
  return dependencies.filter((dependency) => {
    const key = `${dependency.kind}:${dependency.name ?? ''}:${dependency.path ?? ''}:${dependency.extension?.id ?? ''}`
    if (seen.has(key))
      return false
    seen.add(key)
    return true
  })
}

function customPropertyName(reference: string): `--${string}` {
  const match = reference.match(/^var\((--[^,\s)]+)/)
  if (!match)
    throw new TypeError(`[vane] '${reference}' is not a custom-property var() reference`)
  return match[1] as `--${string}`
}

function inferLiteralType(value: VaneCssInput): VaneCssDataType {
  if (typeof value === 'number')
    return Number.isInteger(value) ? 'integer' : 'number'
  if (typeof value !== 'string')
    return 'unknown'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)%$/.test(value))
    return 'percentage'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch|ex|lh|rlh|cm|mm|in|pt|pc|q|cap|ic|vb|vi|svh|svw|lvh|lvw|dvh|dvw|cqw|cqh|cqi|cqb|cqmin|cqmax)$/.test(value))
    return 'length'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:deg|grad|rad|turn)$/.test(value))
    return 'angle'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:ms|s)$/.test(value))
    return 'time'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:Hz|kHz)$/.test(value))
    return 'frequency'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:dpcm|dpi|dppx|x)$/.test(value))
    return 'resolution'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)fr$/.test(value))
    return 'flex'
  return 'unknown'
}

function finiteNumber(value: number): string {
  if (!Number.isFinite(value))
    throw new RangeError(`[vane] a CSS number must be finite; received ${value}`)
  return String(Object.is(value, -0) ? 0 : value)
}

function nonEmpty(value: string): string {
  if (value.trim().length === 0)
    throw new TypeError('[vane] a CSS value cannot be empty')
  return value
}

function immutableSet<T>(values: Iterable<T>): ReadonlySet<T> {
  const set = new Set(values)
  const view: ReadonlySet<T> = {
    get size() {
      return set.size
    },
    entries: () => set.entries(),
    forEach(callback, thisArg) {
      set.forEach(value => callback.call(thisArg, value, value, view))
    },
    has: value => set.has(value),
    keys: () => set.keys(),
    values: () => set.values(),
    [Symbol.iterator]: () => set[Symbol.iterator](),
  }
  return Object.freeze(view)
}
