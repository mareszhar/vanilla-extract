/** The spec's progress bar ([dux-spec-ports.md §1]), built by a real bundler. */

import { css, port, t } from './system.style'

export const fraction = port(0)
export const tint = port(t.color.brand)

export const track = css({
  background: t.color.surface,
  blockSize: t.space.sm,
}, 'track')

export const fill = css({
  inlineSize: `calc(${fraction} * 100%)`,
  background: tint,
  blockSize: '100%',
}, 'fill')
