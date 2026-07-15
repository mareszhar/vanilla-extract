/** Canonical authoring environment: an engine defines one or more systems. */

import type { VaneCssFunction, VanePropertyAliasCssFunction, VanePropertyAliasMap, VaneStrictPropertyAliasCssFunction } from '../css/types'
import type { VaneEngineKernel } from '../internal/engineKernel'
import type { VaneDtcgCodec } from '../internal/interchange'
import type { VanePropertyAliasContribution, VanePropertyAliasPlugin } from '../plugins/propertyAliases'
import type {
  VaneAxisAuthoringHelpers,
  VaneAxisDefinitions,
  VaneAxisName,
  VaneAxisOrderRestGuard,
  VaneAxisRegistry,
} from '../system/axes'
import type { VaneConditionInput } from '../system/conditions'
import type {
  VaneDefaultLayers,
  VaneEngineSystemOptions,
  VaneSystem,
  VaneSystemConditionName,
  VaneSystemTokens,
} from '../system/createSystem'
import type {
  VaneDefaultTokenPolicy,
  VaneEngineRequirement,
  VaneGraphInput,
  VaneTokenFactory,
  VaneTokenModule,
  VaneTokenModuleOptions,
  VaneTokenPolicy,
  VaneTokenReference,
} from '../tokens/types'
import type { VaneCanonicalCoreConstructors } from '../values/defaultEngine'
import type { VaneCssSupportTarget, VaneExtensionIdentity } from '../values/protocol'
import type { VaneSelfValue } from '../values/types'
import type { VaneLengthUnit } from '../values/units'
import { createEngineKernel } from '../internal/engineKernel'
import {
  axisAuthoringHelpers,
  axisSemanticPolicy,
  EMPTY_AXIS_REGISTRY,
  normalizeAxisAdditions,
  reorderAxes,
} from '../system/axes'
import { aria, container, data, media, schemeIs, supports } from '../system/conditions'
import { createSystemForEngine } from '../system/createSystem'
import { check } from '../tokens/checks'
import { createTokenFactory } from '../tokens/config'
import { defineTokenModule } from '../tokens/graph'
import { scale } from '../tokens/scale'
import { createCoreConstructors, VANE_CORE_EXTENSION_IDENTITIES } from '../values/defaultEngine'
import { defineCssOperation, defineCssValue } from '../values/extensions'
import { VANE_DEFAULT_CSS_SUPPORT } from '../values/protocol'
import {
  assertSystemNamespaceAvailable,
  VANE_BUILTIN_CONSTRUCTOR_NAMES,
  VANE_SYSTEM_MEMBERS,
  VANE_SYSTEM_SURFACE_VERSION,
} from './reservations'

export type VaneSemanticPolicy
  = | string
    | number
    | boolean
    | null
    | readonly VaneSemanticPolicy[]
    | { readonly [key: string]: VaneSemanticPolicy }

export interface VaneEngineTokenPolicy<
  Reference extends VaneTokenReference = VaneTokenReference,
  Emit extends boolean = boolean,
> {
  readonly reference?: Reference
  readonly emit?: Emit
}

export interface VaneEngineOptions<
  DefaultLengthUnit extends VaneLengthUnit = 'px',
  Reference extends VaneTokenReference = 'var',
  Emit extends boolean = true,
> {
  readonly support?: VaneCssSupportTarget
  readonly length?: { readonly unitless?: DefaultLengthUnit }
  /** Defaults applied to shorthand and omitted fields in branded token config. */
  readonly tokens?: VaneEngineTokenPolicy<Reference, Emit>
  readonly color?: Readonly<Record<string, VaneSemanticPolicy>>
  readonly validation?: Readonly<Record<string, VaneSemanticPolicy>>
  /** Extension point for project policies whose semantics affect identity. */
  readonly policies?: Readonly<Record<string, VaneSemanticPolicy>>
}

export interface VaneEnginePlugin<
  Added extends object,
  RequiredConstructors extends object = VaneCanonicalCoreConstructors<VaneLengthUnit>,
> extends VaneExtensionIdentity {
  readonly setup: (engine: VaneEngine<RequiredConstructors, VaneTokenPolicy, VaneAxisDefinitions>) => Added
  /** Optional authored-DTCG bridges for opaque values owned by this plugin. */
  readonly dtcg?: readonly VaneDtcgCodec[]
}

