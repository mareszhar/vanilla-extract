/** Plane-neutral port handles and synchronous Standard Schema validation. */

import type { VaneStandardSchemaV1 } from '../tokens/types'
import type {
  VanePort,
  VanePortBindingOptions,
  VanePortMeta,
  VanePortSetValue,
  VanePortStyle,
  VanePortValue,
} from './types'
import { isHandle } from '../internal/handle'
import { isCssValue, isVaneValue } from '../values/types'

const PORT = Symbol.for('vane.port')
const OMIT = Symbol('vane.port.omit')

interface PortHandleContext {
  readonly serialize?: (value: unknown) => VanePortValue
  readonly schema?: VaneStandardSchemaV1
  readonly binding?: VanePortBindingOptions
}

export function isPort(value: unknown): value is VanePort {
  return typeof value === 'function' && (value as unknown as Record<symbol, unknown>)[PORT] === true
}

export function createPortHandle(meta: VanePortMeta, context: PortHandleContext = {}): VanePort {
  const reference = `var(${meta.name}, ${String(meta.defaultValue)})` as `var(--${string}, ${string})`
  const handle = (() => reference) as unknown as VanePort
  Object.defineProperty(handle, 'name', { value: meta.name, configurable: true })
  Object.defineProperty(handle, PORT, { value: true, configurable: true })

  const set = (input: VanePortSetValue<any>): VanePortStyle => {
    const value = validate(input, meta, context)
    if (value === OMIT)
      return {}
    return { [meta.name]: serialize(value, context) }
  }

  return Object.assign(handle, {
    meta,
    defaultValue: meta.defaultValue,
    type: meta.type,
    kind: meta.kind,
    var: reference,
    set,
    bind: (binding: VanePortBindingOptions) => createPortHandle(meta, { ...context, binding }),
    describe: (text: string): VanePort => {
      meta.description = text
      return handle
    },
    deprecated: (reason: string): VanePort => {
      meta.deprecated = reason
      return handle
    },
    toString: () => reference,
  })
}

function validate(input: unknown, meta: VanePortMeta, context: PortHandleContext): unknown | typeof OMIT {
  const policy = meta.validation
  if (!policy || !shouldValidate(policy.runtime, context.binding?.dev))
    return input

  const schema = context.schema ?? context.binding?.validators?.[policy.id]
  if (!schema)
    throw new TypeError(`[vane] port ${meta.name} needs the synchronous Standard Schema validator '${policy.id}'`)

  const result = schema['~standard'].validate(input)
  if (isPromiseLike(result))
    throw new TypeError(`[vane] port ${meta.name} validator '${policy.id}' is async; set() is synchronous`)
  if ('value' in result)
    return result.value

  if (policy.onInvalid === 'omit')
    return OMIT
  if (policy.onInvalid === 'fallback' && policy.fallback !== undefined)
    return policy.fallback

  const detail = result.issues.map(issue => issue.message).join('; ')
  throw new TypeError(`[vane] port ${meta.name} rejected its value${detail ? `: ${detail}` : ''}`)
}

function shouldValidate(mode: false | 'dev' | 'always', explicitDev: boolean | undefined): boolean {
  if (mode === false)
    return false
  if (mode === 'always')
    return true
  if (explicitDev !== undefined)
    return explicitDev
  // eslint-disable-next-line node/prefer-global/process
  return typeof process === 'undefined' || process.env.NODE_ENV !== 'production'
}

function serialize(value: unknown, context: PortHandleContext): VanePortValue {
  if (context.serialize)
    return context.serialize(value)
  if (isPort(value))
    return value.var
  if (isHandle(value))
    return String(value)
  if ((typeof value === 'object' || typeof value === 'function') && value !== null && '$var' in value)
    return String(value)
  if ((typeof value === 'object' || typeof value === 'function') && value !== null && 'var' in value)
    return (value as { var: string }).var
  if (isCssValue(value))
    return value.css
  if (isVaneValue(value))
    return String(value)
  if (typeof value === 'string' || typeof value === 'number')
    return value
  throw new TypeError('[vane] a port value must serialize to CSS text or a finite number')
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value
}
