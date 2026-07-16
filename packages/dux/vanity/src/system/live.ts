/** Browser-safe runtime binding over pre-emitted mutable custom-property slots. */

import type {
  VanityRuntimeBranchHandle as InternalBranchHandle,
  VanityRuntimeHandle as InternalTokenHandle,
  VanityHandleMeta,
  VanityHandleRuntimeAddress,
  VanitySemanticTokenAddress,
} from '../internal/handle'
import type {
  VanityStandardSchemaV1,
  VanityTokenBranchHandle,
  VanityTokenFallback,
  VanityTokenHandle,
  VanityTokenHandleAny,
} from '../tokens/types'
import type { VanityCssDataType } from '../values/types'
import type { VanityAxisDefinitions, VanityAxisModeName } from './axes'
import {
  createHandle,
  isBranchHandle,
  isHandle,
  runtimeAddressOf,
} from '../internal/handle'
import { isCssValue, isVanityValue } from '../values/types'

export const VANITY_RUNTIME_SNAPSHOT_VERSION = 1 as const
export const VANITY_RUNTIME_CONTRACT_PROTOCOL = 1 as const

export type VanityRuntimeInput<Type extends VanityCssDataType = VanityCssDataType>
  = VanityTokenFallback<Type>

export interface VanityRuntimeStyleDeclaration {
  readonly setProperty: (name: string, value: string, priority?: string) => void
  readonly removeProperty: (name: string) => string
  readonly getPropertyValue?: (name: string) => string
}

