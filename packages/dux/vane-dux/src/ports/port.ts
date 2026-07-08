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

import type { VaneResolver } from '../tokens/resolve'
import type { VanePort, VanePortInput, VanePortKind, VanePortMeta, VanePortOptions, VanePortValue } from './types'
import { createVar } from '@vanilla-extract/css'
import { addFunctionSerializer } from '@vanilla-extract/css/functionSerializer'
import { VaneError } from '../diagnostics'
import { isHandle } from '../internal/handle'
import { requireStyleModule } from '../internal/styleModule'
import { ColorValue, ContrastValue } from '../tokens/color'
import { tokenKindOf } from '../tokens/graph'
import { containsContrast, modeTraits, serializeExpr } from '../tokens/resolve'
import { createPortHandle, isPort } from './handle'

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
  const file = requireStyleModule('port')
  const unit = options?.as

  // `createVar` generates a scoped, hashed identifier from the file scope.
  // We extract the bare name and prepend the system prefix.
  const rawRef = createVar(options?.label)
  const bareIdent = rawRef.slice(4, -1).replace(/^--/, '')
  const name = `--${ctx.prefix}-${bareIdent}`

  // One declaration record: the handle mutates it (`.describe()`), the
  // serializer reads it when exports cross the boundary — late metadata still
  // arrives because serialization happens after the module body runs.
  const meta: VanePortMeta = {
    name,
    defaultValue: toMetaDefault(defaultValue, ctx, file),
    kind: inferKind(defaultValue),
    ...(unit === undefined ? {} : { unit }),
  }

  const handle = createPortHandle(meta) as unknown as VanePort<TValue>

  // Carry the handle across the build/app boundary so `restorePort` rebuilds it.
  addFunctionSerializer(handle as unknown as (...args: unknown[]) => unknown, {
    importPath: '@mszr/vane-dux/runtime',
    importName: 'restorePort',
    args: [meta as unknown as Record<string, string>],
  })

  return handle
}

// ─── Kind inference and default serialization ────────────────────────────────

function inferKind(defaultValue: VanePortInput): VanePortKind {
  if (isPort(defaultValue))
    return defaultValue.kind

  if (isHandle(defaultValue))
    return tokenKindOf(defaultValue) === 'value' ? 'string' : 'color'

  if (defaultValue instanceof ColorValue)
    return 'color'

  return typeof defaultValue === 'number' ? 'number' : 'string'
}

/**
 * The default for the meta — the serialized form that survives the
 * build/runtime boundary. Handles and ports become their `var()` reference;
 * color expressions fold through the system's resolver; primitives pass
 * through. Anything else is a diagnostic, not a silent `String()`.
 */
function toMetaDefault(value: VanePortInput, ctx: VanePortContext, file: string): VanePortValue {
  if (isPort(value) || isHandle(value))
    return value.var

  if (value instanceof ContrastValue || (value instanceof ColorValue && containsContrast(value.expr))) {
    throw new VaneError({
      code: 'VANE_PORT_INVALID_DEFAULT',
      message: 'a port default uses legibleOn, which is graph knowledge — the check needs both endpoints at build time',
      file,
      fix: 'define it as a token — onX: ({ color }) => legibleOn(color.x) — and default the port to that token',
    })
  }

  if (value instanceof ColorValue)
    return serializeExpr(value.expr, portResolver(ctx, file))

  if (typeof value === 'string' || typeof value === 'number')
    return value

  throw new VaneError({
    code: 'VANE_PORT_INVALID_DEFAULT',
    message: 'a port default is not a CSS value',
    file,
    fix: 'give it a string, number, token, port, or color expression',
  })
}

/**
 * The port-default resolver: graph edges stay `var()` references with their
 * real traits; `serializeExpr` folds only ref-free subtrees and contrast is
 * rejected above, so `foldRef` is unreachable — kept as a diagnostic, not a
 * silent zero.
 */
function portResolver(ctx: VanePortContext, file: string): VaneResolver {
  return {
    elevation: ctx.elevation,
    refTraits: handle => modeTraits(handle.mode),
    foldRef: (handle) => {
      throw new VaneError({
        code: 'VANE_PORT_INVALID_DEFAULT',
        message: `a port default cannot fold ${handle.path} at build time`,
        file,
      })
    },
    invalidColor: (detail) => {
      throw new VaneError({
        code: 'VANE_PORT_INVALID_DEFAULT',
        message: `a port default cannot resolve: ${detail}`,
        file,
        fix: 'give the color helper a color value or a color token',
      })
    },
  }
}