type VaneEngineReserved<Constructors extends object> = keyof Constructors | keyof VaneEngineMethods<Constructors, VaneTokenPolicy, VaneAxisDefinitions> | typeof VANE_SYSTEM_MEMBERS[number]
type VaneExtensionOutput<Constructors extends object, Added> = Added & {
  readonly [Key in Extract<keyof Added, VaneEngineReserved<Constructors>>]: never
}

interface VaneEngineCommonMethods<
  TokenPolicy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
  Axes extends VaneAxisDefinitions = Record<never, never>,
> {
  readonly signature: string
  readonly support: VaneCssSupportTarget
  readonly policies: Readonly<Record<string, unknown>>
  readonly extensions: readonly VaneExtensionIdentity[]
  readonly compatibleSignatures: readonly string[]
  readonly serialize: <Type extends import('../values/types').VaneCssDataType>(value: VaneSelfValue<Type>) => string
  readonly defineCssValue: typeof defineCssValue
  readonly defineCssOperation: typeof defineCssOperation
  readonly check: typeof check
  readonly scale: typeof scale
  readonly media: typeof media
  readonly container: typeof container
  readonly supports: typeof supports
  readonly data: typeof data
  readonly aria: typeof aria
  readonly schemeIs: typeof schemeIs
  readonly token: VaneTokenFactory<Axes>
  readonly defineTokens: <const T extends VaneGraphInput = Record<never, never>>(
    seed?: T,
    options?: VaneTokenModuleOptions,
  ) => VaneTokenModule<T, TokenPolicy>
  readonly compatibleWith: (other: Pick<VaneEngineMethods<object, VaneTokenPolicy, VaneAxisDefinitions>, 'signature'>) => boolean
}

export interface VaneEngineMethods<
  Constructors extends object,
  TokenPolicy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
  Axes extends VaneAxisDefinitions = Record<never, never>,
> extends VaneEngineCommonMethods<TokenPolicy, Axes> {
  readonly createSystem: <
    const T extends object,
    const C extends Record<string, VaneConditionInput> = Record<never, never>,
    const L extends readonly string[] = VaneDefaultLayers,
    P extends string = 'vane',
    B extends boolean = true,
  >(
    options: VaneEngineSystemOptions<T, C, L, P, B>,
  ) => VaneSystem<VaneSystemTokens<T, P, TokenPolicy, true>, VaneSystemConditionName<C, B>, L[number], Constructors, Axes, VaneCssFunction<VaneSystemConditionName<C, B>, L[number]>>
  readonly axes: <const Added extends VaneAxisDefinitions>(
    factory: (
      context: Omit<VaneEngine<Constructors, TokenPolicy, Axes>, keyof VaneAxisAuthoringHelpers>
        & VaneAxisAuthoringHelpers,
    ) => Added & VaneAxisContributionGuard<Axes, Added>,
  ) => VaneEngine<Constructors, TokenPolicy, Axes & Added>
  readonly axisOrder: <
    const First extends VaneAxisName<Axes>,
    const Rest extends readonly VaneAxisName<Axes>[],
  >(
    first: First,
    ...rest: Rest & VaneAxisOrderRestGuard<Axes, First, Rest>
  ) => VaneEngine<Constructors, TokenPolicy, Axes>
  readonly use: {
    <const AddedAliases extends VanePropertyAliasMap>(
      plugin: VanePropertyAliasPlugin<AddedAliases, 'both'>,
    ): VaneAliasedEngine<Constructors & VanePropertyAliasContribution<AddedAliases, 'both'>, TokenPolicy, Axes, AddedAliases>
    <const AddedAliases extends VanePropertyAliasMap>(
      plugin: VanePropertyAliasPlugin<AddedAliases, 'aliases-only'>,
    ): VaneStrictAliasedEngine<Constructors & VanePropertyAliasContribution<AddedAliases, 'aliases-only'>, TokenPolicy, Axes, AddedAliases>
    <
      const Added extends object,
      RequiredConstructors extends object,
    >(
      plugin: Constructors extends RequiredConstructors
        ? VaneEnginePlugin<Added, RequiredConstructors>
        : never,
    ): VaneEngine<Constructors & Added, TokenPolicy, Axes>
  }
  readonly extend: {
    <const Added extends object>(
      extension: (engine: VaneEngine<Constructors, TokenPolicy, Axes>) => VaneExtensionOutput<Constructors, Added>,
    ): VaneEngine<Constructors & Added, TokenPolicy, Axes>
    <const Added extends object>(
      identity: VaneExtensionIdentity,
      extension: (engine: VaneEngine<Constructors, TokenPolicy, Axes>) => VaneExtensionOutput<Constructors, Added>,
    ): VaneEngine<Constructors & Added, TokenPolicy, Axes>
  }
}

