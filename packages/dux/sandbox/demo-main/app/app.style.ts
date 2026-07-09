// The page shell. `css`, `globalCss`, and `t` are auto-imports here; the
// button import below is a typed cross-file reference — renaming its export
// renames this relationship too.
import { button } from './components/PrismButton.style'

globalCss('html, body', {
  margin: 0,
  minBlockSize: '100dvh',
  background: t.color.canvas,
  color: t.color.ink,
  fontFamily: t.font.sans,
})

export const page = css({
  maxInlineSize: '46rem',
  margin: '0 auto',
  padding: t.space.lg,
  display: 'grid',
  gap: t.space.xl,
})

export const header = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: t.space.md,
})

export const controls = css({
  display: 'flex',
  alignItems: 'center',
  gap: t.space.sm,
  ...t.text.small,
  color: t.color.inkMuted,
})

export const display = css({ ...t.text.display, margin: 0 })

export const section = css({ display: 'grid', gap: t.space.sm })

export const sectionTitle = css({ ...t.text.title, margin: 0 })

export const note = css({ ...t.text.small, color: t.color.inkMuted, margin: 0 })

export const row = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: t.space.sm,
})

// Gauntlet moment 4: theme every nested button once, through its published
// port — no `!important`, no `:deep()`, compiled entirely away.
export const denseRow = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: t.space.xs,
  padding: t.space.sm,
  background: t.color.surface,
  borderRadius: t.radius.md,
  ...button.ports.paddingX.set(t.space.sm),
})

export const slider = css({ inlineSize: '100%' })
