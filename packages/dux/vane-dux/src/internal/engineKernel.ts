/**
 * Internal Phase-1 engine kernel. Phase 2 exposes this machinery as
 * `createEngine()`; root helpers temporarily delegate to one default instance.
 */

import type { VaneCssSupportTarget, VaneExtensionIdentity } from '../values/protocol'
import type { VaneSelfValue } from '../values/types'
import {
  createSerializeContext,
  isNodeValue,
  normalizeExtension,
  serializeNode,
  VANE_DEFAULT_CSS_SUPPORT,
  VANE_NODE,
} from '../values/protocol'

export const VANE_IR_PROTOCOL = 1 as const

export interface VaneEngineKernelOptions {
  readonly support?: VaneCssSupportTarget
  readonly policies?: Readonly<Record<string, unknown>>
  readonly extensions?: readonly VaneExtensionIdentity[]
}

export interface VaneEngineKernel<Constructors extends Readonly<Record<string, unknown>>> {
  readonly protocol: typeof VANE_IR_PROTOCOL
  readonly signature: string
  readonly support: VaneCssSupportTarget
  readonly policies: Readonly<Record<string, unknown>>
  readonly extensions: readonly VaneExtensionIdentity[]
  readonly constructors: Constructors
  serialize: <Type extends import('../values/types').VaneCssDataType>(value: VaneSelfValue<Type>) => string
  compatibleWith: (other: Pick<VaneEngineKernel<Record<string, unknown>>, 'signature'>) => boolean
  extend: <Added extends Readonly<Record<string, unknown>>>(
    identity: VaneExtensionIdentity,
    added: Added,
  ) => VaneEngineKernel<Constructors & Added>
}

export function createEngineKernel<const Constructors extends Readonly<Record<string, unknown>>>(
  constructors: Constructors,
  options: VaneEngineKernelOptions = {},
): VaneEngineKernel<Constructors> {
  const support = options.support ?? VANE_DEFAULT_CSS_SUPPORT
  const policies = deepFreeze(normalize(options.policies ?? {}))
  const extensions = Object.freeze((options.extensions ?? []).map(normalizeExtension))
  assertUniqueExtensionIds(extensions)
  const frozenConstructors = Object.freeze({ ...constructors }) as Constructors
  const signature = semanticSignature({ support, policies, extensions })
  const context = createSerializeContext(support)

  return Object.freeze({
    protocol: VANE_IR_PROTOCOL,
    signature,
    support,
    policies,
    extensions,
    constructors: frozenConstructors,
    serialize<Type extends import('../values/types').VaneCssDataType>(value: VaneSelfValue<Type>): string {
      if (!isNodeValue(value))
        throw new TypeError('[vane] this value does not belong to the portable vane expression protocol')
      requireExtensions(value[VANE_NODE], extensions)
      return serializeNode(value[VANE_NODE], context)
    },
    compatibleWith(other: Pick<VaneEngineKernel<Record<string, unknown>>, 'signature'>): boolean {
      return signature === other.signature
    },
    extend<Added extends Readonly<Record<string, unknown>>>(identity: VaneExtensionIdentity, added: Added) {
      const normalized = normalizeExtension(identity)
      const collision = Object.keys(added).find(key => key in frozenConstructors)
      if (collision) {
        throw new TypeError(
          `[vane] extension "${normalized.id}" cannot define '${collision}' because that engine member already exists`,
        )
      }
      const existing = extensions.find(extension => extension.id === normalized.id)
      if (existing) {
        throw new TypeError(
          `[vane] extension id "${normalized.id}" is already installed at version ${existing.version}`,
        )
      }
      return createEngineKernel(
        { ...frozenConstructors, ...added } as Constructors & Added,
        { support, policies, extensions: [...extensions, normalized] },
      )
    },
  })
}

function semanticSignature(input: {
  support: VaneCssSupportTarget
  policies: Readonly<Record<string, unknown>>
  extensions: readonly VaneExtensionIdentity[]
}): string {
  const semantic = JSON.stringify({
    protocol: VANE_IR_PROTOCOL,
    support: {
      id: input.support.id,
      features: [...input.support.features].sort(),
    },
    policies: input.policies,
    extensions: input.extensions.map(extension => ({
      id: extension.id,
      version: String(extension.version),
      fingerprint: extension.fingerprint ?? '',
    })),
  })
  return `vane-ir-${VANE_IR_PROTOCOL}-${fnv1a(semantic)}`
}

function fnv1a(value: string): string {
  let hash = 0x811C9DC5
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function normalize(value: unknown, ancestors = new WeakSet<object>()): any {
  if (Array.isArray(value)) {
    if (ancestors.has(value))
      throw new TypeError('[vane] engine semantic policies cannot contain cycles')
    ancestors.add(value)
    const result = value.map(child => normalize(child, ancestors))
    ancestors.delete(value)
    return result
  }
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null)
      throw new TypeError('[vane] engine semantic policies must contain only plain deterministic JSON objects')
    if (ancestors.has(value))
      throw new TypeError('[vane] engine semantic policies cannot contain cycles')
    ancestors.add(value)
    const result = Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, normalize(child, ancestors)]))
    ancestors.delete(value)
    return result
  }
  if (typeof value === 'number' && !Number.isFinite(value))
    throw new TypeError('[vane] engine semantic policies cannot contain non-finite numbers')
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
    throw new TypeError('[vane] engine semantic policies must be deterministic JSON values')
  return value
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child)
  }
  return value
}

function assertUniqueExtensionIds(extensions: readonly VaneExtensionIdentity[]): void {
  const seen = new Set<string>()
  for (const extension of extensions) {
    if (seen.has(extension.id))
      throw new TypeError(`[vane] extension id "${extension.id}" is installed more than once`)
    seen.add(extension.id)
  }
}

function requireExtensions(
  node: import('../values/protocol').VaneExpressionNode,
  extensions: readonly VaneExtensionIdentity[],
): void {
  if (node.extension) {
    const installed = extensions.find(extension => extension.id === node.extension!.id)
    if (!installed || String(installed.version) !== String(node.extension.version)
      || (installed.fingerprint ?? '') !== (node.extension.fingerprint ?? '')) {
      throw new TypeError(
        `[vane] value requires extension ${node.extension.id}@${node.extension.version}, which is not compatible with this engine`,
      )
    }
  }

  if (node.fallback)
    requireExtensions(node.fallback, extensions)

  switch (node.kind) {
    case 'function':
      node.values.forEach(child => requireExtensions(child, extensions))
      break
    case 'operation':
      requireExtensions(node.left, extensions)
      requireExtensions(node.right, extensions)
      break
    case 'var':
      if (node.valueFallback)
        requireExtensions(node.valueFallback, extensions)
      break
    case 'composite':
      node.parts.forEach((part) => {
        if (typeof part !== 'string')
          requireExtensions(part, extensions)
      })
      break
    case 'plugin':
      node.values.forEach(child => requireExtensions(child, extensions))
      break
    case 'literal':
    case 'raw':
      break
  }
}
