/** Browser-safe runtime binding over pre-emitted mutable custom-property slots. */

import type {
  VaneRuntimeBranchHandle as InternalBranchHandle,
  VaneRuntimeHandle as InternalTokenHandle,
  VaneHandleMeta,
  VaneHandleRuntimeAddress,
  VaneSemanticTokenAddress,
} from '../internal/handle'
import type {
  VaneStandardSchemaV1,
  VaneTokenBranchHandle,
  VaneTokenFallback,
  VaneTokenHandle,
  VaneTokenHandleAny,
} from '../tokens/types'
import type { VaneCssDataType } from '../values/types'
import type { VaneAxisDefinitions, VaneAxisModeName } from './axes'
import {
  createHandle,
  isBranchHandle,
  isHandle,
  runtimeAddressOf,
} from '../internal/handle'
import { isCssValue, isVaneValue } from '../values/types'

export const VANE_RUNTIME_SNAPSHOT_VERSION = 1 as const
export const VANE_RUNTIME_CONTRACT_PROTOCOL = 1 as const

export type VaneRuntimeInput<Type extends VaneCssDataType = VaneCssDataType>
  = VaneTokenFallback<Type>

export interface VaneRuntimeStyleDeclaration {
  readonly setProperty: (name: string, value: string, priority?: string) => void
  readonly removeProperty: (name: string) => string
  readonly getPropertyValue?: (name: string) => string
}

/** Structural by design: HTML/SVG elements and test/framework adapters qualify. */
export interface VaneRuntimeTarget {
  readonly style: VaneRuntimeStyleDeclaration
  readonly setAttribute: (name: string, value: string) => void
  readonly removeAttribute: (name: string) => void
  readonly getAttribute?: (name: string) => string | null
  readonly matches?: (selector: string) => boolean
  readonly contains?: (other: any) => boolean
  readonly ownerDocument?: {
    readonly querySelector: (selector: string) => unknown
    readonly documentElement?: unknown
  } | null
}

export type VaneCustomPropertyReference
  = `--${string}`
    | { readonly $name: `--${string}` }
    | { readonly name: `--${string}` }

export type VaneCustomPropertyTarget
  = VaneRuntimeStyleDeclaration
    | { readonly style: VaneRuntimeStyleDeclaration }

export type VaneCustomPropertyEntries
  = Readonly<Record<`--${string}`, VaneRuntimeInput>>
    | readonly (readonly [VaneCustomPropertyReference, VaneRuntimeInput])[]

export interface VaneRuntimeValidationContract {
  readonly id: string
  readonly runtime: false | 'dev' | 'always'
  readonly onInvalid: 'throw' | 'fallback' | 'omit'
  readonly fallback?: string
}

export interface VaneRuntimeBranchContract {
  readonly address: Exclude<VaneSemanticTokenAddress, { readonly kind: 'base' }>
  readonly slot?: string
  readonly value?: string | number
}

export interface VaneRuntimeTokenContract {
  readonly token: readonly string[]
  readonly name: `--${string}`
  readonly root: string
  readonly type: VaneCssDataType
  readonly reference: 'val' | 'var'
  readonly emit: boolean
  readonly mutable: boolean
  readonly value?: string | number
  readonly description?: string
  readonly deprecated?: string
  readonly metadata?: VaneHandleMeta['metadata']
  readonly validation?: VaneRuntimeValidationContract
  readonly baseSlot?: string
  readonly branches: readonly VaneRuntimeBranchContract[]
}

export interface VaneRuntimeAxisContract {
  readonly defaultMode?: string
  readonly modes: readonly string[]
  readonly attribute?: {
    readonly name: string
    /** null selects a triggerless default by removing the shared attribute. */
    readonly values: Readonly<Record<string, string | null>>
  }
}

export interface VaneRuntimeContract {
  readonly protocol: typeof VANE_RUNTIME_CONTRACT_PROTOCOL
  readonly system: string
  readonly prefix: string
  readonly root: string
  readonly axisOrder: readonly string[]
  readonly axes: Readonly<Record<string, VaneRuntimeAxisContract>>
  readonly tokens: readonly VaneRuntimeTokenContract[]
}

export type VaneRuntimeContractDraft = Omit<VaneRuntimeContract, 'system'>

export interface VaneRuntimeSnapshotOverride {
  readonly token: readonly string[]
  readonly address: VaneSemanticTokenAddress
  readonly val: string
}

export interface VaneRuntimeSnapshotV1 {
  readonly version: typeof VANE_RUNTIME_SNAPSHOT_VERSION
  readonly system: string
  readonly overrides: readonly VaneRuntimeSnapshotOverride[]
  readonly modes: Readonly<Record<string, string>>
}

export type VaneRuntimeDiagnosticCode
  = | 'VANE_RUNTIME_SCHEMA_MISMATCH'
    | 'VANE_RUNTIME_UNKNOWN_TOKEN'
    | 'VANE_RUNTIME_UNKNOWN_ADDRESS'
    | 'VANE_RUNTIME_IMMUTABLE_TOKEN'
    | 'VANE_RUNTIME_INVALID_VALUE'
    | 'VANE_RUNTIME_UNKNOWN_MODE'
    | 'VANE_RUNTIME_UNSELECTABLE_AXIS'
    | 'VANE_RUNTIME_SUBSTITUTION_ROOT'

export interface VaneRuntimeDiagnostic {
  readonly code: VaneRuntimeDiagnosticCode
  readonly message: string
  readonly token?: readonly string[]
  readonly address?: VaneSemanticTokenAddress
  readonly axis?: string
  readonly mode?: string
}

export interface VaneRuntimeReconciliation {
  readonly snapshot: VaneRuntimeSnapshotV1
  readonly diagnostics: readonly VaneRuntimeDiagnostic[]
}

