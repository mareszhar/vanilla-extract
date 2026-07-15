/** Build-time port declaration bound to one finalized system serializer. */

import type {
  VanePort,
  VanePortDataTypeOf,
  VanePortDefinition,
  VanePortInput,
  VanePortKind,
  VanePortMeta,
  VanePortOptions,
  VanePortValidation,
  VanePortValidationMeta,
  VanePortValue,
  VanePortWiden,
} from './types'
import { createVar } from '@vanilla-extract/css'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { diagnosticSource, VaneError } from '../diagnostics'
import { record } from '../internal/inspect'
import { requireStyleModule } from '../internal/styleModule'
import { createPortHandle, isPort } from './handle'

export { isPort } from './handle'

export interface VanePortContext {
  readonly prefix: string
  readonly serialize: (value: unknown) => VanePortValue
}

export function createPort<
  Value extends VanePortInput,
  Output = Value,
>(
  input: Value | VanePortDefinition<Value, Output>,
  options: VanePortOptions<Value, Output> | undefined,
  ctx: VanePortContext,
): VanePort<VanePortWiden<Value>, VanePortDataTypeOf<Value>> {
  const file = requireStyleModule('port')
  const definition = isDefinition(input) ? input : undefined
  const defaultValue = (definition?.val ?? input) as Value
  const config = definition ?? options
  const rawRef = createVar(config?.label)
  const bareIdent = rawRef.slice(4, -1).replace(/^--/, '')
  const name = `--${ctx.prefix}-${bareIdent}`
  let serializedDefault: VanePortValue
  try {
    serializedDefault = ctx.serialize(defaultValue)
  }
  catch (error) {
    throw new VaneError({
      code: 'VANE_PORT_INVALID_DEFAULT',
      message: 'a port default is not a serializable CSS value',
      detail: [error instanceof Error ? error.message : String(error)],
      file,
      fix: 'give it CSS text, a finite number, a typed vane value, a token, or another port',
    })
  }
  const type = dataTypeOf(defaultValue)
  const validation = normalizeValidation(config?.validate as VanePortValidation<any, any> | undefined, ctx)

  const meta: VanePortMeta = {
    name,
    defaultValue: serializedDefault,
    type,
    kind: legacyKind(type),
    ...(validation === undefined ? {} : { validation }),
  }

  const handle = createPortHandle(meta, {
    serialize: ctx.serialize,
    schema: config?.validate?.schema as any,
  }) as unknown as VanePort<VanePortWiden<Value>, VanePortDataTypeOf<Value>>

  record({
    kind: 'port',
    file,
    ...diagnosticSource(),
    ...(config?.label === undefined ? {} : { label: config.label }),
    meta,
  })

  addFunctionSerializer(handle as unknown as (...args: unknown[]) => unknown, {
    importPath: '@mszr/vane-dux/runtime',
    importName: 'restorePort',
    args: [meta as unknown as Record<string, string>],
  })

  return handle
}

function isDefinition<
  Value extends VanePortInput,
  Output,
>(
  input: Value | VanePortDefinition<Value, Output>,
): input is VanePortDefinition<Value, Output> {
  return typeof input === 'object' && input !== null && Object.hasOwn(input, 'val')
}

function normalizeValidation(
  validate: VanePortValidation | undefined,
  ctx: VanePortContext,
): VanePortValidationMeta | undefined {
  if (!validate)
    return undefined
  if (validate.id.trim().length === 0)
    throw new TypeError('[vane] port.validate.id must be non-empty')
  const runtime = validate.runtime ?? 'dev'
  const onInvalid = validate.onInvalid ?? 'throw'
  if (runtime !== false && runtime !== 'dev' && runtime !== 'always')
    throw new TypeError('[vane] port.validate.runtime must be false, \'dev\', or \'always\'')
  if (onInvalid !== 'throw' && onInvalid !== 'fallback' && onInvalid !== 'omit')
    throw new TypeError('[vane] port.validate.onInvalid must be \'throw\', \'fallback\', or \'omit\'')
  if (onInvalid === 'fallback' && !Object.hasOwn(validate, 'fallback'))
    throw new TypeError('[vane] port.validate with onInvalid: \'fallback\' needs a fallback value')

  const fallback = validate.fallback === undefined ? undefined : ctx.serialize(validate.fallback)
  return Object.freeze({
    id: validate.id,
    runtime,
    onInvalid,
    ...(fallback === undefined ? {} : { fallback }),
  })
}

function dataTypeOf(value: VanePortInput): any {
  if (isPort(value))
    return value.type
  if ((typeof value === 'object' || typeof value === 'function') && value !== null) {
    if ('$type' in value)
      return value.$type
    if ('type' in value)
      return value.type
  }
  if (typeof value === 'number')
    return 'number'
  if (typeof value !== 'string')
    return 'declaration'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)%$/.test(value))
    return 'percentage'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch|lh)$/.test(value))
    return 'length'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:deg|grad|rad|turn)$/.test(value))
    return 'angle'
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:ms|s)$/.test(value))
    return 'time'
  return 'declaration'
}

function legacyKind(type: string): VanePortKind {
  if (type === 'number' || type === 'integer')
    return 'number'
  return type === 'color' ? 'color' : 'string'
}
