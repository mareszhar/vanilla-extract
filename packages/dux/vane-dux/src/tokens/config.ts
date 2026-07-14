/** Canonical token configuration branding. The wrapper is data, not a group. */

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

export function createTokenFactory(): VaneTokenFactory {
  const token = ((config: VaneTokenConfig) => configuredToken(config, inferConfiguredType(config))) as VaneTokenFactory

  for (const [name, type] of Object.entries(DATA_TYPES)) {
    Object.defineProperty(token, name, {
      enumerable: true,
      value: ((config: Omit<VaneTokenConfig<never>, 'val'> = {}) => configuredToken(config, type)) as unknown as VaneTypedNoDefaultTokenFactory<VaneCssDataType>,
    })
  }

  return Object.freeze(token) as unknown as VaneTokenFactory
}

export function isConfiguredToken(value: unknown): value is VaneConfiguredToken {
  return typeof value === 'object' && value !== null
    && (value as Partial<VaneConfiguredToken>)[VANE_CONFIGURED_TOKEN] === true
}

function configuredToken<const Config extends VaneTokenConfig, Type extends VaneCssDataType>(
  config: Config,
  type: Type,
): VaneConfiguredToken<Config, Type> {
  if (!isPlainObject(config))
    throw new TypeError('[vane] token() needs one plain configuration object')

  validateTokenConfig(config)
  return Object.freeze({
    [VANE_CONFIGURED_TOKEN]: true as const,
    config: deepFreeze({ ...config }) as Config,
    type,
  })
}

function validateTokenConfig(config: VaneTokenConfig): void {
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

  for (const entry of config.cases ?? []) {
    if (!isPlainObject(entry) || !isPlainObject(entry.when) || !('val' in entry))
      throw new TypeError('[vane] every token case needs plain when and val fields')
  }
}

function inferConfiguredType(config: VaneTokenConfig): VaneCssDataType {
  const val = config.val
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