export interface VaneRuntimeRootProps {
  readonly style: Readonly<Record<`--${string}`, string>>
  readonly attributes: Readonly<Record<string, string>>
}

export interface VaneRuntimeInspection {
  readonly system: string
  readonly root: string
  readonly active: boolean
  readonly modes: Readonly<Record<string, string>>
  readonly overrides: readonly {
    readonly token: readonly string[]
    readonly address: VaneSemanticTokenAddress
    readonly val: string
    readonly name: `--${string}`
    readonly slot: `--${string}`
    readonly tokenRoot: string
    readonly applied?: string
  }[]
  readonly diagnostics: readonly VaneRuntimeDiagnostic[]
}

export interface VaneRuntimeOptions {
  readonly initial?: unknown
  /** App-plane Standard Schema implementations keyed by token.validate.id. */
  readonly validators?: Readonly<Record<string, VaneStandardSchemaV1>>
  /** Explicit dev signal for `runtime: 'dev'`; inferred when omitted. */
  readonly dev?: boolean
}

export interface VaneRuntimeMutableActions<Type extends VaneCssDataType = VaneCssDataType> {
  readonly $set: (input: VaneRuntimeInput<Type>) => void
  readonly $unset: () => void
}

type RuntimeBranch<Branch, Mutable extends boolean, Type extends VaneCssDataType>
  = Branch & (Mutable extends true ? VaneRuntimeMutableActions<Type> : object)

type RuntimeAxes<Axes, Mutable extends boolean, Type extends VaneCssDataType> = {
  readonly [Axis in keyof Axes]: {
    readonly [Mode in keyof Axes[Axis]]: RuntimeBranch<Axes[Axis][Mode], Mutable, Type>
  }
}

type RuntimeToken<Handle> = Handle extends VaneTokenHandle<
  any,
  any,
  any,
  infer Type,
  any,
  any,
  infer Mutable,
  any,
  any,
  any
> ? (
    Omit<Handle, '$axes' | '$case'>
    & (Mutable extends true ? VaneRuntimeMutableActions<Type> : object)
    & {
      readonly $axes: Handle extends { readonly $axes: infer Axes }
        ? RuntimeAxes<Axes, Mutable, Type>
        : Record<never, never>
      readonly $case: Handle extends { readonly $case: (when: infer When) => infer Branch }
        ? (when: When) => RuntimeBranch<Branch, Mutable, Type>
        : never
    }
    )
  : Handle

export type VaneRuntimeTokens<T> = {
  readonly [Key in keyof T]: T[Key] extends VaneTokenHandleAny
    ? RuntimeToken<T[Key]>
    : T[Key] extends object ? VaneRuntimeTokens<T[Key]> : T[Key]
}

export type VaneRuntimeBaseOverrides<T> = {
  readonly [Key in keyof T]?: T[Key] extends VaneTokenHandleAny
    ? T[Key]['$mutable'] extends true ? VaneRuntimeInput<T[Key]['$type']> : never
    : T[Key] extends object ? VaneRuntimeBaseOverrides<T[Key]> : never
}

export type VaneMutableRuntimeAddressHandle
  = VaneTokenHandle<any, string, string, any, any, any, true, any, any, any>
    | VaneTokenBranchHandle<any, true>

export type VaneMutableRuntimeHandleEntry = readonly [
  VaneMutableRuntimeAddressHandle,
  VaneRuntimeInput,
]

export type VaneRuntimeMode<Axes extends VaneAxisDefinitions, Axis extends keyof Axes>
  = VaneAxisModeName<Axes[Axis]>

interface VaneBoundRuntimeCore<T, Axes extends VaneAxisDefinitions> {
  readonly t: VaneRuntimeTokens<T>
  readonly diagnostics: readonly VaneRuntimeDiagnostic[]
  readonly applyTokenOverrides: {
    (overrides: VaneRuntimeBaseOverrides<T>): void
    (entries: readonly VaneMutableRuntimeHandleEntry[]): void
  }
  readonly setMode: <Axis extends keyof Axes & string>(
    axis: Axis,
    mode: VaneRuntimeMode<Axes, Axis>,
  ) => void
  readonly clearMode: (axis: keyof Axes & string) => void
  readonly snapshot: () => VaneRuntimeSnapshotV1
  /** Inspect semantic overrides together with the concrete slots they write. */
  readonly inspect: () => VaneRuntimeInspection
}

export type VaneBoundRuntime<T, Axes extends VaneAxisDefinitions = VaneAxisDefinitions>
  = VaneBoundRuntimeCore<T, Axes>
    & (Axes extends { readonly scheme: infer Scheme }
      ? { readonly setScheme: (mode: VaneAxisModeName<Scheme>) => void }
      : object)

export type VaneRuntimeFactory<T, Axes extends VaneAxisDefinitions = VaneAxisDefinitions> = (
  root?: VaneRuntimeTarget,
  options?: VaneRuntimeOptions,
) => VaneBoundRuntime<T, Axes>

export interface VaneRuntimeServices<T, Axes extends VaneAxisDefinitions = VaneAxisDefinitions> {
  readonly runtime: VaneRuntimeFactory<T, Axes>
  readonly reconcileRuntimeSnapshot: (snapshot: unknown, options?: VaneRuntimeOptions) => VaneRuntimeReconciliation
  readonly runtimeStyle: (snapshot: unknown, options?: VaneRuntimeOptions) => Readonly<Record<`--${string}`, string>>
  readonly runtimeProps: (snapshot: unknown, options?: VaneRuntimeOptions) => VaneRuntimeRootProps
}

interface RuntimeSchemaStore {
  readonly [id: string]: VaneStandardSchemaV1 | undefined
}

