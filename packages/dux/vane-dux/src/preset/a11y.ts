/**
 * A11y helpers ([dux-spec-preset.md §4]): the most common accessibility moves
 * as single composable declarations — plain fragments, spreadable into any
 * rule, overridable key by key, deletable. Forced-colors styling needs no
 * helper: `forcedColors` is already a preset condition, a bare key away.
 */

import type { VaneTokenInput, VaneVarReference } from '@mszr/vane-dux'

/** A colorish declaration value: a CSS literal or a token handle. */
type VaneA11yColor = string | VaneVarReference | VaneTokenInput

export interface VaneFocusRingOptions {
  /** The ring color; `currentColor` by default. Token-driven: pass `t.color.brand`. */
  color?: VaneA11yColor
  width?: string
  offset?: string
}

/**
 * A `:focus-visible`-scoped ring — visible exactly when the platform says
 * focus should be visible, never on pointer clicks.
 *
 * ```TS
 * export const input = css({ ...focusRing({ color: t.color.brand }) })
 * ```
 */
export function focusRing(options: VaneFocusRingOptions = {}) {
  const color = options.color === undefined
    ? 'currentColor'
    : typeof options.color === 'string'
      ? options.color
      : '$var' in options.color
        ? options.color.$var()
        : options.color.var

  return {
    focusVisible: {
      outline: `${options.width ?? '2px'} solid ${color}`,
      outlineOffset: options.offset ?? '2px',
    },
  } as const
}

/**
 * Visually hidden, still read by assistive technology — the settled pattern,
 * one spread instead of eight remembered declarations.
 */
export function visuallyHidden() {
  return {
    position: 'absolute',
    inlineSize: '1px',
    blockSize: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    border: 0,
  } as const
}

/**
 * A minimum hit target — WCAG's 44px, or your own. Content keeps its visual
 * size; the target grows.
 */
export function minTarget(px = 44) {
  return {
    minInlineSize: `${px}px`,
    minBlockSize: `${px}px`,
  } as const
}
