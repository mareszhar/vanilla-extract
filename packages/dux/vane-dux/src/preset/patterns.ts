/**
 * Layout patterns ([dux-spec-preset.md §6]): the recurring compositional
 * layouts have names; giving them typed, token-fed implementations removes a
 * whole class of flexbox re-derivation. Each is a parameterized style over
 * your space scale, returning ordinary classes — call them in style modules,
 * where the compiler is listening. Documented with their CSS so they teach.
 */

import type { VaneVarReference } from '../index'

type VaneSpaceValue = string | number | VaneVarReference

export interface VanePatternsConfig<Space extends Record<string, VaneSpaceValue>> {
  /** Your system's bound `css` — patterns compile through it, one class per shape. */
  css: (rule: never, debugId?: string) => string
  /** Your token graph — gaps come from `t.space`, typed by its keys. */
  t: { space: Space }
}

type VaneAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type VaneJustify = 'start' | 'center' | 'end' | 'space-between'

export interface VanePatterns<SpaceKey extends string> {
  /** Vertical flow: `display: flex; flex-direction: column; gap`. */
  stack: (options?: { gap?: SpaceKey, align?: VaneAlign }) => string
  /** One row, no wrapping: `display: flex; align-items: center; gap`. */
  inline: (options?: { gap?: SpaceKey, align?: VaneAlign, justify?: VaneJustify }) => string
  /** A wrapping group: `display: flex; flex-wrap: wrap; gap`. */
  cluster: (options?: { gap?: SpaceKey, align?: VaneAlign, justify?: VaneJustify }) => string
  /** Horizontal centering with a measure: `max-inline-size; margin-inline: auto`. */
  center: (options?: { measure?: string, text?: boolean }) => string
  /**
   * A sidebar beside content that wraps when the content would fall under
   * `contentMin`: the sidebar keeps `sideWidth`; the content gets
   * `flex-grow: 999` and wins the row while it fits.
   */
  sidebar: (options?: { side?: 'start' | 'end', sideWidth?: string, contentMin?: string, gap?: SpaceKey }) => string
  /**
   * Row-to-column at a container threshold, no media query:
   * `flex-basis: calc((threshold - 100%) * 999)` flips every child at once;
   * `limit` forces wrapping past that many items.
   */
  switcher: (options?: { threshold?: string, gap?: SpaceKey, limit?: number }) => string
  /** A cropped media frame: `aspect-ratio` + `object-fit: cover` on img/video. */
  frame: (options?: { ratio?: string }) => string
  /** A horizontal scroller: `overflow-x: auto`, children keep `itemSize`. */
  reel: (options?: { gap?: SpaceKey, itemSize?: string }) => string
}

/**
 * Bind the patterns once, beside your system:
 *
 * ```TS
 * // design/patterns.style.ts
 * export const { stack, cluster, sidebar } = definePatterns({ css, t })
 * ```
 */
export function definePatterns<Space extends Record<string, VaneSpaceValue>>(
  config: VanePatternsConfig<Space>,
): VanePatterns<keyof Space & string> {
  const memo = new Map<string, string>()

  const emit = (name: string, options: object | undefined, rule: Record<string, unknown>): string => {
    const key = `${name}:${JSON.stringify(options ?? {})}`
    const memoized = memo.get(key)

    if (memoized !== undefined)
      return memoized

    const className = config.css(rule as never, name)
    memo.set(key, className)
    return className
  }

  const gapOf = (gap: (keyof Space & string) | undefined): object =>
    gap === undefined ? {} : { gap: config.t.space[gap] }

  return {
    stack: options => emit('stack', options, {
      display: 'flex',
      flexDirection: 'column',
      ...gapOf(options?.gap),
      ...(options?.align === undefined ? {} : { alignItems: options.align }),
    }),

    inline: options => emit('inline', options, {
      display: 'flex',
      alignItems: options?.align ?? 'center',
      ...gapOf(options?.gap),
      ...(options?.justify === undefined ? {} : { justifyContent: options.justify }),
    }),

    cluster: options => emit('cluster', options, {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: options?.align ?? 'center',
      ...(options?.justify === undefined ? {} : { justifyContent: options.justify }),
      ...gapOf(options?.gap),
    }),

    center: options => emit('center', options, {
      boxSizing: 'content-box',
      maxInlineSize: options?.measure ?? '60ch',
      marginInline: 'auto',
      ...(options?.text ? { textAlign: 'center' } : {}),
    }),

    sidebar: (options) => {
      const side = options?.side ?? 'start'
      const sideChild = side === 'start' ? '> :first-child' : '> :last-child'
      const contentChild = side === 'start' ? '> :last-child' : '> :first-child'

      return emit('sidebar', options, {
        display: 'flex',
        flexWrap: 'wrap',
        ...gapOf(options?.gap),
        [sideChild]: { flexBasis: options?.sideWidth ?? '20rem', flexGrow: 1 },
        [contentChild]: { flexBasis: 0, flexGrow: 999, minInlineSize: options?.contentMin ?? '50%' },
      })
    },

    switcher: (options) => {
      const limit = options?.limit

      return emit('switcher', options, {
        'display': 'flex',
        'flexWrap': 'wrap',
        ...gapOf(options?.gap),
        '> *': { flexGrow: 1, flexBasis: `calc((${options?.threshold ?? '30rem'} - 100%) * 999)` },
        ...(limit === undefined
          ? {}
          : { [`& > :nth-last-child(n+${limit + 1}), & > :nth-last-child(n+${limit + 1}) ~ *`]: { flexBasis: '100%' } }),
      })
    },

    frame: options => emit('frame', options, {
      'aspectRatio': options?.ratio ?? '16 / 9',
      'overflow': 'hidden',
      'display': 'flex',
      'justifyContent': 'center',
      'alignItems': 'center',
      '& > img, & > video': { inlineSize: '100%', blockSize: '100%', objectFit: 'cover' },
    }),

    reel: options => emit('reel', options, {
      display: 'flex',
      overflowX: 'auto',
      overscrollBehaviorX: 'contain',
      ...gapOf(options?.gap),
      ...(options?.itemSize === undefined ? {} : { '> *': { flex: `0 0 ${options.itemSize}` } }),
    }),
  }
}
