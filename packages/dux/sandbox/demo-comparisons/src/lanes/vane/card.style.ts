import { css, t } from './system.style'

export const root = css({
  display: 'grid',
  gap: t.space.sm,
  justifyItems: 'start',
  padding: t.space.md,
  background: t.color.surface,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.md,
})

export const title = css({
  margin: 0,
  fontSize: '1.375rem',
  lineHeight: 1.25,
  fontWeight: 600,
  color: t.color.ink,
})

export const body = css({
  margin: 0,
  fontSize: '0.875rem',
  color: t.color.inkMuted,
})
