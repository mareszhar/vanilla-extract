/**
 * `port()` — the typed runtime boundary ([dux-spec-ports.md], [dux-patterns.md §4]).
 *
 * A port is a declared, typed, defaulted CSS custom property that a style
 * exposes as its public runtime interface. Declaring one is a single
 * expression: `port(0)` → a number port typed by its default. The handle
 * interpolates as `var(--name, <default>)` — the default makes every style
 * complete without its runtime half.
 *
 * Underneath: `createVar` for the scoped, hashed identifier; the system prefix
 * rides the name; `addFunctionSerializer` carries the handle across the
 * build/app boundary so `restorePort` rebuilds it at runtime.
 */

import type { VaneExprTraits, VaneResolver } from '../tokens/resolve'
import type { VanePort, VanePortInput, VanePortKind, VanePortOptions, VanePortValue } from './types'
import { createVar } from '@vanilla-extract/css'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { isHandle } from '../internal/handle'
import { requireStyleModule } from '../internal/styleModule'
import { ColorValue } from '../tokens/color'
import { serializeExpr } from '../tokens/resolve'
import { createPortHandle, serializeDefault } from './handle'

/** Re-exported so `css/values.ts` can detect ports without a second import. */
export { isPort } from './handle'

/** Anything a port factory needs from its system — bound once by `createSystem`. */
export interface VanePortContext {
  prefix: string
  elevation: VaneResolver['elevation']
}

// ─── The build-time factory ──────────────────────────────────────────────────

/**
 * The bound `port()` — closed over the system prefix and elevation config.
 * Called from `createSystem`; the `file` comes from the style module guard.
 */
export function createPort<TValue extends VanePortInput>(
  defaultValue: TValue,
  options: VanePortOptions | undefined,
  ctx: VanePortContext,
): VanePort<TValue> {
  requireStyleModule('port')
  const kind = inferKind(defaultValue)
  const unit = options?.as
  const label = options?.label

  // `createVar` generates a scoped, hashed identifier from the file scope.
  // We extract the bare name and prepend the system prefix.
  const rawRef = createVar(label)
  const bareIdent = rawRef.slice(4, -1).replace(/^--/, '')
  const name = `--${ctx.prefix}-${bareIdent}` as `--${string}`

  const metaDefault = toMetaDefault(defaultValue, kind, ctx)

  const handle = createPortHandle({
    name,
    defaultValue: metaDefault,
    kind,
    ...(unit !== undefined ? { unit } : {}),
  }) as unknown as VanePort<TValue>

  // Carry the handle across the build/app boundary so `restorePort` rebuilds it.
  addFunctionSerializer(handle as unknown as (...args: unknown[]) => unknown, {
    importPath: '@mszr/vane-dux/runtime',
    importName: 'restorePort',
    args: [{
      name,
      defaultValue: serializeDefault(metaDefault, unit),
      kind,
      ...(unit !== undefined ? { unit } : {}),
    }],
  })

  return handle
}

// ─── Kind inference and default serialization ────────────────────────────────

function inferKind(defaultValue: VanePortInput): VanePortKind {
  if (isHandle(defaultValue))
    return 'color'
  if (defaultValue instanceof ColorValue)
    return 'color'
  if (typeof defaultValue === 'number')
    return 'number'
  return 'string'
}

/**
 * The default for the meta — the serialized form that survives the
 * build/runtime boundary. Handles become their `var()` reference; color
 * expressions fold through the system's resolver; primitives pass through.
 */
function toMetaDefault(value: VanePortInput, _kind: VanePortKind, ctx: VanePortContext): VanePortValue {
  if (isHandle(value))
    return value.var
  if (value instanceof ColorValue)
    return serializeColorDefault(value, ctx)
  return value as VanePortValue
}

/** Fold a color expression to its CSS string form using the system resolver. */
function serializeColorDefault(value: ColorValue, ctx: VanePortContext): string {
  const resolver: VaneResolver = {
    elevation: ctx.elevation,
    refTraits: () => ({ cssLive: false, volatile: false } as VaneExprTraits),
    foldRef: () => ({ l: 0, c: 0, h: 0 }),
    invalidColor: (detail) => {
      throw new Error(`a port's color default cannot resolve: ${detail}`)
    },
  }

  return serializeExpr(value.expr, resolver)
}
