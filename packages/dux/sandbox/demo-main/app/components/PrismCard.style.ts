import { ds } from '../design/system.style'

const t = ds.t

export const frame = ds.css({
  containerName: 'application',
  containerType: 'inline-size',
  resize: 'horizontal',
  overflow: 'auto',
  minInlineSize: '16rem',
  inlineSize: '100%',
  maxInlineSize: '100%',
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.md,
  padding: t.space.xs,
  background: t.color.surface,
})

export const card = ds.css({
  display: 'flex',
  flexDirection: 'column',
  gap: t.space.sm,
  padding: t.space.md,
  background: t.color.surfaceRaised,
  border: '1px solid transparent',
  borderRadius: t.radius.md,
  previewWide: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
})

export const swatch = ds.css({
  flexShrink: 0,
  inlineSize: t.space.xl,
  blockSize: t.space.xl,
  borderRadius: t.radius.sm,
  background: t.color.brandSoft,
  border: `1px solid ${t.color.brand}`,
})

export const cardTitle = ds.css({ ...t.text.title, margin: 0, color: t.color.ink })

export const cardBody = ds.css({ ...t.text.body, margin: 0, color: t.color.inkMuted })
