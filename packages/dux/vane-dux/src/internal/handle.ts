/** Plane-neutral token and branch handles shared by build and runtime planes. */

import type { VaneCssDataType } from '../values/types'
import { cssText } from '../values/types'

export type VaneTokenMode = 'static' | 'scheme' | 'live' | 'derived'
export type VaneHandleReference = 'val' | 'var'
type VaneHandleMetadataValue = string | number | boolean | null | readonly VaneHandleMetadataValue[] | { readonly [key: string]: VaneHandleMetadataValue }
type VaneHandleMetadata = Readonly<Record<string, VaneHandleMetadataValue>>

export const VANE_HANDLE = Symbol.for('vane.tokenHandle')
export const VANE_BRANCH_HANDLE = Symbol.for('vane.tokenBranchHandle')

export interface VaneHandleMeta {
  /** The emitted custom-property name, e.g. `--vane-color-brand`. */
  name: string
  /** The dot path in the graph, e.g. `color.brand`. */
  path: string
  mode: VaneTokenMode
  /** Canonical default projection; legacy restored handles omit it and stay var-referenced. */
  reference?: VaneHandleReference
  emit?: boolean
  mutable?: boolean
  type?: VaneCssDataType
  /** The authored/resolved expression. Undefined is a deliberate no-default reservation. */
  value?: string | number
  description?: string
  deprecated?: string
  metadata?: VaneHandleMetadata
  register?: unknown
  validate?: unknown
  axes?: Readonly<Record<string, Readonly<Record<string, {
    value?: string | number
    description?: string
    metadata?: VaneHandleMetadata
  }>>>>
  cases?: readonly {
    when: Readonly<Record<string, string>>
    value?: string | number
    description?: string
    metadata?: VaneHandleMetadata
  }[]
}

export interface VaneRuntimeBranchHandle {
  (): string
  readonly [VANE_BRANCH_HANDLE]: true
  $val?: string | number
  $description?: string
  $metadata?: VaneHandleMetadata
  toString: () => string
}

export interface VaneRuntimeHandle {
  (): string
  readonly [VANE_HANDLE]: true
  readonly name: string
  readonly var: `var(--${string})`
  readonly path: string
  mode: VaneTokenMode
  value?: string | number
  description?: string
  deprecated?: string
  readonly reference: VaneHandleReference
  readonly emit: boolean
  readonly mutable: boolean
  readonly type: VaneCssDataType
  readonly $name: `--${string}`
  $val?: string | number
  readonly $var: (fallback?: unknown) => `var(--${string})` | `var(--${string}, ${string})`
  readonly $path: string
  readonly $type: VaneCssDataType
  readonly $reference: VaneHandleReference
  readonly $emit: boolean
  readonly $mutable: boolean
  $description?: string
  $deprecated?: string
  $metadata?: VaneHandleMetadata
  readonly $register?: unknown
  readonly $validate?: unknown
  $axes: Record<string, Record<string, VaneRuntimeBranchHandle>>
  $case: (when: Readonly<Record<string, string>>) => VaneRuntimeBranchHandle
  toString: () => string
}

/**
 * Handles stay functions so vanilla-extract can serialize them. Canonical
 * fields use getters over mutable restoration state; the legacy aliases remain
 * internal/migration-only and therefore cannot fork from `$val`/`$name`.
 */
export function createHandle(meta: VaneHandleMeta): VaneRuntimeHandle {
  const state: VaneHandleMeta = {
    ...meta,
    reference: meta.reference ?? 'var',
    emit: meta.emit ?? true,
    mutable: meta.mutable ?? meta.mode === 'live',
    type: meta.type ?? 'unknown',
  }
  const variable = `var(${meta.name})` as `var(--${string})`
  const axes: Record<string, Record<string, VaneRuntimeBranchHandle>> = {}
  const cases = new Map<string, VaneRuntimeBranchHandle>()

  const render = () => state.reference === 'val' && state.value !== undefined
    ? String(state.value)
    : variable
  const handle = (() => render()) as VaneRuntimeHandle

  Object.defineProperty(handle, 'name', { value: meta.name, configurable: true })
  Object.defineProperty(handle, VANE_HANDLE, { value: true })
  defineGetter(handle, 'var', () => variable)
  defineGetter(handle, 'path', () => state.path)
  defineMutable(handle, 'mode', () => state.mode, value => state.mode = value)
  defineMutable(handle, 'value', () => state.value, value => state.value = value)
  defineMutable(handle, 'description', () => state.description, value => state.description = value)
  defineMutable(handle, 'deprecated', () => state.deprecated, value => state.deprecated = value)
  defineGetter(handle, 'reference', () => state.reference!)
  defineGetter(handle, 'emit', () => state.emit!)
  defineGetter(handle, 'mutable', () => state.mutable!)
  defineGetter(handle, 'type', () => state.type!)

  defineGetter(handle, '$name', () => state.name as `--${string}`)
  defineMutable(handle, '$val', () => state.value, value => state.value = value)
  defineGetter(handle, '$var', () => (fallback?: unknown) => {
    if (fallback === undefined)
      return variable
    const serialized = serializeFallback(fallback)
    return `var(${state.name}, ${serialized})` as `var(--${string}, ${string})`
  })
  defineGetter(handle, '$path', () => state.path)
  defineGetter(handle, '$type', () => state.type!)
  defineGetter(handle, '$reference', () => state.reference!)
  defineGetter(handle, '$emit', () => state.emit!)
  defineGetter(handle, '$mutable', () => state.mutable!)
  defineMutable(handle, '$description', () => state.description, value => state.description = value)
  defineMutable(handle, '$deprecated', () => state.deprecated, value => state.deprecated = value)
  defineMutable(handle, '$metadata', () => state.metadata, value => state.metadata = value)
  defineGetter(handle, '$register', () => state.register)
  defineGetter(handle, '$validate', () => state.validate)
  defineGetter(handle, '$axes', () => axes)
  defineGetter(handle, '$case', () => (when: Readonly<Record<string, string>>) => {
    const branch = cases.get(addressKey(when))
    if (!branch)
      throw new TypeError(`[vane] ${state.path} has no authored case for ${JSON.stringify(when)}`)
    return branch
  })
  defineGetter(handle, 'toString', () => render)

  if (meta.axes || meta.cases) {
    wireCaseBranches(handle)
    for (const [axis, modes] of Object.entries(meta.axes ?? {})) {
      for (const [mode, branch] of Object.entries(modes))
        attachAxisBranch(handle, axis, mode, createBranchHandle(branch.value, branch))
    }
    for (const branch of meta.cases ?? [])
      attachCaseBranch(handle, branch.when, createBranchHandle(branch.value, branch))
  }

  return handle
}