/** Structural by design: HTML/SVG elements and test/framework adapters qualify. */
export interface VanityRuntimeTarget {
  readonly style: VanityRuntimeStyleDeclaration
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

export type VanityCustomPropertyReference
  = `--${string}`
    | { readonly $name: `--${string}` }
    | { readonly name: `--${string}` }

export type VanityCustomPropertyTarget
  = VanityRuntimeStyleDeclaration
    | { readonly style: VanityRuntimeStyleDeclaration }

export type VanityCustomPropertyEntries
  = Readonly<Record<`--${string}`, VanityRuntimeInput>>
    | readonly (readonly [VanityCustomPropertyReference, VanityRuntimeInput])[]

export interface VanityRuntimeValidationContract {
  readonly id: string
  readonly runtime: false | 'dev' | 'always'
  readonly onInvalid: 'throw' | 'fallback' | 'omit'
  readonly fallback?: string
}

export interface VanityRuntimeBranchContract {
  readonly address: Exclude<VanitySemanticTokenAddress, { readonly kind: 'base' }>
  readonly slot?: string
  readonly value?: string | number
}

export interface VanityRuntimeTokenContract {
  readonly token: readonly string[]
  readonly name: `--${string}`
  readonly root: string
  readonly type: VanityCssDataType
  readonly reference: 'val' | 'var'
  readonly emit: boolean
  readonly mutable: boolean
  readonly value?: string | number
  readonly description?: string
  readonly deprecated?: string
  readonly metadata?: VanityHandleMeta['metadata']
  readonly validation?: VanityRuntimeValidationContract
  readonly baseSlot?: string
  readonly branches: readonly VanityRuntimeBranchContract[]
}

export interface VanityRuntimeAxisContract {
  readonly defaultMode?: string
  readonly modes: readonly string[]
  readonly attribute?: {
    readonly name: string
    /** null selects a triggerless default by removing the shared attribute. */
    readonly values: Readonly<Record<string, string | null>>
  }
}

export interface VanityRuntimeContract {
  readonly protocol: typeof VANITY_RUNTIME_CONTRACT_PROTOCOL
  readonly system: string
  readonly prefix: string
  readonly root: string
  readonly axisOrder: readonly string[]
  readonly axes: Readonly<Record<string, VanityRuntimeAxisContract>>
  readonly tokens: readonly VanityRuntimeTokenContract[]
}

export type VanityRuntimeContractDraft = Omit<VanityRuntimeContract, 'system'>

export interface VanityRuntimeSnapshotOverride {
  readonly token: readonly string[]
  readonly address: VanitySemanticTokenAddress
  readonly val: string
}

export interface VanityRuntimeSnapshotV1 {
  readonly version: typeof VANITY_RUNTIME_SNAPSHOT_VERSION
  readonly system: string
  readonly overrides: readonly VanityRuntimeSnapshotOverride[]
  readonly modes: Readonly<Record<string, string>>
}

export type VanityRuntimeDiagnosticCode
  = | 'VANITY_RUNTIME_SCHEMA_MISMATCH'
    | 'VANITY_RUNTIME_UNKNOWN_TOKEN'
    | 'VANITY_RUNTIME_UNKNOWN_ADDRESS'
    | 'VANITY_RUNTIME_IMMUTABLE_TOKEN'
    | 'VANITY_RUNTIME_INVALID_VALUE'
    | 'VANITY_RUNTIME_UNKNOWN_MODE'
    | 'VANITY_RUNTIME_UNSELECTABLE_AXIS'
    | 'VANITY_RUNTIME_SUBSTITUTION_ROOT'

export interface VanityRuntimeDiagnostic {
  readonly code: VanityRuntimeDiagnosticCode
  readonly message: string
  readonly token?: readonly string[]
  readonly address?: VanitySemanticTokenAddress
  readonly axis?: string
  readonly mode?: string
}

export interface VanityRuntimeReconciliation {
  readonly snapshot: VanityRuntimeSnapshotV1
  readonly diagnostics: readonly VanityRuntimeDiagnostic[]
}

export interface VanityRuntimeRootProps {
  readonly style: Readonly<Record<`--${string}`, string>>
  readonly attributes: Readonly<Record<string, string>>
}

export interface VanityRuntimeInspection {
  readonly system: string
  readonly root: string
  readonly active: boolean
  readonly modes: Readonly<Record<string, string>>
  readonly overrides: readonly {
    readonly token: readonly string[]
    readonly address: VanitySemanticTokenAddress
    readonly val: string
    readonly name: `--${string}`
    readonly slot: `--${string}`
    readonly tokenRoot: string
    readonly applied?: string
  }[]
  readonly diagnostics: readonly VanityRuntimeDiagnostic[]
}

export interface VanityRuntimeOptions {
  readonly initial?: unknown
  /** App-plane Standard Schema implementations keyed by token.validate.id. */
  readonly validators?: Readonly<Record<string, VanityStandardSchemaV1>>
  /** Explicit dev signal for `runtime: 'dev'`; inferred when omitted. */
  readonly dev?: boolean
}

export interface VanityRuntimeMutableActions<Type extends VanityCssDataType = VanityCssDataType> {
  readonly $set: (input: VanityRuntimeInput<Type>) => void
  readonly $unset: () => void
}

type RuntimeBranch<Branch, Mutable extends boolean, Type extends VanityCssDataType>
  = Branch & (Mutable extends true ? VanityRuntimeMutableActions<Type> : object)

type RuntimeAxes<Axes, Mutable extends boolean, Type extends VanityCssDataType> = {
  readonly [Axis in keyof Axes]: {
    readonly [Mode in keyof Axes[Axis]]: RuntimeBranch<Axes[Axis][Mode], Mutable, Type>
  }
}

type RuntimeToken<Handle> = Handle extends VanityTokenHandle<
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
    & (Mutable extends true ? VanityRuntimeMutableActions<Type> : object)
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

export type VanityRuntimeTokens<T> = {
  readonly [Key in keyof T]: T[Key] extends VanityTokenHandleAny
    ? RuntimeToken<T[Key]>
    : T[Key] extends object ? VanityRuntimeTokens<T[Key]> : T[Key]
}

export type VanityRuntimeBaseOverrides<T> = {
  readonly [Key in keyof T]?: T[Key] extends VanityTokenHandleAny
    ? T[Key]['$mutable'] extends true ? VanityRuntimeInput<T[Key]['$type']> : never
    : T[Key] extends object ? VanityRuntimeBaseOverrides<T[Key]> : never
}

export type VanityMutableRuntimeAddressHandle
  = VanityTokenHandle<any, string, string, any, any, any, true, any, any, any>
    | VanityTokenBranchHandle<any, true>

export type VanityMutableRuntimeHandleEntry = readonly [
  VanityMutableRuntimeAddressHandle,
  VanityRuntimeInput,
]

export type VanityRuntimeMode<Axes extends VanityAxisDefinitions, Axis extends keyof Axes>
  = VanityAxisModeName<Axes[Axis]>

interface VanityBoundRuntimeCore<T, Axes extends VanityAxisDefinitions> {
  readonly t: VanityRuntimeTokens<T>
  readonly diagnostics: readonly VanityRuntimeDiagnostic[]
  readonly applyTokenOverrides: {
    (overrides: VanityRuntimeBaseOverrides<T>): void
    (entries: readonly VanityMutableRuntimeHandleEntry[]): void
  }
  readonly setMode: <Axis extends keyof Axes & string>(
    axis: Axis,
    mode: VanityRuntimeMode<Axes, Axis>,
  ) => void
  readonly clearMode: (axis: keyof Axes & string) => void
  readonly snapshot: () => VanityRuntimeSnapshotV1
  /** Inspect semantic overrides together with the concrete slots they write. */
  readonly inspect: () => VanityRuntimeInspection
}

export type VanityBoundRuntime<T, Axes extends VanityAxisDefinitions = VanityAxisDefinitions>
  = VanityBoundRuntimeCore<T, Axes>
    & (Axes extends { readonly scheme: infer Scheme }
      ? { readonly setScheme: (mode: VanityAxisModeName<Scheme>) => void }
      : object)

export type VanityRuntimeFactory<T, Axes extends VanityAxisDefinitions = VanityAxisDefinitions> = (
  root?: VanityRuntimeTarget,
  options?: VanityRuntimeOptions,
) => VanityBoundRuntime<T, Axes>

export interface VanityRuntimeServices<T, Axes extends VanityAxisDefinitions = VanityAxisDefinitions> {
  readonly runtime: VanityRuntimeFactory<T, Axes>
  readonly reconcileRuntimeSnapshot: (snapshot: unknown, options?: VanityRuntimeOptions) => VanityRuntimeReconciliation
  readonly runtimeStyle: (snapshot: unknown, options?: VanityRuntimeOptions) => Readonly<Record<`--${string}`, string>>
  readonly runtimeProps: (snapshot: unknown, options?: VanityRuntimeOptions) => VanityRuntimeRootProps
}

interface RuntimeSchemaStore {
  readonly [id: string]: VanityStandardSchemaV1 | undefined
}

interface RuntimeState {
  root: VanityRuntimeTarget
  readonly contract: VanityRuntimeContract
  readonly overrides: Map<string, VanityRuntimeSnapshotOverride>
  readonly modes: Map<string, string>
  readonly diagnostics: VanityRuntimeDiagnostic[]
  readonly options: VanityRuntimeOptions
  active: boolean
}

const BOUND_RUNTIMES = new WeakMap<object, Map<string, RuntimeState>>()

/** Finalize a JSON-safe draft with a deterministic semantic schema ID. */
export function sealRuntimeContract(draft: VanityRuntimeContractDraft): VanityRuntimeContract {
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
    system: `vanity-runtime-1-${fnv1a(semantic)}`,
  })
}

