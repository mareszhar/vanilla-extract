/**
 * Value serialization for rule positions. Token handles interpolate as their
 * `var()` reference — never folded, so a build-time `theme()` scope re-derives
 * them like any other custom property. Color-helper expressions serialize
 * through the same classifier the graph uses ([dux-patterns.md §3]): anonymous
 * static subtrees fold, graph edges stay `var()` references.
 */

import type { VaneDiagnostic } from '../diagnostics'
import type { VaneRuntimeHandle } from '../internal/handle'
import type { VaneResolver } from '../tokens/resolve'
import { VaneError } from '../diagnostics'
import { isHandle } from '../internal/handle'
import { isPort } from '../ports/port'
import { ColorValue, ContrastValue } from '../tokens/color'
import { containsContrast, modeTraits, serializeExpr } from '../tokens/resolve'

export interface VaneValueContext {
  elevation: VaneResolver['elevation']
  file?: string
}

/** Serialize one declared value; `path` names the offending key in diagnostics. */
export function serializeStyleValue(value: unknown, path: string, ctx: VaneValueContext): string | number {
  if (typeof value === 'string' || typeof value === 'number')
    return value

  if (isPort(value) || isHandle(value))
    return value.var

  if (value instanceof ColorValue) {
    if (containsContrast(value.expr))
      throw new VaneError(contrastDiagnostic(path, ctx))

    return serializeExpr(value.expr, valueResolver(path, ctx))
  }

  if (value instanceof ContrastValue)
    throw new VaneError(contrastDiagnostic(path, ctx))

  throw new VaneError({
    code: 'VANE_CSS_INVALID_VALUE',
    message: `${path} is not a CSS value`,
    path,
    file: ctx.file,
    fix: 'give it a string, number, token, or color expression',
  })
}

function contrastDiagnostic(path: string, ctx: VaneValueContext): VaneDiagnostic {
  return {
    code: 'VANE_CSS_INVALID_VALUE',
    message: `${path} uses legibleOn, which is graph knowledge — the check needs both endpoints at build time`,
    path,
    file: ctx.file,
    fix: 'define it as a token — onX: ({ color }) => legibleOn(color.x) — and reference the token here',
  }
}

/**
 * The rule-position resolver. `serializeExpr` folds only ref-free subtrees, so
 * `foldRef` is unreachable; ref traits come from the handle's own mode.
 */
function valueResolver(path: string, ctx: VaneValueContext): VaneResolver {
  return {
    elevation: ctx.elevation,
    refTraits: handle => modeTraits(handle.mode),
    foldRef: (handle: VaneRuntimeHandle) => {
      throw new VaneError({
        code: 'VANE_CSS_INVALID_VALUE',
        message: `${path} cannot fold ${handle.path} at build time`,
        path,
        file: ctx.file,
      })
    },
    invalidColor: (detail) => {
      throw new VaneError({
        code: 'VANE_CSS_INVALID_VALUE',
        message: `${path} cannot resolve: ${detail}`,
        path,
        file: ctx.file,
        fix: 'give the color helper a color value or a color token',
      })
    },
  }
}
