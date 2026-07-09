// The spec's progress bar ([dux-spec-ports.md §1]): the runtime boundary is
// two typed ports; everything else compiles away.

export const fraction = port(0)
export const tint = port(t.color.brand)

export const track = css({
  background: t.color.surface,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.pill,
  blockSize: t.space.sm,
  overflow: 'hidden',
})

export const fill = css({
  inlineSize: `calc(${fraction} * 100%)`,
  background: tint,
  blockSize: '100%',
  motionOk: { transition: 'inline-size 200ms ease' },
})
