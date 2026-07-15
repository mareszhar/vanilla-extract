import { ds } from '../design/system.style'

const t = ds.t

export const fraction = ds.port(0)
export const tint = ds.port(t.color.brand)

export const track = ds.css({
  background: t.color.surface,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.pill,
  blockSize: t.space.sm,
  overflow: 'hidden',
})

export const fill = ds.css({
  inlineSize: `calc(${fraction} * 100%)`,
  background: tint,
  blockSize: '100%',
  motionOk: { transition: `inline-size ${t.duration.quick} ${t.ease.ui}` },
})
