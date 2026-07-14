/** CSS Grid value functions, composed through the shared value protocol. */

import type { VaneCssInput, VaneCssValue } from './types'
import { defineCssOperation } from './extensions'
import { compositeNode, ExpressionValue, inputNode } from './protocol'

export type VaneGridRepeat = number | 'auto-fill' | 'auto-fit'

const CORE_GRID = { id: 'org.vane-dux.core.grid', version: 1 } as const

// Advanced built-in dogfood: multiple typed dependencies and extension-owned
// serialization use exactly the public contract available to packages.
const minmaxOperation = defineCssOperation({
  inputs: ['unknown', 'unknown'],
  output: 'declaration',
  extension: CORE_GRID,
  source: { helper: 'grid.minmax' },
  serialize(context, minimum, maximum) {
    return `minmax(${context.serialize(minimum)}, ${context.serialize(maximum)})`
  },
})

/** A bounded grid track: `minmax(minimum, maximum)`. */
function minmax(minimum: VaneCssInput, maximum: VaneCssInput): VaneCssValue<string, 'declaration'> {
  return minmaxOperation(minimum, maximum)
}

/** Repeat one or more tracks by count or auto-placement mode. */
function repeat(count: VaneGridRepeat, ...tracks: [VaneCssInput, ...VaneCssInput[]]): VaneCssValue<string, 'declaration'> {
  if (typeof count === 'number' && (!Number.isInteger(count) || count < 1))
    throw new RangeError(`[vane] grid.repeat() count must be a positive integer; received ${count}`)

  const parts: Array<string | ReturnType<typeof inputNode>> = [`repeat(${count}, `]
  tracks.forEach((track, index) => {
    if (index > 0)
      parts.push(' ')
    parts.push(inputNode(track))
  })
  parts.push(')')
  return new ExpressionValue(compositeNode({
    type: 'declaration',
    parts,
    source: { helper: 'grid.repeat' },
  }))
}

/** Join track fragments into a `grid-template-columns/rows` value. */
function template(...tracks: [VaneCssInput, ...VaneCssInput[]]): VaneCssValue<string, 'declaration'> {
  const parts: Array<string | ReturnType<typeof inputNode>> = []
  tracks.forEach((track, index) => {
    if (index > 0)
      parts.push(' ')
    parts.push(inputNode(track))
  })
  return new ExpressionValue(compositeNode({ type: 'declaration', parts, source: { helper: 'grid.template' } }))
}

/** Quote rows for `grid-template-areas`, rejecting ambiguous embedded quotes. */
function areas(...rows: [string, ...string[]]): VaneCssValue<string, 'declaration'> {
  for (const row of rows) {
    if (row.includes('"'))
      throw new TypeError('[vane] grid.areas() rows cannot contain double quotes')
  }
  return new ExpressionValue(compositeNode({
    type: 'declaration',
    parts: rows.flatMap((row, index) => [index === 0 ? '' : ' ', `"${row}"`]),
    source: { helper: 'grid.areas' },
  }))
}

/** CSS Grid's value language, grouped because the functions compose together. */
export const grid = Object.freeze({ minmax, repeat, template, areas })
