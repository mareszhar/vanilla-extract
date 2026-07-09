// A container-query card ([dux-spec-css.md §3]): the wrapper declares the
// `card` container; `cardWide` is the system's named condition over it. The
// wrapper is user-resizable so the query is felt, not explained.

export const frame = css({
  containerName: 'card',
  containerType: 'inline-size',
  resize: 'horizontal',
  overflow: 'auto',
  minInlineSize: '16rem',
  maxInlineSize: '100%',
  border: `1px dashed ${t.color.border}`,
  borderRadius: t.radius.md,
  padding: t.space.sm,
})

export const card = css({
  display: 'flex',
  flexDirection: 'column',
  gap: t.space.sm,
  padding: t.space.md,
  background: t.color.surfaceRaised,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.md,
  cardWide: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
})

export const swatch = css({
  flexShrink: 0,
  inlineSize: t.space.xl,
  blockSize: t.space.xl,
  borderRadius: t.radius.sm,
  background: t.color.brandSoft,
  border: `1px solid ${t.color.brand}`,
})

export const cardTitle = css({ ...t.text.title, margin: 0, color: t.color.ink })

export const cardBody = css({ ...t.text.small, margin: 0, color: t.color.inkMuted })