interface RuntimeState {
  root: VaneRuntimeTarget
  readonly contract: VaneRuntimeContract
  readonly overrides: Map<string, VaneRuntimeSnapshotOverride>
  readonly modes: Map<string, string>
  readonly diagnostics: VaneRuntimeDiagnostic[]
  readonly options: VaneRuntimeOptions
  active: boolean
}

const BOUND_RUNTIMES = new WeakMap<object, Map<string, RuntimeState>>()

/** Finalize a JSON-safe draft with a deterministic semantic schema ID. */
export function sealRuntimeContract(draft: VaneRuntimeContractDraft): VaneRuntimeContract {
  const semantic = stableStringify({
    protocol: draft.protocol,
    prefix: draft.prefix,
    root: draft.root,
    axisOrder: draft.axisOrder,
    axes: draft.axes,
    tokens: draft.tokens.filter(token => token.mutable && token.baseSlot).map(token => ({
      token: token.token,
      name: token.name,
      root: token.root,
      type: token.type,
      validation: token.validation,
      branches: token.branches.map(branch => branch.address),
    })),
  })
  return deepFreeze({
    ...draft,
    system: `vane-runtime-1-${fnv1a(semantic)}`,
  })
}

/** Direct CSS lane: public token properties are intentionally accepted too. */
export function setCustomProperty(
  target: VaneCustomPropertyTarget,
  property: VaneCustomPropertyReference,
  val: VaneRuntimeInput,
): void {
  styleOf(target).setProperty(customPropertyName(property), serializeRuntimeValue(val))
}

export function setCustomProperties(
  target: VaneCustomPropertyTarget,
  entries: VaneCustomPropertyEntries,
): void {
  if (Array.isArray(entries)) {
    for (const [property, val] of entries)
      setCustomProperty(target, property, val)
    return
  }
  for (const [property, val] of Object.entries(entries))
    setCustomProperty(target, property as `--${string}`, val)
}

export function createRuntimeServices<T, Axes extends VaneAxisDefinitions = VaneAxisDefinitions>(
  contract: VaneRuntimeContract,
  embeddedSchemas: RuntimeSchemaStore = {},
): VaneRuntimeServices<T, Axes> {
  const reconcile = (snapshot: unknown, options: VaneRuntimeOptions = {}) =>
    reconcileSnapshot(contract, snapshot, mergeSchemas(embeddedSchemas, options.validators), options)
  const runtimeStyle = (snapshot: unknown, options: VaneRuntimeOptions = {}) => {
    const result = reconcile(snapshot, options)
    return projectStyle(contract, result.snapshot)
  }
  const runtimeProps = (snapshot: unknown, options: VaneRuntimeOptions = {}) => {
    const result = reconcile(snapshot, options)
    return Object.freeze({
      style: projectStyle(contract, result.snapshot),
      attributes: projectAttributes(contract, result.snapshot),
    })
  }
  return {
    runtime: ((root?: VaneRuntimeTarget, options: VaneRuntimeOptions = {}) =>
      bindRuntime<T, Axes>(contract, root, options, mergeSchemas(embeddedSchemas, options.validators))) as VaneRuntimeFactory<T, Axes>,
    reconcileRuntimeSnapshot: reconcile,
    runtimeStyle,
    runtimeProps,
  }
}

/** Generated app-plane restoration targets. */
export function restoreRuntimeFactory<T, Axes extends VaneAxisDefinitions = VaneAxisDefinitions>(
  contract: VaneRuntimeContract,
): VaneRuntimeFactory<T, Axes> {
  return createRuntimeServices<T, Axes>(contract).runtime
}

export function restoreRuntimeReconciler(contract: VaneRuntimeContract): VaneRuntimeServices<unknown>['reconcileRuntimeSnapshot'] {
  return createRuntimeServices(contract).reconcileRuntimeSnapshot
}

export function restoreRuntimeStyle(contract: VaneRuntimeContract): VaneRuntimeServices<unknown>['runtimeStyle'] {
  return createRuntimeServices(contract).runtimeStyle
}

export function restoreRuntimeProps(contract: VaneRuntimeContract): VaneRuntimeServices<unknown>['runtimeProps'] {
  return createRuntimeServices(contract).runtimeProps
}

