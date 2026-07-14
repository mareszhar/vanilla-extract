/** Canonical authoring environment: an engine defines one or more systems. */

import type { VaneEngineKernel } from '../internal/engineKernel'
import type { VaneConditionInput } from '../system/conditions'
import type {
  VaneDefaultLayers,
  VaneEngineSystemOptions,
  VaneSystem,
  VaneSystemConditionName,
  VaneSystemTokens,
} from '../system/createSystem'
import type {
  VaneEngineRequirement,
  VaneGraphInput,
  VaneTokenModule,
  VaneTokenModuleOptions,
} from '../tokens/types'
import type { VaneCoreConstructors } from '../values/defaultEngine'
import type { VaneCssSupportTarget, VaneExtensionIdentity } from '../values/protocol'
import type { VaneSelfValue } from '../values/types'
import type { VaneLengthUnit } from '../values/units'
import { createEngineKernel } from '../internal/engineKernel'
import { aria, container, data, media, schemeIs, supports } from '../system/conditions'
import { createSystemForEngine } from '../system/createSystem'
import { check } from '../tokens/checks'
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

export interface VaneEngineTokenPolicy {
  readonly reference?: 'val' | 'var'
  readonly emit?: boolean
}

export interface VaneEngineOptions<DefaultLengthUnit extends VaneLengthUnit = 'px'> {
  readonly support?: VaneCssSupportTarget
  readonly length?: { readonly unitless?: DefaultLengthUnit }
  /** Captured now; Phase 3 applies these defaults to the new token traits. */
  readonly tokens?: VaneEngineTokenPolicy
  readonly color?: Readonly<Record<string, VaneSemanticPolicy>>
  readonly validation?: Readonly<Record<string, VaneSemanticPolicy>>
  /** Extension point for project policies whose semantics affect identity. */
  readonly policies?: Readonly<Record<string, VaneSemanticPolicy>>
}

export interface VaneEnginePlugin<
  Added extends Readonly<Record<string, unknown>>,
  RequiredConstructors extends object = VaneCoreConstructors<VaneLengthUnit>,
> extends VaneExtensionIdentity {
  readonly setup: (engine: VaneEngine<RequiredConstructors>) => Added
}

type VaneEngineReserved<Constructors extends object> = keyof Constructors | keyof VaneEngineMethods<Constructors> | typeof VANE_SYSTEM_MEMBERS[number]
type VaneExtensionOutput<Constructors extends object, Added> = Added & {
  readonly [Key in Extract<keyof Added, VaneEngineReserved<Constructors>>]: never
}

export interface VaneEngineMethods<Constructors extends object> {
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
  readonly defineTokens: <const T extends VaneGraphInput = Record<never, never>>(
    seed?: T,
    options?: VaneTokenModuleOptions,
  ) => VaneTokenModule<T>
  readonly createSystem: <
    const T extends object,
    const C extends Record<string, VaneConditionInput> = Record<never, never>,
    const L extends readonly string[] = VaneDefaultLayers,
    P extends string = 'vane',
    B extends boolean = true,
  >(
    options: VaneEngineSystemOptions<T, C, L, P, B>,
  ) => VaneSystem<VaneSystemTokens<T, P>, VaneSystemConditionName<C, B>, L[number], Constructors>
  readonly compatibleWith: (other: Pick<VaneEngineMethods<object>, 'signature'>) => boolean
  readonly use: <
    const Added extends Readonly<Record<string, unknown>>,
    RequiredConstructors extends object,
  >(
    plugin: Constructors extends RequiredConstructors
      ? VaneEnginePlugin<Added, RequiredConstructors>
      : never,
  ) => VaneEngine<Constructors & Added>
  readonly extend: {
    <const Added extends Readonly<Record<string, unknown>>>(
      extension: (engine: VaneEngine<Constructors>) => VaneExtensionOutput<Constructors, Added>,
    ): VaneEngine<Constructors & Added>
    <const Added extends Readonly<Record<string, unknown>>>(
      identity: VaneExtensionIdentity,
      extension: (engine: VaneEngine<Constructors>) => VaneExtensionOutput<Constructors, Added>,
    ): VaneEngine<Constructors & Added>
  }
}