export function updateHandle(handle: VaneRuntimeHandle, update: Partial<VaneHandleMeta>): void {
  if (update.mode !== undefined)
    handle.mode = update.mode
  if ('value' in update)
    handle.$val = update.value
  if ('description' in update)
    handle.$description = update.description
  if ('deprecated' in update)
    handle.$deprecated = update.deprecated
  if ('metadata' in update)
    handle.$metadata = update.metadata
}

export function createBranchHandle(value?: string | number, meta: {
  description?: string
  metadata?: VaneHandleMetadata
} = {}): VaneRuntimeBranchHandle {
  const state = { value, ...meta }
  const render = () => state.value === undefined ? '' : String(state.value)
  const handle = (() => render()) as VaneRuntimeBranchHandle
  Object.defineProperty(handle, VANE_BRANCH_HANDLE, { value: true })
  defineMutable(handle, '$val', () => state.value, next => state.value = next)
  defineMutable(handle, '$description', () => state.description, next => state.description = next)
  defineMutable(handle, '$metadata', () => state.metadata, next => state.metadata = next)
  defineGetter(handle, 'toString', () => render)
  return handle
}

export function attachAxisBranch(
  handle: VaneRuntimeHandle,
  axis: string,
  mode: string,
  branch: VaneRuntimeBranchHandle,
): void {
  const axes = handle.$axes
  axes[axis] ??= {}
  axes[axis]![mode] = branch
}

const CASE_BRANCHES = Symbol('vane.caseBranches')

export function attachCaseBranch(
  handle: VaneRuntimeHandle,
  when: Readonly<Record<string, string>>,
  branch: VaneRuntimeBranchHandle,
): void {
  // `$case` closes over this map; storing it on a non-enumerable symbol keeps
  // private runtime addresses out of the public token tree.
  const owner = handle as VaneRuntimeHandle & { [CASE_BRANCHES]?: Map<string, VaneRuntimeBranchHandle> }
  let cases = owner[CASE_BRANCHES]
  if (!cases) {
    cases = new Map()
    Object.defineProperty(owner, CASE_BRANCHES, { value: cases })
  }
  cases.set(addressKey(when), branch)
}

/** Called immediately after creation so `$case` and attachment share storage. */
export function wireCaseBranches(handle: VaneRuntimeHandle): void {
  const owner = handle as VaneRuntimeHandle & { [CASE_BRANCHES]?: Map<string, VaneRuntimeBranchHandle> }
  const cases = owner[CASE_BRANCHES] ?? new Map<string, VaneRuntimeBranchHandle>()
  if (!owner[CASE_BRANCHES])
    Object.defineProperty(owner, CASE_BRANCHES, { value: cases })
  Object.defineProperty(handle, '$case', {
    configurable: true,
    get: () => (when: Readonly<Record<string, string>>) => {
      const branch = cases.get(addressKey(when))
      if (!branch)
        throw new TypeError(`[vane] ${handle.path} has no authored case for ${JSON.stringify(when)}`)
      return branch
    },
  })
}

export function isHandle(value: unknown): value is VaneRuntimeHandle {
  return typeof value === 'function'
    && (value as Partial<Record<typeof VANE_HANDLE, unknown>>)[VANE_HANDLE] === true
}

export function isBranchHandle(value: unknown): value is VaneRuntimeBranchHandle {
  return typeof value === 'function'
    && (value as Partial<Record<typeof VANE_BRANCH_HANDLE, unknown>>)[VANE_BRANCH_HANDLE] === true
}

function serializeFallback(value: unknown): string {
  if (isHandle(value) || isBranchHandle(value))
    return String(value)
  return cssText(value as Parameters<typeof cssText>[0])
}

function addressKey(when: Readonly<Record<string, string>>): string {
  return Object.entries(when).sort(([left], [right]) => left.localeCompare(right)).map(([axis, mode]) => `${axis}\0${mode}`).join('\x01')
}

function defineGetter<T extends object, Key extends PropertyKey>(target: T, key: Key, get: () => unknown): void {
  Object.defineProperty(target, key, { configurable: true, enumerable: true, get })
}

function defineMutable<T extends object, Key extends PropertyKey>(
  target: T,
  key: Key,
  get: () => unknown,
  set: (value: any) => void,
): void {
  Object.defineProperty(target, key, { configurable: true, enumerable: true, get, set })
}
