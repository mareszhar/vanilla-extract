// The page shell — `css` and `t` arrive through the module's auto-imports;
// no import line needed inside style modules either.

export const page = css({
  minBlockSize: '100dvh',
  margin: 0,
  background: t.color.canvas,
  color: t.color.ink,
  fontFamily: t.font.sans,
})

export const content = css({
  maxInlineSize: '40rem',
  margin: '0 auto',
  padding: t.space.lg,
  display: 'grid',
  gap: t.space.md,
})

export const title = css({ ...t.text.display, margin: 0 })

export const lede = css({ ...t.text.body, color: t.color.inkMuted, margin: 0 })

export const row = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: t.space.sm,
  alignItems: 'center',
})
