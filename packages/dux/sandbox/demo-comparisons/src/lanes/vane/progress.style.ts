import { css, port, t } from './system.style'

/** The typed runtime boundary — declared, defaulted, named by its export. */
export const fraction = port(0)

export const track = css({
  background: t.color.surface,
  blockSize: t.space.sm,
  borderRadius: t.radius.pill,
  overflow: 'hidden',
})

export const fill = css({
  inlineSize: `calc(${fraction} * 100%)`,
  blockSize: '100%',
  background: t.color.brand,
  motionOk: { transition: `inline-size ${t.duration.normal} ease` },
})