function bindRuntime<T, Axes extends VaneAxisDefinitions>(
  contract: VaneRuntimeContract,
  authoredRoot: VaneRuntimeTarget | undefined,
  options: VaneRuntimeOptions,
  schemas: RuntimeSchemaStore,
): VaneBoundRuntime<T, Axes> {
  const root = resolveRoot(authoredRoot, contract)
  const family = `${contract.prefix}\0${contract.root}`
  const bindings = BOUND_RUNTIMES.get(root as object) ?? new Map<string, RuntimeState>()
  const prior = bindings.get(family)
  const effectiveOptions = options.initial === undefined && prior
    ? { ...options, initial: snapshotOf(prior.contract, prior) }
    : options
  if (prior)
    prior.active = false
  const state: RuntimeState = {
    root,
    contract,
    overrides: new Map(),
    modes: new Map(),
    diagnostics: substitutionDiagnostics(root, contract),
    options: effectiveOptions,
    active: true,
  }
  bindings.set(family, state)
  BOUND_RUNTIMES.set(root as object, bindings)
  const t = runtimeTree(contract, state, schemas) as VaneRuntimeTokens<T>

  const applyTokenOverrides = (input: unknown): void => {
    if (Array.isArray(input)) {
      for (const entry of input) {
        if (!Array.isArray(entry) || entry.length !== 2)
          throw new TypeError('[vane] runtime override entries must be [mutableHandle, value] tuples')
        const address = runtimeAddressOf(entry[0])
        if (!address || address.system !== contract.system)
          throw new TypeError('[vane] runtime override handle belongs to another system or has no runtime address')
        writeOverride(contract, state, schemas, address, entry[1])
      }
      return
    }
    if (!isPlainObject(input))
      throw new TypeError('[vane] applyTokenOverrides() needs a base token tree or handle tuples')
    writeBaseTree(contract, state, schemas, input, [])
  }

  const setMode = (axis: string, mode: string): void => {
    assertActive(state)
    const definition = contract.axes[axis]
    if (!definition || !definition.modes.includes(mode))
      throw new TypeError(`[vane] runtime axis '${axis}' has no mode '${mode}'`)
    if (!definition.attribute)
      throw new TypeError(`[vane] runtime axis '${axis}' has no query-free root attribute adapter`)
    const value = definition.attribute.values[mode]
    if (value === undefined)
      throw new TypeError(`[vane] runtime axis '${axis}' cannot select mode '${mode}' on the bound root`)
    if (value === null)
      removeAttribute(state.root, definition.attribute.name)
    else
      writeAttribute(state.root, definition.attribute.name, value)
    state.modes.set(axis, mode)
  }

  const clearMode = (axis: string): void => {
    assertActive(state)
    const definition = contract.axes[axis]
    if (!definition)
      throw new TypeError(`[vane] runtime has no axis '${axis}'`)
    if (!definition.attribute)
      throw new TypeError(`[vane] runtime axis '${axis}' has no query-free root attribute adapter`)
    removeAttribute(state.root, definition.attribute.name)
    state.modes.delete(axis)
  }

  const initial = effectiveOptions.initial === undefined
    ? emptySnapshot(contract)
    : reconcileSnapshot(contract, effectiveOptions.initial, schemas, effectiveOptions)
  if ('diagnostics' in initial)
    state.diagnostics.push(...initial.diagnostics)
  const snapshot = 'snapshot' in initial ? initial.snapshot : initial
  hydrateState(contract, state, snapshot)

  return Object.freeze({
    t,
    diagnostics: Object.freeze(state.diagnostics),
    applyTokenOverrides,
    setMode,
    clearMode,
    setScheme: (mode: string) => setMode('scheme', mode),
    snapshot: () => snapshotOf(contract, state),
    inspect: () => inspectRuntime(contract, state),
  }) as unknown as VaneBoundRuntime<T, Axes>
}

function inspectRuntime(contract: VaneRuntimeContract, state: RuntimeState): VaneRuntimeInspection {
  const snapshot = snapshotOf(contract, state)
  return Object.freeze({
    system: contract.system,
    root: contract.root,
    active: state.active,
    modes: snapshot.modes,
    overrides: Object.freeze(snapshot.overrides.flatMap((override) => {
      const token = tokenByPath(contract, override.token)
      if (!token)
        return []
      const slot = slotFor(token, override.address)
      if (!slot)
        return []
      const applied = state.root.style.getPropertyValue?.(slot)
      return [Object.freeze({
        token: override.token,
        address: override.address,
        val: override.val,
        name: token.name,
        slot: slot as `--${string}`,
        tokenRoot: token.root,
        ...(applied === undefined ? {} : { applied }),
      })]
    })),
    diagnostics: Object.freeze([...state.diagnostics]),
  })
}

function runtimeTree(
  contract: VaneRuntimeContract,
  state: RuntimeState,
  schemas: RuntimeSchemaStore,
): object {
  const tree: Record<string, unknown> = {}
  for (const token of contract.tokens) {
    const axes: Record<string, Record<string, VaneHandleMeta['axes'] extends infer _ ? any : never>> = {}
    const cases: any[] = []
    for (const branch of token.branches) {
      const branchMeta = {
        ...(branch.value === undefined ? {} : { value: branch.value }),
        ...(token.mutable && branch.slot
          ? {
              runtime: runtimeMeta(contract, token, branch.address, branch.slot),
            }
          : {}),
      }
      if (branch.address.kind === 'axis') {
        axes[branch.address.axis] ??= {}
        axes[branch.address.axis]![branch.address.mode] = branchMeta
      }
      else {
        cases.push({ when: branch.address.when, ...branchMeta })
      }
    }
    const handle = createHandle({
      name: token.name,
      path: token.token.join('.'),
      mode: token.mutable ? 'live' : 'static',
      reference: token.reference,
      emit: token.emit,
      mutable: token.mutable,
      type: token.type,
      ...(token.value === undefined ? {} : { value: token.value }),
      ...(token.description === undefined ? {} : { description: token.description }),
      ...(token.deprecated === undefined ? {} : { deprecated: token.deprecated }),
      ...(token.metadata === undefined ? {} : { metadata: token.metadata }),
      ...(token.validation === undefined ? {} : { validate: token.validation }),
      ...(token.mutable && token.baseSlot
        ? {
            runtime: runtimeMeta(contract, token, { kind: 'base' }, token.baseSlot),
          }
        : {}),
      ...(Object.keys(axes).length === 0 ? {} : { axes }),
      ...(cases.length === 0 ? {} : { cases }),
    })
    decorateMutableHandle(handle, contract, state, schemas)
    for (const modes of Object.values(handle.$axes)) {
      for (const branch of Object.values(modes))
        decorateMutableBranch(branch, contract, state, schemas)
    }
    for (const branch of token.branches) {
      if (branch.address.kind === 'case')
        decorateMutableBranch(handle.$case(branch.address.when), contract, state, schemas)
    }
    putPath(tree, token.token, handle)
  }
  return deepFreeze(tree)
}

function decorateMutableHandle(
  handle: InternalTokenHandle,
  contract: VaneRuntimeContract,
  state: RuntimeState,
  schemas: RuntimeSchemaStore,
): void {
  const runtime = runtimeAddressOf(handle)
  if (!runtime)
    return
  defineAction(handle, '$set', (input: unknown) => writeOverride(contract, state, schemas, runtime, input))
  defineAction(handle, '$unset', () => removeOverride(state, runtime))
}

