/** CSS Grid value functions: composable tracks instead of punctuation strings. */

import type { VaneCssInput, VaneCssValue } from './types'
import { cssText, CssValue } from './types'

export type VaneGridRepeat = number | 'auto-fill' | 'auto-fit'

class GridValue extends CssValue {
  constructor(readonly css: string) {
    super()
  }
}

/** A bounded grid track: `minmax(minimum, maximum)`. */
function minmax(minimum: VaneCssInput, maximum: VaneCssInput): VaneCssValue {
  return new GridValue(`minmax(${cssText(minimum)}, ${cssText(maximum)})`)
}

/** Repeat one or more tracks by count or auto-placement mode. */
function repeat(count: VaneGridRepeat, ...tracks: [VaneCssInput, ...VaneCssInput[]]): VaneCssValue {
  if (typeof count === 'number' && (!Number.isInteger(count) || count < 1))
    throw new RangeError(`[vane] grid.repeat() count must be a positive integer; received ${count}`)

  return new GridValue(`repeat(${count}, ${tracks.map(cssText).join(' ')})`)
}

/** Join track fragments into a `grid-template-columns/rows` value. */
function template(...tracks: [VaneCssInput, ...VaneCssInput[]]): VaneCssValue {
  return new GridValue(tracks.map(cssText).join(' '))
}

/** Quote rows for `grid-template-areas`, rejecting ambiguous embedded quotes. */
function areas(...rows: [string, ...string[]]): VaneCssValue {
  for (const row of rows) {
    if (row.includes('"'))
      throw new TypeError('[vane] grid.areas() rows cannot contain double quotes')
  }

  return new GridValue(rows.map(row => `"${row}"`).join(' '))
}

/** CSS Grid's value language, grouped because the functions compose together. */
export const grid = { minmax, repeat, template, areas } as const