/** Direct CSS lane: public token properties are intentionally accepted too. */
export function setCustomProperty(
  target: VanityCustomPropertyTarget,
  property: VanityCustomPropertyReference,
  val: VanityRuntimeInput,
): void {
  styleOf(target).setProperty(customPropertyName(property), serializeRuntimeValue(val))
}

export function setCustomProperties(
  target: VanityCustomPropertyTarget,
  entries: VanityCustomPropertyEntries,
): void {
  if (Array.isArray(entries)) {
    for (const [property, val] of entries)
      setCustomProperty(target, property, val)
    return
  }
  for (const [property, val] of Object.entries(entries))
    setCustomProperty(target, property as `--${string}`, val)
}

export function createRuntimeServices<T, Axes extends VanityAxisDefinitions = VanityAxisDefinitions>(
  contract: VanityRuntimeContract,
  embeddedSchemas: RuntimeSchemaStore = {},
): VanityRuntimeServices<T, Axes> {
  const reconcile = (snapshot: unknown, options: VanityRuntimeOptions = {}) =>
    reconcileSnapshot(contract, snapshot, mergeSchemas(embeddedSchemas, options.validators), options)
  const runtimeStyle = (snapshot: unknown, options: VanityRuntimeOptions = {}) => {
    const result = reconcile(snapshot, options)
    return projectStyle(contract, result.snapshot)
  }
  const runtimeProps = (snapshot: unknown, options: VanityRuntimeOptions = {}) => {
    const result = reconcile(snapshot, options)
    return Object.freeze({
      style: projectStyle(contract, result.snapshot),
      attributes: projectAttributes(contract, result.snapshot),
    })
  }
  return {
    runtime: ((root?: VanityRuntimeTarget, options: VanityRuntimeOptions = {}) =>
      bindRuntime<T, Axes>(contract, root, options, mergeSchemas(embeddedSchemas, options.validators))) as VanityRuntimeFactory<T, Axes>,
    reconcileRuntimeSnapshot: reconcile,
    runtimeStyle,
    runtimeProps,
  }
}