export interface VaneAliasedEngineMethods<
  Constructors extends object,
  TokenPolicy extends VaneTokenPolicy,
  Axes extends VaneAxisDefinitions,
  Aliases extends VanePropertyAliasMap,
> extends VaneEngineCommonMethods<TokenPolicy, Axes> {
  readonly createSystem: <
    const T extends object,
    const C extends Record<string, VaneConditionInput> = Record<never, never>,
    const L extends readonly string[] = VaneDefaultLayers,
    P extends string = 'vane',
    B extends boolean = true,
  >(
    options: VaneEngineSystemOptions<T, C, L, P, B>,
  ) => VaneSystem<VaneSystemTokens<T, P, TokenPolicy, true>, VaneSystemConditionName<C, B>, L[number], Constructors, Axes, VanePropertyAliasCssFunction<VaneSystemConditionName<C, B>, L[number], Aliases>>
}

export interface VaneStrictAliasedEngineMethods<
  Constructors extends object,
  TokenPolicy extends VaneTokenPolicy,
  Axes extends VaneAxisDefinitions,
  Aliases extends VanePropertyAliasMap,
> extends VaneEngineCommonMethods<TokenPolicy, Axes> {
  readonly createSystem: <
    const T extends object,
    const C extends Record<string, VaneConditionInput> = Record<never, never>,
    const L extends readonly string[] = VaneDefaultLayers,
    P extends string = 'vane',
    B extends boolean = true,
  >(
    options: VaneEngineSystemOptions<T, C, L, P, B>,
  ) => VaneSystem<VaneSystemTokens<T, P, TokenPolicy, true>, VaneSystemConditionName<C, B>, L[number], Constructors, Axes, VaneStrictPropertyAliasCssFunction<VaneSystemConditionName<C, B>, L[number], Aliases>>
}

type VaneAxisContributionGuard<Current extends VaneAxisDefinitions, Added extends VaneAxisDefinitions> = {
  readonly [Name in keyof Added]: Name extends keyof Current ? never : Added[Name]
}

export type VaneEngine<
  Constructors extends object,
  TokenPolicy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
  Axes extends VaneAxisDefinitions = Record<never, never>,
> = Readonly<Constructors> & VaneEngineMethods<Constructors, TokenPolicy, Axes>

export type VaneAliasedEngine<
  Constructors extends object,
  TokenPolicy extends VaneTokenPolicy,
  Axes extends VaneAxisDefinitions,
  Aliases extends VanePropertyAliasMap,
> = Readonly<Constructors> & VaneAliasedEngineMethods<Constructors, TokenPolicy, Axes, Aliases>

export type VaneStrictAliasedEngine<
  Constructors extends object,
  TokenPolicy extends VaneTokenPolicy,
  Axes extends VaneAxisDefinitions,
  Aliases extends VanePropertyAliasMap,
> = Readonly<Constructors> & VaneStrictAliasedEngineMethods<Constructors, TokenPolicy, Axes, Aliases>

/** Named zero-config/configured engine surface, kept compact in consumer declarations. */
export interface VaneCoreEngine<
  DefaultLengthUnit extends VaneLengthUnit = 'px',
  TokenPolicy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
  Axes extends VaneAxisDefinitions = Record<never, never>,
> extends VaneCanonicalCoreConstructors<DefaultLengthUnit>, VaneEngineMethods<VaneCanonicalCoreConstructors<DefaultLengthUnit>, TokenPolicy, Axes> {}

export const VANE_ENGINE = Symbol.for('vane.engine')

interface EnginePrivate<Constructors extends object> {
  readonly [VANE_ENGINE]: {
    readonly kernel: VaneEngineKernel<Constructors>
    readonly requirement: VaneEngineRequirement
    readonly axes: VaneAxisRegistry<any>
    readonly dtcg: readonly VaneDtcgCodec[]
  }
}

