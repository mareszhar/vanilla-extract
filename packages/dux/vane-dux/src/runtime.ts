/**
 * The live plane: the few hundred bytes that run in the browser. Runtime code
 * writes custom-property values and attributes — it never constructs CSS rules
 * ([dux-patterns.md §1]).
 */

import type { VaneRuntimeHandle } from './internal/handle'
import type { VanePort, VanePortMeta } from './ports/types'
import type { VaneLiveOverrides } from './tokens/types'
import { createHandle, isHandle } from './internal/handle'
import { createPortHandle } from './ports/handle'
import { ports } from './ports/ports'

export type { VaneLiveOverrides }
export type { VanePort, VanePortMeta, VanePortStyle, VanePortValue } from './ports/types'

export type VaneRuntimeValue = string | number
export type VaneRuntimeStyle = Record<`--${string}`, VaneRuntimeValue>

/** Anything with inline styles — an HTML or SVG element. */
export type VaneThemeTarget = ElementCSSInlineStyle

/**
 * Apply a runtime theme: write live-token values and let every downstream
 * surface, hover, and pairing re-derive in the cascade — zero JS recomputation
 * ([dux-spec-tokens.md §7]). Accepts **live tokens only**; a static, scheme, or
 * derived key is a type error at that key, and a JS caller gets the same
 * honesty as a console warning.
 */
export function applyTheme<T extends object>(
  element: VaneThemeTarget,
  tokens: T,
  overrides: VaneLiveOverrides<T>,
): void {
  writeOverrides(element, tokens, overrides, [])
}

function writeOverrides(element: VaneThemeTarget, tokens: object, overrides: object, path: string[]): void {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined)
      continue

    const target = (tokens as Record<string, unknown>)[key]
    const keyPath = [...path, key].join('.')

    if (target === undefined) {
      warn(`${keyPath} is not a token in this graph — nothing was applied for it`)
      continue
    }

    if (isHandle(target)) {
      if (target.mode !== 'live') {
        warn(`${keyPath} is ${describeMode(target.mode)} — applyTheme accepts live tokens only. Mark it .live(), or theme an input it derives from.`)
        continue
      }

      element.style.setProperty(target.name, String(value))
      continue
    }

    if (typeof value === 'object' && value !== null)
      writeOverrides(element, target as object, value, [...path, key])
    else
      warn(`${keyPath} is a token group — pass its live tokens individually`)
  }
}

function describeMode(mode: VaneRuntimeHandle['mode']): string {
  return mode === 'derived' ? 'derived — it re-derives from its inputs' : `${mode}, decided at build`
}

function warn(message: string): void {
  console.warn(`[vane] ${message}`)
}

/** The scheme axis, forced: sets `data-scheme`, which the emitted scopes pin to `color-scheme`. */
export function setScheme(element: HTMLElement, scheme: 'light' | 'dark' | null): void {
  if (scheme === null) {
    delete element.dataset.scheme
    return
  }

  element.dataset.scheme = scheme
}

/** Merge port/style fragments, skipping falsy entries. Re-exported from core. */
export { ports }

/**
 * Restores a token handle when a style module's exports are serialized for app
 * code. Generated import target — not for hand-written code.
 */
export function restoreToken(meta: Parameters<typeof createHandle>[0]): VaneRuntimeHandle {
  return createHandle(meta)
}

/**
 * Restores a port handle when a style module's exports are serialized for app
 * code. Generated import target — not for hand-written code.
 */
export function restorePort(meta: VanePortMeta): VanePort {
  return createPortHandle(meta)
}