/** Generated app-plane restoration targets. */
export function restoreRuntimeFactory<T, Axes extends VanityAxisDefinitions = VanityAxisDefinitions>(
  contract: VanityRuntimeContract,
): VanityRuntimeFactory<T, Axes> {
  return createRuntimeServices<T, Axes>(contract).runtime
}

export function restoreRuntimeReconciler(contract: VanityRuntimeContract): VanityRuntimeServices<unknown>['reconcileRuntimeSnapshot'] {
  return createRuntimeServices(contract).reconcileRuntimeSnapshot
}

export function restoreRuntimeStyle(contract: VanityRuntimeContract): VanityRuntimeServices<unknown>['runtimeStyle'] {
  return createRuntimeServices(contract).runtimeStyle
}

export function restoreRuntimeProps(contract: VanityRuntimeContract): VanityRuntimeServices<unknown>['runtimeProps'] {
  return createRuntimeServices(contract).runtimeProps
}

function bindRuntime<T, Axes extends VanityAxisDefinitions>(
  contract: VanityRuntimeContract,
  authoredRoot: VanityRuntimeTarget | undefined,
  options: VanityRuntimeOptions,
  schemas: RuntimeSchemaStore,
): VanityBoundRuntime<T, Axes> {
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
  const t = runtimeTree(contract, state, schemas) as VanityRuntimeTokens<T>

  const applyTokenOverrides = (input: unknown): void => {
    if (Array.isArray(input)) {
      for (const entry of input) {
        if (!Array.isArray(entry) || entry.length !== 2)
          throw new TypeError('[vanity] runtime override entries must be [mutableHandle, value] tuples')
        const address = runtimeAddressOf(entry[0])
        if (!address || address.system !== contract.system)
          throw new TypeError('[vanity] runtime override handle belongs to another system or has no runtime address')
        writeOverride(contract, state, schemas, address, entry[1])
      }
      return
    }
    if (!isPlainObject(input))
      throw new TypeError('[vanity] applyTokenOverrides() needs a base token tree or handle tuples')
    writeBaseTree(contract, state, schemas, input, [])
  }

  const setMode = (axis: string, mode: string): void => {
    assertActive(state)
    const definition = contract.axes[axis]
    if (!definition || !definition.modes.includes(mode))
      throw new TypeError(`[vanity] runtime axis '${axis}' has no mode '${mode}'`)
    if (!definition.attribute)
      throw new TypeError(`[vanity] runtime axis '${axis}' has no query-free root attribute adapter`)
    const value = definition.attribute.values[mode]
    if (value === undefined)
      throw new TypeError(`[vanity] runtime axis '${axis}' cannot select mode '${mode}' on the bound root`)
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
      throw new TypeError(`[vanity] runtime has no axis '${axis}'`)
    if (!definition.attribute)
      throw new TypeError(`[vanity] runtime axis '${axis}' has no query-free root attribute adapter`)
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
  }) as unknown as VanityBoundRuntime<T, Axes>
}