function decorateMutableBranch(
  handle: InternalBranchHandle,
  contract: VaneRuntimeContract,
  state: RuntimeState,
  schemas: RuntimeSchemaStore,
): void {
  const runtime = runtimeAddressOf(handle)
  if (!runtime)
    return
  defineAction(handle, '$set', (input: unknown) => writeOverride(contract, state, schemas, runtime, input))
  defineAction(handle, '$unset', () => removeOverride(state, runtime))
}

function writeOverride(
  contract: VaneRuntimeContract,
  state: RuntimeState,
  schemas: RuntimeSchemaStore,
  runtime: VaneHandleRuntimeAddress,
  input: unknown,
): void {
  assertActive(state)
  const token = tokenByPath(contract, runtime.token)
  if (!token || !token.mutable)
    throw new TypeError(`[vane] ${runtime.token.join('.')} is not a mutable token in this runtime`)
  const slot = slotFor(token, runtime.address)
  if (!slot)
    throw new TypeError(`[vane] ${formatAddress(runtime.token, runtime.address)} is not an authored runtime address`)
  const value = validateAndSerialize(token, input, schemas, state.options)
  if (value === undefined)
    return
  writeStyle(state.root.style, slot, value)
  const override: VaneRuntimeSnapshotOverride = { token: token.token, address: runtime.address, val: value }
  state.overrides.set(recordKey(token.token, runtime.address), override)
}

function removeOverride(state: RuntimeState, runtime: VaneHandleRuntimeAddress): void {
  assertActive(state)
  removeStyle(state.root.style, runtime.slot)
  state.overrides.delete(recordKey(runtime.token, runtime.address))
}

function writeBaseTree(
  contract: VaneRuntimeContract,
  state: RuntimeState,
  schemas: RuntimeSchemaStore,
  input: Readonly<Record<string, unknown>>,
  path: string[],
): void {
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined)
      continue
    const next = [...path, key]
    const token = tokenByPath(contract, next)
    if (token) {
      if (!token.mutable || !token.baseSlot)
        throw new TypeError(`[vane] ${next.join('.')} is not a mutable base token`)
      writeOverride(contract, state, schemas, runtimeMeta(contract, token, { kind: 'base' }, token.baseSlot), value)
      continue
    }
    if (!isPlainObject(value) || !contract.tokens.some(entry => startsWith(entry.token, next)))
      throw new TypeError(`[vane] ${next.join('.')} is not a token group in this runtime`)
    writeBaseTree(contract, state, schemas, value, next)
  }
}

function reconcileSnapshot(
  contract: VaneRuntimeContract,
  input: unknown,
  schemas: RuntimeSchemaStore,
  options: VaneRuntimeOptions,
): VaneRuntimeReconciliation {
  const source = parseSnapshot(input)
  const diagnostics: VaneRuntimeDiagnostic[] = []
  if (source.system !== contract.system) {
    diagnostics.push({
      code: 'VANE_RUNTIME_SCHEMA_MISMATCH',
      message: `snapshot '${source.system}' differs from current runtime '${contract.system}'; reconciling semantic addresses`,
    })
  }

  const overrides = new Map<string, VaneRuntimeSnapshotOverride>()
  for (const entry of source.overrides) {
    if (!isSnapshotOverride(entry)) {
      diagnostics.push({ code: 'VANE_RUNTIME_UNKNOWN_ADDRESS', message: 'skipped a malformed runtime override record' })
      continue
    }
    const token = tokenByPath(contract, entry.token)
    if (!token) {
      diagnostics.push({
        code: 'VANE_RUNTIME_UNKNOWN_TOKEN',
        message: `snapshot token '${entry.token.join('.')}' no longer exists`,
        token: entry.token,
        address: entry.address,
      })
      continue
    }
    if (!token.mutable) {
      diagnostics.push({
        code: 'VANE_RUNTIME_IMMUTABLE_TOKEN',
        message: `snapshot token '${entry.token.join('.')}' is no longer mutable`,
        token: entry.token,
        address: entry.address,
      })
      continue
    }
    if (!slotFor(token, entry.address)) {
      diagnostics.push({
        code: 'VANE_RUNTIME_UNKNOWN_ADDRESS',
        message: `snapshot address '${formatAddress(entry.token, entry.address)}' is no longer authored`,
        token: entry.token,
        address: entry.address,
      })
      continue
    }
    let val: string | undefined
    try {
      val = validateAndSerialize(token, snapshotInput(token.type, entry.val), schemas, { ...options, dev: options.dev ?? false })
    }
    catch (error) {
      diagnostics.push({
        code: 'VANE_RUNTIME_INVALID_VALUE',
        message: `${formatAddress(entry.token, entry.address)} was skipped: ${errorMessage(error)}`,
        token: entry.token,
        address: entry.address,
      })
      continue
    }
    if (val === undefined) {
      diagnostics.push({
        code: 'VANE_RUNTIME_INVALID_VALUE',
        message: `${formatAddress(entry.token, entry.address)} was omitted by its validation policy`,
        token: entry.token,
        address: entry.address,
      })
      continue
    }
    const normalized = { token: token.token, address: normalizeAddress(entry.address, contract.axisOrder), val }
    overrides.set(recordKey(normalized.token, normalized.address), normalized)
  }

  const modes: Record<string, string> = {}
  for (const [axis, mode] of Object.entries(source.modes)) {
    const definition = contract.axes[axis]
    if (!definition || !definition.modes.includes(mode)) {
      diagnostics.push({
        code: 'VANE_RUNTIME_UNKNOWN_MODE',
        message: `snapshot mode '${axis}.${mode}' no longer exists`,
        axis,
        mode,
      })
      continue
    }
    if (!definition.attribute || definition.attribute.values[mode] === undefined) {
      diagnostics.push({
        code: 'VANE_RUNTIME_UNSELECTABLE_AXIS',
        message: `snapshot mode '${axis}.${mode}' has no runtime root adapter`,
        axis,
        mode,
      })
      continue
    }
    modes[axis] = mode
  }

  return Object.freeze({
    snapshot: Object.freeze({
      version: VANE_RUNTIME_SNAPSHOT_VERSION,
      system: contract.system,
      overrides: Object.freeze(sortOverrides([...overrides.values()], contract.axisOrder)),
      modes: Object.freeze(sortRecord(modes, contract.axisOrder)),
    }),
    diagnostics: Object.freeze(diagnostics),
  })
}