const ENGINE_METHOD_NAMES = new Set<string>([
  'signature',
  'support',
  'policies',
  'extensions',
  'compatibleSignatures',
  'serialize',
  'defineCssValue',
  'defineCssOperation',
  'check',
  'scale',
  'media',
  'container',
  'supports',
  'data',
  'aria',
  'schemeIs',
  'token',
  'defineTokens',
  'createSystem',
  'axes',
  'axisOrder',
  'compatibleWith',
  'use',
  'extend',
  // Transitional current-system member; target surface v1 replaces it with tokenOverride.
  'theme',
  'tokenOverride',
])

export function defineEnginePlugin<
  const Added extends object,
  RequiredConstructors extends object = VaneCanonicalCoreConstructors<VaneLengthUnit>,
>(plugin: VaneEnginePlugin<Added, RequiredConstructors>): VaneEnginePlugin<Added, RequiredConstructors> {
  validateIdentity(plugin)
  if (typeof plugin.setup !== 'function')
    throw new TypeError('[vane] an engine plugin needs a setup(engine) function')
  const dtcg = normalizeDtcgCodecs(plugin.dtcg)
  return Object.freeze({ ...plugin, ...(dtcg === undefined ? {} : { dtcg }) })
}

export function createEngine(): VaneCoreEngine<'px', VaneDefaultTokenPolicy, Record<never, never>>
export function createEngine<
  const DefaultLengthUnit extends VaneLengthUnit,
  const Reference extends VaneTokenReference = 'var',
  const Emit extends boolean = true,
>(
  options: VaneEngineOptions<DefaultLengthUnit, Reference, Emit>,
): VaneCoreEngine<DefaultLengthUnit, VaneTokenPolicy<Reference, Emit>, Record<never, never>>
export function createEngine<
  const DefaultLengthUnit extends VaneLengthUnit = 'px',
  const Reference extends VaneTokenReference = 'var',
  const Emit extends boolean = true,
>(
  options: VaneEngineOptions<DefaultLengthUnit, Reference, Emit> = {},
): VaneCoreEngine<DefaultLengthUnit, VaneTokenPolicy<Reference, Emit>, Record<never, never>> {
  const defaultLengthUnit = options.length?.unitless ?? 'px' as DefaultLengthUnit
  const policies = {
    ...(options.policies ?? {}),
    systemSurface: {
      version: VANE_SYSTEM_SURFACE_VERSION,
      members: VANE_SYSTEM_MEMBERS,
      builtInConstructors: VANE_BUILTIN_CONSTRUCTOR_NAMES,
    },
    length: { unitless: defaultLengthUnit },
    tokens: {
      reference: options.tokens?.reference ?? 'var',
      emit: options.tokens?.emit ?? true,
    },
    ...(options.color === undefined ? {} : { color: options.color }),
    ...(options.validation === undefined ? {} : { validation: options.validation }),
  }

  const kernel = createEngineKernel(createCoreConstructors(defaultLengthUnit), {
    support: options.support ?? VANE_DEFAULT_CSS_SUPPORT,
    policies,
    extensions: VANE_CORE_EXTENSION_IDENTITIES,
  })
  return materializeEngine(kernel)
}

export function enginePrivate<Constructors extends object, TokenPolicy extends VaneTokenPolicy>(
  engine: VaneEngine<Constructors, TokenPolicy, VaneAxisDefinitions>,
): EnginePrivate<Constructors>[typeof VANE_ENGINE] {
  return (engine as VaneEngine<Constructors, TokenPolicy, VaneAxisDefinitions> & EnginePrivate<Constructors>)[VANE_ENGINE]
}

function materializeEngine<
  Constructors extends object,
  TokenPolicy extends VaneTokenPolicy = VaneDefaultTokenPolicy,
  Axes extends VaneAxisDefinitions = Record<never, never>,