function inspectRuntime(contract: VanityRuntimeContract, state: RuntimeState): VanityRuntimeInspection {
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
  contract: VanityRuntimeContract,
  state: RuntimeState,
  schemas: RuntimeSchemaStore,
): object {
  const tree: Record<string, unknown> = {}
  for (const token of contract.tokens) {
    const axes: Record<string, Record<string, VanityHandleMeta['axes'] extends infer _ ? any : never>> = {}
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
  contract: VanityRuntimeContract,
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
  contract: VanityRuntimeContract,
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
  contract: VanityRuntimeContract,
  state: RuntimeState,
  schemas: RuntimeSchemaStore,
  runtime: VanityHandleRuntimeAddress,
  input: unknown,
): void {
  assertActive(state)
  const token = tokenByPath(contract, runtime.token)
  if (!token || !token.mutable)
    throw new TypeError(`[vanity] ${runtime.token.join('.')} is not a mutable token in this runtime`)
  const slot = slotFor(token, runtime.address)
  if (!slot)
    throw new TypeError(`[vanity] ${formatAddress(runtime.token, runtime.address)} is not an authored runtime address`)
  const value = validateAndSerialize(token, input, schemas, state.options)
  if (value === undefined)
    return
  writeStyle(state.root.style, slot, value)
  const override: VanityRuntimeSnapshotOverride = { token: token.token, address: runtime.address, val: value }
  state.overrides.set(recordKey(token.token, runtime.address), override)
}

function removeOverride(state: RuntimeState, runtime: VanityHandleRuntimeAddress): void {
  assertActive(state)
  removeStyle(state.root.style, runtime.slot)
  state.overrides.delete(recordKey(runtime.token, runtime.address))
}

function writeBaseTree(
  contract: VanityRuntimeContract,
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
        throw new TypeError(`[vanity] ${next.join('.')} is not a mutable base token`)
      writeOverride(contract, state, schemas, runtimeMeta(contract, token, { kind: 'base' }, token.baseSlot), value)
      continue
    }
    if (!isPlainObject(value) || !contract.tokens.some(entry => startsWith(entry.token, next)))
      throw new TypeError(`[vanity] ${next.join('.')} is not a token group in this runtime`)
    writeBaseTree(contract, state, schemas, value, next)
  }
}