function parseSnapshot(input: unknown): VaneRuntimeSnapshotV1 {
  if (!isPlainObject(input) || input.version !== VANE_RUNTIME_SNAPSHOT_VERSION) {
    throw new TypeError(
      `[vane] unsupported runtime snapshot protocol '${isPlainObject(input) ? String(input.version) : 'unreadable'}'; expected version ${VANE_RUNTIME_SNAPSHOT_VERSION}`,
    )
  }
  if (typeof input.system !== 'string' || !Array.isArray(input.overrides) || !isPlainObject(input.modes))
    throw new TypeError('[vane] runtime snapshot v1 is unreadable: expected system, overrides, and modes fields')
  for (const mode of Object.values(input.modes)) {
    if (typeof mode !== 'string')
      throw new TypeError('[vane] runtime snapshot v1 modes must be strings')
  }
  return input as unknown as VaneRuntimeSnapshotV1
}

function isSnapshotOverride(input: unknown): input is VaneRuntimeSnapshotOverride {
  return isPlainObject(input)
    && Array.isArray(input.token)
    && input.token.length > 0
    && input.token.every(part => typeof part === 'string' && part.length > 0)
    && isSemanticAddress(input.address)
    && typeof input.val === 'string'
    && input.val.trim().length > 0
}

function isSemanticAddress(input: unknown): input is VaneSemanticTokenAddress {
  if (!isPlainObject(input))
    return false
  if (input.kind === 'base')
    return true
  if (input.kind === 'axis')
    return typeof input.axis === 'string' && typeof input.mode === 'string'
  if (input.kind === 'case')
    return isPlainObject(input.when) && Object.values(input.when).every(value => typeof value === 'string')
  return false
}

function validateAndSerialize(
  token: VaneRuntimeTokenContract,
  input: unknown,
  schemas: RuntimeSchemaStore,
  options: VaneRuntimeOptions,
): string | undefined {
  assertUniversalInput(token.type, input)
  const policy = token.validation
  let output = input
  if (policy && shouldValidate(policy.runtime, options)) {
    const schema = schemas[policy.id]
    if (!schema)
      throw new TypeError(`validation schema '${policy.id}' is not registered on this app-plane runtime`)
    const result = schema['~standard'].validate(input)
    if (isPromiseLike(result))
      throw new TypeError(`validation schema '${policy.id}' is async; runtime setters are synchronous`)
    if ('issues' in result && result.issues !== undefined) {
      if (policy.onInvalid === 'omit')
        return undefined
      if (policy.onInvalid === 'fallback' && policy.fallback !== undefined)
        output = policy.fallback
      else
        throw new TypeError(result.issues.map(issue => issue.message).join('; ') || `validation schema '${policy.id}' rejected the value`)
    }
    else {
      output = result.value
    }
    assertUniversalInput(token.type, output)
  }
  return serializeRuntimeValue(output)
}

function assertUniversalInput(type: VaneCssDataType, input: unknown): void {
  if (isVaneValue(input) && type !== 'unknown' && input.type !== 'unknown' && !compatibleType(type, input.type))
    throw new TypeError(`expected <${type}> but received a <${input.type}> vane value`)
  if (typeof input === 'number') {
    if (!Number.isFinite(input))
      throw new TypeError('a runtime CSS number must be finite')
    if (type === 'integer' && !Number.isInteger(input))
      throw new TypeError(`expected <integer> but received ${input}`)
    if (!['unknown', 'number', 'integer', 'percentage', 'number-percentage'].includes(type))
      throw new TypeError(`a bare number is not a <${type}> runtime input`)
    return
  }
  if (typeof input === 'string') {
    if (input.trim().length === 0)
      throw new TypeError('a runtime CSS value cannot be empty')
    return
  }
  if (!isVaneValue(input) && !isHandle(input) && !isBranchHandle(input))
    throw new TypeError('runtime CSS values must be strings, finite numbers, vane values, or token handles')
}

function snapshotInput(type: VaneCssDataType, val: string): unknown {
  if ((type === 'number' || type === 'integer' || type === 'number-percentage')
    && /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?$/i.test(val.trim())) {
    return Number(val)
  }
  return val
}

function compatibleType(expected: VaneCssDataType, actual: VaneCssDataType): boolean {
  return expected === actual
    || (expected === 'number-percentage' && (actual === 'number' || actual === 'integer' || actual === 'percentage'))
    || (expected === 'length-percentage' && (actual === 'length' || actual === 'percentage'))
    || (expected === 'number' && actual === 'integer')
}

function serializeRuntimeValue(input: unknown): string {
  if (typeof input === 'number')
    return String(Object.is(input, -0) ? 0 : input)
  if (typeof input === 'string') {
    if (input.trim().length === 0)
      throw new TypeError('[vane] a runtime CSS value cannot be empty')
    return input
  }
  if (isCssValue(input))
    return input.css
  if (isHandle(input) || isBranchHandle(input) || isVaneValue(input)) {
    const serialized = String(input)
    if (serialized.trim().length === 0)
      throw new TypeError('[vane] a runtime CSS value cannot serialize to an empty string')
    return serialized
  }
  throw new TypeError('[vane] cannot serialize this runtime CSS value')
}

