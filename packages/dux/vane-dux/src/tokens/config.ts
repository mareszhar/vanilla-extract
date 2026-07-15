/** Canonical token configuration branding. The wrapper is data, not a group. */

import type { VaneAxisDefinitions, VaneAxisRegistry } from '../system/axes'
import type { VaneCssDataType } from '../values/types'
import type {
  VaneConfiguredToken,
  VaneTokenConfig,
  VaneTokenFactory,
  VaneTypedNoDefaultTokenFactory,
} from './types'
import { VANE_CONFIGURED_TOKEN } from './types'

const DATA_TYPES = {
  unknown: 'unknown',
  number: 'number',
  integer: 'integer',
  percentage: 'percentage',
  numberPercentage: 'number-percentage',
  length: 'length',
  lengthPercentage: 'length-percentage',
  angle: 'angle',
  time: 'time',
  frequency: 'frequency',
  resolution: 'resolution',
  flex: 'flex',
  color: 'color',
  image: 'image',
  position: 'position',
  easingFunction: 'easing-function',
  transformFunction: 'transform-function',
  transformList: 'transform-list',
  customIdent: 'custom-ident',
  dashedIdent: 'dashed-ident',
  string: 'string',
  url: 'url',
} as const satisfies Readonly<Record<string, VaneCssDataType>>

export function createTokenFactory<Axes extends VaneAxisDefinitions = Record<never, never>>(
  axes?: VaneAxisRegistry<Axes>,
): VaneTokenFactory<Axes> {
  const token = ((config: VaneTokenConfig) => configuredToken(config, inferConfiguredType(config), axes)) as VaneTokenFactory<Axes>

  for (const [name, type] of Object.entries(DATA_TYPES)) {
    Object.defineProperty(token, name, {
      enumerable: true,
      value: ((config: Omit<VaneTokenConfig<never>, 'val'> = {}) => configuredToken(config, type, axes)) as unknown as VaneTypedNoDefaultTokenFactory<VaneCssDataType, Axes>,
    })
  }

  return Object.freeze(token) as unknown as VaneTokenFactory<Axes>
}

export function isConfiguredToken(value: unknown): value is VaneConfiguredToken {
  return typeof value === 'object' && value !== null
    && (value as Partial<VaneConfiguredToken>)[VANE_CONFIGURED_TOKEN] === true
}

function configuredToken<const Config extends VaneTokenConfig, Type extends VaneCssDataType>(
  config: Config,
  type: Type,
  axes?: VaneAxisRegistry<any>,
): VaneConfiguredToken<Config, Type> {
  if (!isPlainObject(config))
    throw new TypeError('[vane] token() needs one plain configuration object')

  validateTokenConfig(config, axes)
  const lowered = lowerAxisDerivations(config, axes)
  return Object.freeze({
    [VANE_CONFIGURED_TOKEN]: true as const,
    config: deepFreeze(lowered) as Config,
    type,
  })
}

/**
 * Axis derivations are authoring sugar, not deferred engine semantics. Lower
 * them while the originating engine is present so unfinished modules carry
 * self-contained public value IR across HMR and compatible engine instances.
 */