function reconcileSnapshot(
  contract: VanityRuntimeContract,
  input: unknown,
  schemas: RuntimeSchemaStore,
  options: VanityRuntimeOptions,
): VanityRuntimeReconciliation {
  const source = parseSnapshot(input)
  const diagnostics: VanityRuntimeDiagnostic[] = []
  if (source.system !== contract.system) {
    diagnostics.push({
      code: 'VANITY_RUNTIME_SCHEMA_MISMATCH',
      message: `snapshot '${source.system}' differs from current runtime '${contract.system}'; reconciling semantic addresses`,
    })
  }

  const overrides = new Map<string, VanityRuntimeSnapshotOverride>()
  for (const entry of source.overrides) {
    if (!isSnapshotOverride(entry)) {
      diagnostics.push({ code: 'VANITY_RUNTIME_UNKNOWN_ADDRESS', message: 'skipped a malformed runtime override record' })
      continue
    }
    const token = tokenByPath(contract, entry.token)
    if (!token) {
      diagnostics.push({
        code: 'VANITY_RUNTIME_UNKNOWN_TOKEN',
        message: `snapshot token '${entry.token.join('.')}' no longer exists`,
        token: entry.token,
        address: entry.address,
      })
      continue
    }
    if (!token.mutable) {
      diagnostics.push({
        code: 'VANITY_RUNTIME_IMMUTABLE_TOKEN',
        message: `snapshot token '${entry.token.join('.')}' is no longer mutable`,
        token: entry.token,
        address: entry.address,
      })
      continue
    }
    if (!slotFor(token, entry.address)) {
      diagnostics.push({
        code: 'VANITY_RUNTIME_UNKNOWN_ADDRESS',
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
        code: 'VANITY_RUNTIME_INVALID_VALUE',
        message: `${formatAddress(entry.token, entry.address)} was skipped: ${errorMessage(error)}`,
        token: entry.token,
        address: entry.address,
      })
      continue
    }
    if (val === undefined) {
      diagnostics.push({
        code: 'VANITY_RUNTIME_INVALID_VALUE',
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
        code: 'VANITY_RUNTIME_UNKNOWN_MODE',
        message: `snapshot mode '${axis}.${mode}' no longer exists`,
        axis,
        mode,
      })
      continue
    }
    if (!definition.attribute || definition.attribute.values[mode] === undefined) {
      diagnostics.push({
        code: 'VANITY_RUNTIME_UNSELECTABLE_AXIS',
        message: `snapshot mode '${axis}.${mode}' has no runtime root attribute mapping`,
        axis,
        mode,
      })
      continue
    }
    modes[axis] = mode
  }

  return Object.freeze({
    snapshot: Object.freeze({
      version: VANITY_RUNTIME_SNAPSHOT_VERSION,
      system: contract.system,
      overrides: Object.freeze(sortOverrides([...overrides.values()], contract.axisOrder)),
      modes: Object.freeze(sortRecord(modes, contract.axisOrder)),
    }),
    diagnostics: Object.freeze(diagnostics),
  })
}

function parseSnapshot(input: unknown): VanityRuntimeSnapshotV1 {
  if (!isPlainObject(input) || input.version !== VANITY_RUNTIME_SNAPSHOT_VERSION) {
    throw new TypeError(
      `[vanity] unsupported runtime snapshot protocol '${isPlainObject(input) ? String(input.version) : 'unreadable'}'; expected version ${VANITY_RUNTIME_SNAPSHOT_VERSION}`,
    )
  }
  if (typeof input.system !== 'string' || !Array.isArray(input.overrides) || !isPlainObject(input.modes))
    throw new TypeError('[vanity] runtime snapshot v1 is unreadable: expected system, overrides, and modes fields')
  for (const mode of Object.values(input.modes)) {
    if (typeof mode !== 'string')
      throw new TypeError('[vanity] runtime snapshot v1 modes must be strings')
  }
  return input as unknown as VanityRuntimeSnapshotV1
}

function isSnapshotOverride(input: unknown): input is VanityRuntimeSnapshotOverride {
  return isPlainObject(input)
    && Array.isArray(input.token)
    && input.token.length > 0
    && input.token.every(part => typeof part === 'string' && part.length > 0)
    && isSemanticAddress(input.address)
    && typeof input.val === 'string'
    && input.val.trim().length > 0
}

function isSemanticAddress(input: unknown): input is VanitySemanticTokenAddress {
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
  token: VanityRuntimeTokenContract,
  input: unknown,
  schemas: RuntimeSchemaStore,
  options: VanityRuntimeOptions,
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

function assertUniversalInput(type: VanityCssDataType, input: unknown): void {
  if (isVanityValue(input) && type !== 'unknown' && input.type !== 'unknown' && !compatibleType(type, input.type))
    throw new TypeError(`expected <${type}> but received a <${input.type}> vanity value`)
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
  if (!isVanityValue(input) && !isHandle(input) && !isBranchHandle(input))
    throw new TypeError('runtime CSS values must be strings, finite numbers, vanity values, or token handles')
}

function snapshotInput(type: VanityCssDataType, val: string): unknown {
  if ((type === 'number' || type === 'integer' || type === 'number-percentage')
    && /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?$/i.test(val.trim())) {
    return Number(val)
  }
  return val
}

function compatibleType(expected: VanityCssDataType, actual: VanityCssDataType): boolean {
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
      throw new TypeError('[vanity] a runtime CSS value cannot be empty')
    return input
  }
  if (isCssValue(input))
    return input.css
  if (isHandle(input) || isBranchHandle(input) || isVanityValue(input)) {
    const serialized = String(input)
    if (serialized.trim().length === 0)
      throw new TypeError('[vanity] a runtime CSS value cannot serialize to an empty string')
    return serialized
  }
  throw new TypeError('[vanity] cannot serialize this runtime CSS value')
}