function shouldValidate(mode: VaneRuntimeValidationContract['runtime'], options: VaneRuntimeOptions): boolean {
  return mode === 'always' || (mode === 'dev' && (options.dev ?? inferDev()))
}

function inferDev(): boolean {
  const runtimeProcess = Reflect.get(globalThis, 'process') as { env?: { NODE_ENV?: string } } | undefined
  return runtimeProcess?.env?.NODE_ENV !== 'production'
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (typeof value === 'object' || typeof value === 'function') && value !== null && 'then' in value
}

function projectStyle(
  contract: VaneRuntimeContract,
  snapshot: VaneRuntimeSnapshotV1,
): Readonly<Record<`--${string}`, string>> {
  const style: Record<`--${string}`, string> = {}
  for (const entry of snapshot.overrides) {
    const token = tokenByPath(contract, entry.token)
    const slot = token && slotFor(token, entry.address)
    if (slot)
      style[slot as `--${string}`] = entry.val
  }
  return Object.freeze(style)
}

function projectAttributes(
  contract: VaneRuntimeContract,
  snapshot: VaneRuntimeSnapshotV1,
): Readonly<Record<string, string>> {
  const attributes: Record<string, string> = {}
  for (const [axis, mode] of Object.entries(snapshot.modes)) {
    const adapter = contract.axes[axis]?.attribute
    const value = adapter?.values[mode]
    if (adapter && value !== undefined && value !== null)
      attributes[adapter.name] = value
  }
  return Object.freeze(attributes)
}

function hydrateState(contract: VaneRuntimeContract, state: RuntimeState, snapshot: VaneRuntimeSnapshotV1): void {
  for (const entry of snapshot.overrides) {
    const token = tokenByPath(contract, entry.token)!
    const slot = slotFor(token, entry.address)!
    writeStyle(state.root.style, slot, entry.val)
    state.overrides.set(recordKey(entry.token, entry.address), entry)
  }
  for (const [axis, mode] of Object.entries(snapshot.modes)) {
    const adapter = contract.axes[axis]!.attribute!
    const value = adapter.values[mode]
    if (value === null)
      removeAttribute(state.root, adapter.name)
    else
      writeAttribute(state.root, adapter.name, value!)
    state.modes.set(axis, mode)
  }
}

function snapshotOf(contract: VaneRuntimeContract, state: RuntimeState): VaneRuntimeSnapshotV1 {
  return Object.freeze({
    version: VANE_RUNTIME_SNAPSHOT_VERSION,
    system: contract.system,
    overrides: Object.freeze(sortOverrides([...state.overrides.values()], contract.axisOrder)),
    modes: Object.freeze(sortRecord(Object.fromEntries(state.modes), contract.axisOrder)),
  })
}

function emptySnapshot(contract: VaneRuntimeContract): VaneRuntimeSnapshotV1 {
  return Object.freeze({ version: 1, system: contract.system, overrides: Object.freeze([]), modes: Object.freeze({}) })
}

function runtimeMeta(
  contract: VaneRuntimeContract,
  token: VaneRuntimeTokenContract,
  address: VaneSemanticTokenAddress,
  slot: string,
): VaneHandleRuntimeAddress {
  return deepFreeze({ system: contract.system, token: token.token, address, slot })
}

function slotFor(token: VaneRuntimeTokenContract, address: VaneSemanticTokenAddress): string | undefined {
  if (address.kind === 'base')
    return token.baseSlot
  return token.branches.find(branch => sameAddress(branch.address, address))?.slot
}

function sameAddress(left: VaneSemanticTokenAddress, right: VaneSemanticTokenAddress): boolean {
  if (left.kind !== right.kind)
    return false
  if (left.kind === 'base')
    return true
  if (left.kind === 'axis' && right.kind === 'axis')
    return left.axis === right.axis && left.mode === right.mode
  return left.kind === 'case' && right.kind === 'case'
    && stableStringify(sortRecord(left.when)) === stableStringify(sortRecord(right.when))
}

function tokenByPath(contract: VaneRuntimeContract, token: readonly string[]): VaneRuntimeTokenContract | undefined {
  const key = token.join('.')
  return contract.tokens.find(entry => entry.token.join('.') === key)
}

function recordKey(token: readonly string[], address: VaneSemanticTokenAddress): string {
  return `${token.join('.')}\0${addressKey(address)}`
}

function addressKey(address: VaneSemanticTokenAddress, axisOrder: readonly string[] = []): string {
  if (address.kind === 'base')
    return '0:base'
  if (address.kind === 'axis')
    return `1:axis:${address.axis}:${address.mode}`
  return `2:case:${Object.entries(sortRecord(address.when, axisOrder)).map(([axis, mode]) => `${axis}:${mode}`).join('|')}`
}

function normalizeAddress(address: VaneSemanticTokenAddress, axisOrder: readonly string[]): VaneSemanticTokenAddress {
  return address.kind === 'case'
    ? { kind: 'case', when: Object.freeze(sortRecord(address.when, axisOrder)) }
    : address
}

function sortOverrides(entries: VaneRuntimeSnapshotOverride[], axisOrder: readonly string[]): VaneRuntimeSnapshotOverride[] {
  return entries.sort((left, right) => {
    const token = left.token.join('.').localeCompare(right.token.join('.'))
    return token || addressKey(left.address, axisOrder).localeCompare(addressKey(right.address, axisOrder))
  })
}