function lowerAxisDerivations<Config extends VaneTokenConfig>(
  config: Config,
  axes?: VaneAxisRegistry<any>,
): Config {
  if (config.axes === undefined || axes === undefined)
    return { ...config }

  const loweredAxes: Record<string, Record<string, unknown | null>> = {}
  for (const [axis, configuredModes] of Object.entries(config.axes)) {
    const definition = axes.definitions[axis]!
    const loweredModes: Record<string, unknown | null> = { ...configuredModes }
    const context: Record<string, unknown> = { ...loweredModes }
    if (definition.defaultMode !== undefined && Object.hasOwn(config, 'val') && !(definition.defaultMode in context))
      context[definition.defaultMode] = config.val

    for (const mode of definition.modeOrder) {
      const derive = (definition.derive as Readonly<Record<string, ((modes: Readonly<Record<string, any>>) => unknown) | undefined>>)[mode]
      if (derive === undefined || mode in context)
        continue
      let value: unknown
      try {
        value = derive(Object.freeze({ ...context }))
      }
      catch (error) {
        throw new TypeError(
          `[vane] token axis '${axis}' could not derive mode '${mode}': ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      if (value !== undefined) {
        loweredModes[mode] = value
        context[mode] = value
      }
    }
    loweredAxes[axis] = loweredModes
  }

  return { ...config, axes: loweredAxes } as Config
}

function validateTokenConfig(config: VaneTokenConfig, axes?: VaneAxisRegistry<any>): void {
  const conditional = config.mutable === true || config.axes !== undefined || config.cases !== undefined
  if (conditional && config.reference === 'val') {
    throw new TypeError(
      '[vane] token.reference cannot be \'val\' when mutable, axes, or cases need a custom-property binding; use reference: \'var\'',
    )
  }
  if (conditional && config.emit === false) {
    throw new TypeError(
      '[vane] token.emit cannot be false when mutable, axes, or cases need a custom-property binding; use emit: true',
    )
  }
  if ('val' in config && config.val === null)
    throw new TypeError('[vane] token({ val: null }) is ambiguous; omit val for a base reservation, or use null as an axis/case reservation')
  if (config.reference === 'var' && config.emit === false && 'val' in config) {
    throw new TypeError(
      '[vane] a var-referenced token with an authored val must emit its custom property; use reference: \'val\' for a known nonemitted value',
    )
  }
  if (config.axes !== undefined && !isPlainObject(config.axes))
    throw new TypeError('[vane] token.axes must be an object keyed by axis and mode')
  if (config.cases !== undefined && !Array.isArray(config.cases))
    throw new TypeError('[vane] token.cases must be an array of explicit intersections')
  validateRuntimePolicy(config.validate)

  for (const [axis, modes] of Object.entries(config.axes ?? {})) {
    const definition = axes?.definitions[axis]
    if (!definition)
      throw new TypeError(`[vane] token axis '${axis}' is not declared by this engine`)
    if (!isPlainObject(modes))
      throw new TypeError(`[vane] token axis '${axis}' must be an object keyed by mode`)
    for (const mode of Object.keys(modes)) {
      if (!(mode in definition.modes))
        throw new TypeError(`[vane] token axis '${axis}' has no mode '${mode}'`)
    }
  }

  const caseAddresses = new Set<string>()
  for (const entry of config.cases ?? []) {
    if (!isPlainObject(entry) || !isPlainObject(entry.when) || !('val' in entry))
      throw new TypeError('[vane] every token case needs plain when and val fields')
    const names = Object.keys(entry.when)
    if (names.length < 2)
      throw new TypeError('[vane] a sparse token case must intersect at least two declared axes')
    for (const [axis, mode] of Object.entries(entry.when)) {
      const definition = axes?.definitions[axis]
      if (!definition)
        throw new TypeError(`[vane] token case axis '${axis}' is not declared by this engine`)
      if (typeof mode !== 'string' || !(mode in definition.modes))
        throw new TypeError(`[vane] token case axis '${axis}' has no mode '${String(mode)}'`)
    }
    const address = [...Object.entries(entry.when)].sort(([a], [b]) => a.localeCompare(b)).map(([axis, mode]) => `${axis}:${mode}`).join('|')
    if (caseAddresses.has(address))
      throw new TypeError(`[vane] duplicate token case '${address}'`)
    caseAddresses.add(address)
  }
}

function validateRuntimePolicy(validate: VaneTokenConfig['validate']): void {
  if (validate === undefined)
    return
  if (!isPlainObject(validate) || typeof validate.id !== 'string' || validate.id.trim().length === 0)
    throw new TypeError('[vane] token.validate needs a stable non-empty id for build/app schema lookup')
  if (validate.runtime !== undefined && validate.runtime !== false && validate.runtime !== 'dev' && validate.runtime !== 'always')
    throw new TypeError('[vane] token.validate.runtime must be false, \'dev\', or \'always\'')
  if (validate.onInvalid !== undefined && validate.onInvalid !== 'throw' && validate.onInvalid !== 'fallback' && validate.onInvalid !== 'omit')
    throw new TypeError('[vane] token.validate.onInvalid must be \'throw\', \'fallback\', or \'omit\'')
  if (validate.onInvalid === 'fallback' && !Object.hasOwn(validate, 'fallback'))
    throw new TypeError('[vane] token.validate with onInvalid: \'fallback\' needs a fallback value')
  if (validate.schema !== undefined) {
    const standard = validate.schema['~standard']
    if (!standard || standard.version !== 1 || typeof standard.vendor !== 'string' || typeof standard.validate !== 'function')
      throw new TypeError('[vane] token.validate.schema must implement Standard Schema v1')
  }
}

function inferConfiguredType(config: VaneTokenConfig): VaneCssDataType {
  const val = Object.hasOwn(config, 'val')
    ? config.val
    : firstConfiguredValue(config)
  if ((typeof val === 'object' || typeof val === 'function') && val !== null && 'type' in val && typeof val.type === 'string')
    return val.type as VaneCssDataType
  if (typeof val === 'number')
    return Number.isInteger(val) ? 'integer' : 'number'
  if (typeof val === 'string') {
    if (/^-?(?:\d+|\d*\.\d+)%$/.test(val))
      return 'percentage'
    if (/^-?(?:\d+|\d*\.\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch|lh)$/.test(val))
      return 'length'
    if (/^-?(?:\d+|\d*\.\d+)(?:deg|grad|rad|turn)$/.test(val))
      return 'angle'
    if (/^-?(?:\d+|\d*\.\d+)(?:ms|s)$/.test(val))
      return 'time'
  }
  return 'unknown'
}

function firstConfiguredValue(config: VaneTokenConfig): unknown {
  for (const modes of Object.values(config.axes ?? {})) {
    for (const value of Object.values(modes)) {
      if (value !== null)
        return value
    }
  }
  for (const entry of config.cases ?? []) {
    if (entry.val !== null)
      return entry.val
  }
  return undefined
}

function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null)
    return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value) && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of value)
      deepFreeze(child)
  }
  else if (isPlainObject(value) && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value))
      deepFreeze(child)
  }
  return value
}