>(
  kernel: VaneEngineKernel<Constructors>,
  axes: VaneAxisRegistry<Axes> = EMPTY_AXIS_REGISTRY as unknown as VaneAxisRegistry<Axes>,
  dtcg: readonly VaneDtcgCodec[] = [],
): VaneEngine<Constructors, TokenPolicy, Axes> {
  const requirement: VaneEngineRequirement = Object.freeze({
    protocol: kernel.protocol,
    signature: kernel.signature,
    compatibleSignatures: kernel.compatibleSignatures,
  })

  let engine: VaneEngine<Constructors, TokenPolicy, Axes>
  const extend = ((...args: unknown[]) => {
    const [identity, factory] = typeof args[0] === 'function'
      ? [undefined, args[0]]
      : [args[0] as VaneExtensionIdentity, args[1]]

    if (typeof factory !== 'function')
      throw new TypeError('[vane] extend() needs a callback that returns an engine namespace')

    if (identity !== undefined) {
      validateIdentity(identity)
      const installed = kernel.extensions.find(extension => extension.id === identity.id.trim())
      if (installed) {
        throw new TypeError(
          `[vane] extension id "${identity.id.trim()}" is already installed at version ${installed.version}`,
        )
      }
    }

    const added = factory(engine)
    validateContribution(added, kernel.constructors, identity?.id ?? 'anonymous extension')
    deepFreeze(added)

    const next = identity === undefined
      ? createEngineKernel(
          { ...kernel.constructors, ...added },
          {
            support: kernel.support,
            policies: kernel.policies,
            extensions: kernel.extensions,
            ancestors: kernel.compatibleSignatures,
          },
        )
      : kernel.extend(identity, added)
    return materializeEngine(next, axes, dtcg)
  }) as VaneEngineMethods<Constructors, TokenPolicy, Axes>['extend']

  const tokenPolicy = Object.freeze({
    reference: kernel.policies.tokens && typeof kernel.policies.tokens === 'object'
      && 'reference' in kernel.policies.tokens
      ? kernel.policies.tokens.reference as VaneTokenReference
      : 'var',
    emit: kernel.policies.tokens && typeof kernel.policies.tokens === 'object'
      && 'emit' in kernel.policies.tokens
      ? kernel.policies.tokens.emit as boolean
      : true,
  }) as TokenPolicy
  const token = createTokenFactory(axes)

  const common = {
    ...kernel.constructors,
    signature: kernel.signature,
    support: kernel.support,
    policies: kernel.policies,
    extensions: kernel.extensions,
    compatibleSignatures: kernel.compatibleSignatures,
    serialize: kernel.serialize,
    defineCssValue,
    defineCssOperation,
    check,
    scale,
    media,
    container,
    supports,
    data,
    aria,
    schemeIs,
    token,
    defineTokens: <const T extends VaneGraphInput = Record<never, never>>(
      seed?: T,
      options?: VaneTokenModuleOptions,
    ) => defineTokenModule(requirement, tokenPolicy, seed, options),
    createSystem: <
      const T extends object,
      const C extends Record<string, VaneConditionInput> = Record<never, never>,
      const L extends readonly string[] = VaneDefaultLayers,
      P extends string = 'vane',
      B extends boolean = true,
    >(options: VaneEngineSystemOptions<T, C, L, P, B>) => createSystemForEngine<
      Constructors,
      TokenPolicy,
      Axes,
      VaneCssFunction<VaneSystemConditionName<C, B>, L[number]>,
      T,
      C,
      L,
      P,
      B
    >(
      { kernel, requirement, tokenPolicy, axes, dtcg },
      options,
    ),
    axes: <const Added extends VaneAxisDefinitions>(
      factory: (
        context: Omit<VaneEngine<Constructors, TokenPolicy, Axes>, keyof VaneAxisAuthoringHelpers>
          & VaneAxisAuthoringHelpers,
      ) => Added & VaneAxisContributionGuard<Axes, Added>,
    ) => {
      if (typeof factory !== 'function')
        throw new TypeError('[vane] axes() needs a callback that returns an axis record')
      const context = Object.freeze({ ...engine, ...axisAuthoringHelpers }) as Omit<
        VaneEngine<Constructors, TokenPolicy, Axes>,
        keyof VaneAxisAuthoringHelpers
      > & VaneAxisAuthoringHelpers
      const nextAxes = normalizeAxisAdditions(axes, factory(context))
      return materializeEngine<Constructors, TokenPolicy, Axes & Added>(
        kernelWithAxes(kernel, nextAxes),
        nextAxes as unknown as VaneAxisRegistry<Axes & Added>,
        dtcg,
      )
    },
    axisOrder: <
      const First extends VaneAxisName<Axes>,
      const Rest extends readonly VaneAxisName<Axes>[],
    >(
      first: First,
      ...rest: Rest & VaneAxisOrderRestGuard<Axes, First, Rest>
    ) => {
      const order = [first, ...rest] as readonly VaneAxisName<Axes>[]
      const nextAxes = reorderAxes(axes, order)
      return materializeEngine<Constructors, TokenPolicy, Axes>(kernelWithAxes(kernel, nextAxes), nextAxes, dtcg)
    },
    compatibleWith: (other: Pick<VaneEngineMethods<object, VaneTokenPolicy, VaneAxisDefinitions>, 'signature'>) =>
      kernel.signature === other.signature,
    use: <
      const Added extends object,
      RequiredConstructors extends object,
    >(plugin: Constructors extends RequiredConstructors
      ? VaneEnginePlugin<Added, RequiredConstructors>
      : never) => {
      validateIdentity(plugin)
      const installed = kernel.extensions.find(extension => extension.id === plugin.id.trim())
      if (installed) {
        throw new TypeError(
          `[vane] extension id "${plugin.id.trim()}" is already installed at version ${installed.version}`,
        )
      }
      const pluginDtcg = normalizeDtcgCodecs(plugin.dtcg) ?? []
      const nextDtcg = [...dtcg, ...pluginDtcg]
      validateDtcgCodecs(nextDtcg)
      const added = plugin.setup(
        engine as unknown as VaneEngine<RequiredConstructors, VaneTokenPolicy, VaneAxisDefinitions>,
      ) as VaneExtensionOutput<Constructors, Added>
      validateContribution(added, kernel.constructors, plugin.id)
      deepFreeze(added)
      const next = kernel.extend(plugin, added)
      return materializeEngine(next, axes, Object.freeze(nextDtcg))
    },
    extend,
  }

  Object.defineProperty(common, VANE_ENGINE, {
    enumerable: false,
    value: Object.freeze({ kernel, requirement, axes, dtcg }),
  })
  engine = Object.freeze(common) as VaneEngine<Constructors, TokenPolicy, Axes>
  return engine
}

