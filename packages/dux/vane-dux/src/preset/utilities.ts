/** Reusable declaration fragments; deliberately separate from layout patterns. */

import type { VaneCssInput } from '../values/types'

export function square(size: VaneCssInput) {
  return { inlineSize: size, blockSize: size } as const
}

export function circle(size: VaneCssInput) {
  return { ...square(size), borderRadius: '50%' } as const
}

export function truncate(lines = 1) {
  if (!Number.isInteger(lines) || lines < 1)
    throw new RangeError(`[vane] truncate() lines must be a positive integer; received ${lines}`)
  if (lines === 1) {
    return {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    } as const
  }
  return {
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
  } as const
}