function sortRecord<T>(record: Readonly<Record<string, T>>, preferred: readonly string[] = []): Record<string, T> {
  const rank = new Map(preferred.map((key, index) => [key, index]))
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => {
    const a = rank.get(left) ?? Number.MAX_SAFE_INTEGER
    const b = rank.get(right) ?? Number.MAX_SAFE_INTEGER
    return a - b || left.localeCompare(right)
  }))
}

function formatAddress(token: readonly string[], address: VaneSemanticTokenAddress): string {
  if (address.kind === 'base')
    return token.join('.')
  if (address.kind === 'axis')
    return `${token.join('.')}.$axes.${address.axis}.${address.mode}`
  return `${token.join('.')}.$case(${JSON.stringify(address.when)})`
}

function resolveRoot(root: VaneRuntimeTarget | undefined, contract: VaneRuntimeContract): VaneRuntimeTarget {
  let resolved = root
  if (!resolved) {
    const document = (globalThis as { document?: { documentElement?: unknown } }).document
    if (contract.root !== ':root')
      throw new TypeError(`[vane] ds.runtime() needs an explicit root for system selector '${contract.root}'`)
    resolved = document?.documentElement as VaneRuntimeTarget | undefined
  }
  if (!resolved || !isStyleDeclaration(resolved.style)
    || typeof resolved.setAttribute !== 'function' || typeof resolved.removeAttribute !== 'function') {
    throw new TypeError('[vane] ds.runtime() needs one concrete HTML/SVG inline-style target; selector strings are not accepted')
  }
  if (resolved.matches && !resolved.matches(contract.root))
    throw new TypeError(`[vane] runtime target does not match system root '${contract.root}'`)
  return resolved
}

function substitutionDiagnostics(root: VaneRuntimeTarget, contract: VaneRuntimeContract): VaneRuntimeDiagnostic[] {
  const diagnostics: VaneRuntimeDiagnostic[] = []
  for (const token of contract.tokens) {
    if (!token.mutable || token.root === contract.root)
      continue
    const target = root.ownerDocument?.querySelector(token.root)
    if (target !== null && target !== undefined && root.contains && !root.contains(target)) {
      diagnostics.push({
        code: 'VANE_RUNTIME_SUBSTITUTION_ROOT',
        message: `mutable token '${token.token.join('.')}' binds at '${token.root}', outside this runtime root`,
        token: token.token,
      })
    }
  }
  return diagnostics
}

function writeStyle(style: VaneRuntimeStyleDeclaration, name: string, value: string): void {
  if (style.getPropertyValue?.(name) !== value)
    style.setProperty(name, value)
}

function removeStyle(style: VaneRuntimeStyleDeclaration, name: string): void {
  if (!style.getPropertyValue || style.getPropertyValue(name) !== '')
    style.removeProperty(name)
}

function writeAttribute(target: VaneRuntimeTarget, name: string, value: string): void {
  if (target.getAttribute?.(name) !== value)
    target.setAttribute(name, value)
}

function removeAttribute(target: VaneRuntimeTarget, name: string): void {
  if (!target.getAttribute || target.getAttribute(name) !== null)
    target.removeAttribute(name)
}

function assertActive(state: RuntimeState): void {
  if (!state.active) {
    throw new TypeError(
      '[vane] this runtime binding was superseded on the same root; use the current ds.runtime() instance after HMR/rebind',
    )
  }
}

function styleOf(target: VaneCustomPropertyTarget): VaneRuntimeStyleDeclaration {
  if (isStyleDeclaration(target))
    return target
  if ((typeof target === 'object' || typeof target === 'function') && target !== null
    && 'style' in target && isStyleDeclaration(target.style)) {
    return target.style
  }
  throw new TypeError('[vane] custom-property writes need an explicit element or CSSStyleDeclaration-like target')
}

function isStyleDeclaration(value: unknown): value is VaneRuntimeStyleDeclaration {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
    && typeof (value as VaneRuntimeStyleDeclaration).setProperty === 'function'
    && typeof (value as VaneRuntimeStyleDeclaration).removeProperty === 'function'
}

function customPropertyName(property: VaneCustomPropertyReference): `--${string}` {
  const name = typeof property === 'string' ? property : '$name' in property ? property.$name : property.name
  if (!/^--(?:[-_a-z\u0080-\uFFFF]|\\.)[-\w\u0080-\uFFFF\\.]*$/i.test(name))
    throw new TypeError(`[vane] '${name}' is not a valid CSS custom-property name`)
  return name
}

function mergeSchemas(
  embedded: RuntimeSchemaStore,
  supplied: Readonly<Record<string, VaneStandardSchemaV1>> | undefined,
): RuntimeSchemaStore {
  return supplied === undefined ? embedded : { ...embedded, ...supplied }
}

function putPath(tree: Record<string, unknown>, path: readonly string[], value: unknown): void {
  let target = tree
  for (let index = 0; index < path.length; index++) {
    const key = path[index]!
    if (index === path.length - 1) {
      target[key] = value
    }
    else {
      if (!isPlainObject(target[key]))
        target[key] = {}
      target = target[key] as Record<string, unknown>
    }
  }
}

function defineAction(target: object, name: string, value: (...args: any[]) => unknown): void {
  Object.defineProperty(target, name, { enumerable: true, configurable: true, value })
}

function startsWith(path: readonly string[], prefix: readonly string[]): boolean {
  return prefix.length < path.length && prefix.every((part, index) => path[index] === part)
}

function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null)
    return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map(stableStringify).join(',')}]`
  if (isPlainObject(value))
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

function fnv1a(value: string): string {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function deepFreeze<T>(value: T): T {
  if ((Array.isArray(value) || isPlainObject(value)) && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value as object))
      deepFreeze(child)
  }
  return value
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