function shouldValidate(mode: VanityRuntimeValidationContract['runtime'], options: VanityRuntimeOptions): boolean {
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
  contract: VanityRuntimeContract,
  snapshot: VanityRuntimeSnapshotV1,
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
  contract: VanityRuntimeContract,
  snapshot: VanityRuntimeSnapshotV1,
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

function hydrateState(contract: VanityRuntimeContract, state: RuntimeState, snapshot: VanityRuntimeSnapshotV1): void {
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

function snapshotOf(contract: VanityRuntimeContract, state: RuntimeState): VanityRuntimeSnapshotV1 {
  return Object.freeze({
    version: VANITY_RUNTIME_SNAPSHOT_VERSION,
    system: contract.system,
    overrides: Object.freeze(sortOverrides([...state.overrides.values()], contract.axisOrder)),
    modes: Object.freeze(sortRecord(Object.fromEntries(state.modes), contract.axisOrder)),
  })
}

function emptySnapshot(contract: VanityRuntimeContract): VanityRuntimeSnapshotV1 {
  return Object.freeze({ version: 1, system: contract.system, overrides: Object.freeze([]), modes: Object.freeze({}) })
}

function runtimeMeta(
  contract: VanityRuntimeContract,
  token: VanityRuntimeTokenContract,
  address: VanitySemanticTokenAddress,
  slot: string,
): VanityHandleRuntimeAddress {
  return deepFreeze({ system: contract.system, token: token.token, address, slot })
}

function slotFor(token: VanityRuntimeTokenContract, address: VanitySemanticTokenAddress): string | undefined {
  if (address.kind === 'base')
    return token.baseSlot
  return token.branches.find(branch => sameAddress(branch.address, address))?.slot
}

function sameAddress(left: VanitySemanticTokenAddress, right: VanitySemanticTokenAddress): boolean {
  if (left.kind !== right.kind)
    return false
  if (left.kind === 'base')
    return true
  if (left.kind === 'axis' && right.kind === 'axis')
    return left.axis === right.axis && left.mode === right.mode
  return left.kind === 'case' && right.kind === 'case'
    && stableStringify(sortRecord(left.when)) === stableStringify(sortRecord(right.when))
}

function tokenByPath(contract: VanityRuntimeContract, token: readonly string[]): VanityRuntimeTokenContract | undefined {
  const key = token.join('.')
  return contract.tokens.find(entry => entry.token.join('.') === key)
}

function recordKey(token: readonly string[], address: VanitySemanticTokenAddress): string {
  return `${token.join('.')}\0${addressKey(address)}`
}

function addressKey(address: VanitySemanticTokenAddress, axisOrder: readonly string[] = []): string {
  if (address.kind === 'base')
    return '0:base'
  if (address.kind === 'axis')
    return `1:axis:${address.axis}:${address.mode}`
  return `2:case:${Object.entries(sortRecord(address.when, axisOrder)).map(([axis, mode]) => `${axis}:${mode}`).join('|')}`
}

function normalizeAddress(address: VanitySemanticTokenAddress, axisOrder: readonly string[]): VanitySemanticTokenAddress {
  return address.kind === 'case'
    ? { kind: 'case', when: Object.freeze(sortRecord(address.when, axisOrder)) }
    : address
}

function sortOverrides(entries: VanityRuntimeSnapshotOverride[], axisOrder: readonly string[]): VanityRuntimeSnapshotOverride[] {
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

function formatAddress(token: readonly string[], address: VanitySemanticTokenAddress): string {
  if (address.kind === 'base')
    return token.join('.')
  if (address.kind === 'axis')
    return `${token.join('.')}.$axes.${address.axis}.${address.mode}`
  return `${token.join('.')}.$case(${JSON.stringify(address.when)})`
}

function resolveRoot(root: VanityRuntimeTarget | undefined, contract: VanityRuntimeContract): VanityRuntimeTarget {
  let resolved = root
  if (!resolved) {
    const document = (globalThis as { document?: { documentElement?: unknown } }).document
    if (contract.root !== ':root')
      throw new TypeError(`[vanity] ds.runtime() needs an explicit root for system selector '${contract.root}'`)
    resolved = document?.documentElement as VanityRuntimeTarget | undefined
  }
  if (!resolved || !isStyleDeclaration(resolved.style)
    || typeof resolved.setAttribute !== 'function' || typeof resolved.removeAttribute !== 'function') {
    throw new TypeError('[vanity] ds.runtime() needs one concrete HTML/SVG inline-style target; selector strings are not accepted')
  }
  if (resolved.matches && !resolved.matches(contract.root))
    throw new TypeError(`[vanity] runtime target does not match system root '${contract.root}'`)
  return resolved
}

function substitutionDiagnostics(root: VanityRuntimeTarget, contract: VanityRuntimeContract): VanityRuntimeDiagnostic[] {
  const diagnostics: VanityRuntimeDiagnostic[] = []
  for (const token of contract.tokens) {
    if (!token.mutable || token.root === contract.root)
      continue
    const target = root.ownerDocument?.querySelector(token.root)
    if (target !== null && target !== undefined && root.contains && !root.contains(target)) {
      diagnostics.push({
        code: 'VANITY_RUNTIME_SUBSTITUTION_ROOT',
        message: `mutable token '${token.token.join('.')}' binds at '${token.root}', outside this runtime root`,
        token: token.token,
      })
    }
  }
  return diagnostics
}

function writeStyle(style: VanityRuntimeStyleDeclaration, name: string, value: string): void {
  if (style.getPropertyValue?.(name) !== value)
    style.setProperty(name, value)
}

function removeStyle(style: VanityRuntimeStyleDeclaration, name: string): void {
  if (!style.getPropertyValue || style.getPropertyValue(name) !== '')
    style.removeProperty(name)
}

function writeAttribute(target: VanityRuntimeTarget, name: string, value: string): void {
  if (target.getAttribute?.(name) !== value)
    target.setAttribute(name, value)
}

function removeAttribute(target: VanityRuntimeTarget, name: string): void {
  if (!target.getAttribute || target.getAttribute(name) !== null)
    target.removeAttribute(name)
}

function assertActive(state: RuntimeState): void {
  if (!state.active) {
    throw new TypeError(
      '[vanity] this runtime binding was superseded on the same root; use the current ds.runtime() instance after HMR/rebind',
    )
  }
}

function styleOf(target: VanityCustomPropertyTarget): VanityRuntimeStyleDeclaration {
  if (isStyleDeclaration(target))
    return target
  if ((typeof target === 'object' || typeof target === 'function') && target !== null
    && 'style' in target && isStyleDeclaration(target.style)) {
    return target.style
  }
  throw new TypeError('[vanity] custom-property writes need an explicit element or CSSStyleDeclaration-like target')
}

function isStyleDeclaration(value: unknown): value is VanityRuntimeStyleDeclaration {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
    && typeof (value as VanityRuntimeStyleDeclaration).setProperty === 'function'
    && typeof (value as VanityRuntimeStyleDeclaration).removeProperty === 'function'
}

function customPropertyName(property: VanityCustomPropertyReference): `--${string}` {
  const name = typeof property === 'string' ? property : '$name' in property ? property.$name : property.name
  if (!/^--(?:[-_a-z\u0080-\uFFFF]|\\.)[-\w\u0080-\uFFFF\\.]*$/i.test(name))
    throw new TypeError(`[vanity] '${name}' is not a valid CSS custom-property name`)
  return name
}

function mergeSchemas(
  embedded: RuntimeSchemaStore,
  supplied: Readonly<Record<string, VanityStandardSchemaV1>> | undefined,
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