function validateDtcgCodecs(codecs: readonly VaneDtcgCodec[] | undefined): void {
  const identities = new Set<string>()
  for (const codec of codecs ?? []) {
    const identity = `${codec.id}@${codec.version}`
    if (!codec.id.trim() || !String(codec.version).trim() || !codec.extension.trim())
      throw new TypeError('[vane] a DTCG codec needs non-empty id, version, and extension fields')
    if (typeof codec.encode !== 'function' || typeof codec.decode !== 'function')
      throw new TypeError(`[vane] DTCG codec '${identity}' needs encode() and decode() functions`)
    if (identities.has(identity))
      throw new TypeError(`[vane] duplicate DTCG codec '${identity}'`)
    identities.add(identity)
  }
}

function normalizeDtcgCodecs(codecs: readonly VaneDtcgCodec[] | undefined): readonly VaneDtcgCodec[] | undefined {
  if (codecs === undefined)
    return undefined
  validateDtcgCodecs(codecs)
  return Object.freeze(codecs.map(codec => Object.freeze({ ...codec })))
}

function kernelWithAxes<Constructors extends object>(
  kernel: VaneEngineKernel<Constructors>,
  axes: VaneAxisRegistry<any>,
): VaneEngineKernel<Constructors> {
  return createEngineKernel(kernel.constructors, {
    support: kernel.support,
    policies: { ...kernel.policies, axes: axisSemanticPolicy(axes) },
    extensions: kernel.extensions,
    ancestors: kernel.compatibleSignatures,
  })
}

function validateContribution(
  added: unknown,
  existing: object,
  owner: string,
): asserts added is object {
  if (!isPlainObject(added))
    throw new TypeError(`[vane] ${owner} must return a plain object namespace`)

  assertSystemNamespaceAvailable(Object.keys(added), owner)
  for (const name of Object.keys(added)) {
    if (name in existing || ENGINE_METHOD_NAMES.has(name)) {
      throw new TypeError(
        `[vane] ${owner} cannot define '${name}' because that engine/system member already exists`,
      )
    }
  }
}

function validateIdentity(identity: VaneExtensionIdentity): void {
  if (identity.id.trim().length === 0 || String(identity.version).trim().length === 0)
    throw new TypeError('[vane] plugin/extension identity needs non-empty id and version fields')
  if (identity.fingerprint !== undefined && identity.fingerprint.trim().length === 0)
    throw new TypeError('[vane] a provided plugin configuration fingerprint cannot be empty')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null)
    return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function deepFreeze(value: unknown): void {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null || Object.isFrozen(value))
    return
  Object.freeze(value)
  for (const child of [
    ...Object.values(value as Record<string, unknown>),
    ...Object.getOwnPropertySymbols(value).map(symbol => (value as any)[symbol]),
  ])
    deepFreeze(child)
}