export type VaneEngine<Constructors extends object>
  = Readonly<Constructors> & VaneEngineMethods<Constructors>

/** Named zero-config/configured engine surface, kept compact in consumer declarations. */
export interface VaneCoreEngine<DefaultLengthUnit extends VaneLengthUnit = 'px'>
  extends VaneCoreConstructors<DefaultLengthUnit>, VaneEngineMethods<VaneCoreConstructors<DefaultLengthUnit>> {}

export const VANE_ENGINE = Symbol.for('vane.engine')

interface EnginePrivate<Constructors extends object> {
  readonly [VANE_ENGINE]: {
    readonly kernel: VaneEngineKernel<Constructors>
    readonly requirement: VaneEngineRequirement
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
  'defineTokens',
  'createSystem',
  'compatibleWith',
  'use',
  'extend',
  // Transitional current-system member; target surface v1 replaces it with tokenOverride.
  'theme',
])

export function defineEnginePlugin<
  const Added extends Readonly<Record<string, unknown>>,
  RequiredConstructors extends object = VaneCoreConstructors<VaneLengthUnit>,
>(plugin: VaneEnginePlugin<Added, RequiredConstructors>): VaneEnginePlugin<Added, RequiredConstructors> {
  validateIdentity(plugin)
  if (typeof plugin.setup !== 'function')
    throw new TypeError('[vane] an engine plugin needs a setup(engine) function')
  return Object.freeze({ ...plugin })
}

export function createEngine(): VaneCoreEngine<'px'>
export function createEngine<const DefaultLengthUnit extends VaneLengthUnit>(
  options: VaneEngineOptions<DefaultLengthUnit>,
): VaneCoreEngine<DefaultLengthUnit>
export function createEngine<const DefaultLengthUnit extends VaneLengthUnit = 'px'>(
  options: VaneEngineOptions<DefaultLengthUnit> = {},
): VaneCoreEngine<DefaultLengthUnit> {
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

export function enginePrivate<Constructors extends object>(
  engine: VaneEngine<Constructors>,
): EnginePrivate<Constructors>[typeof VANE_ENGINE] {
  return (engine as VaneEngine<Constructors> & EnginePrivate<Constructors>)[VANE_ENGINE]
}

function materializeEngine<Constructors extends object>(
  kernel: VaneEngineKernel<Constructors>,
): VaneEngine<Constructors> {
  const requirement: VaneEngineRequirement = Object.freeze({
    protocol: kernel.protocol,
    signature: kernel.signature,
    compatibleSignatures: kernel.compatibleSignatures,
  })

  let engine: VaneEngine<Constructors>
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
    return materializeEngine(next)
  }) as VaneEngineMethods<Constructors>['extend']

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
    defineTokens: <const T extends VaneGraphInput = Record<never, never>>(
      seed?: T,
      options?: VaneTokenModuleOptions,
    ) => defineTokenModule(requirement, seed, options),
    createSystem: <
      const T extends object,
      const C extends Record<string, VaneConditionInput> = Record<never, never>,
      const L extends readonly string[] = VaneDefaultLayers,
      P extends string = 'vane',
      B extends boolean = true,
    >(options: VaneEngineSystemOptions<T, C, L, P, B>) => createSystemForEngine(
      { kernel, requirement },
      options,
    ),
    compatibleWith: (other: Pick<VaneEngineMethods<object>, 'signature'>) =>
      kernel.signature === other.signature,
    use: <
      const Added extends Readonly<Record<string, unknown>>,
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
      return extend(plugin, current => plugin.setup(
        current as unknown as VaneEngine<RequiredConstructors>,
      ) as VaneExtensionOutput<Constructors, Added>)
    },
    extend,
  }

  Object.defineProperty(common, VANE_ENGINE, {
    enumerable: false,
    value: Object.freeze({ kernel, requirement }),
  })
  engine = Object.freeze(common) as VaneEngine<Constructors>
  return engine
}

function validateContribution(
  added: unknown,
  existing: object,
  owner: string,
): asserts added is Readonly<Record<string, unknown>> {
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
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child)
}
