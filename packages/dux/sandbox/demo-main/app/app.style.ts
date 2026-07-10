import { button } from './components/PrismButton.style'

globalCss('*, *::before, *::after', { boxSizing: 'border-box' })

globalCss('html, body', {
  margin: 0,
  minBlockSize: '100dvh',
  background: t.color.canvas,
  color: t.color.ink,
  fontFamily: t.font.sans,
})

globalCss('button, input, select', { fontFamily: t.font.sans })

export const page = css({
  minBlockSize: '100dvh',
  background: `radial-gradient(circle at 50% -10rem, ${t.color.brandSoft}, transparent 34rem), ${t.color.canvas}`,
})

export const shell = css({
  inlineSize: 'min(100% - 2rem, 72rem)',
  marginInline: 'auto',
  paddingBlock: `${t.space.lg} ${t.space.xl}`,
  display: 'grid',
  gap: t.space.xl,
  md: { inlineSize: 'min(100% - 4rem, 72rem)', paddingBlockStart: t.space.xl },
})

export const hero = css({
  display: 'grid',
  gap: t.space.md,
  paddingBlock: t.space.md,
})

export const eyebrow = css({
  ...t.text.small,
  inlineSize: 'fit-content',
  margin: 0,
  padding: `${t.space.xs} ${t.space.sm}`,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.pill,
  background: t.color.surface,
  color: t.color.inkMuted,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
})

export const title = css({
  ...t.text.display,
  maxInlineSize: '17ch',
  margin: 0,
  fontSize: 'clamp(2.5rem, 8vw, 5.75rem)',
  lineHeight: 0.96,
  letterSpacing: '-0.055em',
})

export const intro = css({
  ...t.text.body,
  maxInlineSize: '62ch',
  margin: 0,
  color: t.color.inkMuted,
  fontSize: '1.0625rem',
})

export const toolbar = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'end',
  gap: t.space.sm,
})

export const field = css({
  display: 'grid',
  gap: t.space.xs,
  minInlineSize: '9rem',
})

export const fieldLabel = css({
  ...t.text.small,
  color: t.color.inkMuted,
  fontWeight: 600,
})

export const select = css({
  minBlockSize: '2.75rem',
  paddingInline: t.space.sm,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.sm,
  background: t.color.surfaceRaised,
  color: t.color.ink,
  cursor: 'pointer',
  focusVisible: { outline: `2px solid ${t.color.brand}`, outlineOffset: '2px' },
})

export const colorInput = css({
  inlineSize: '3.25rem',
  blockSize: '2.75rem',
  padding: t.space.xs,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.sm,
  background: t.color.surfaceRaised,
  cursor: 'pointer',
  focusVisible: { outline: `2px solid ${t.color.brand}`, outlineOffset: '2px' },
})

export const workbench = css({
  display: 'grid',
  overflow: 'hidden',
  border: `1px solid ${t.color.border}`,
  borderRadius: '18px',
  background: t.color.surface,
  md: { gridTemplateColumns: '17rem minmax(0, 1fr)' },
})

export const panel = css({
  display: 'grid',
  alignContent: 'start',
  gap: t.space.md,
  padding: t.space.md,
  borderBlockEnd: `1px solid ${t.color.border}`,
  background: t.color.surfaceRaised,
  md: { borderBlockEnd: 'none', borderInlineEnd: `1px solid ${t.color.border}` },
})

export const panelHeader = css({ display: 'grid', gap: t.space.xs })

export const kicker = css({
  ...t.text.small,
  margin: 0,
  color: t.color.brand,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
})

export const panelTitle = css({ ...t.text.title, margin: 0 })

export const panelCopy = css({ ...t.text.small, margin: 0, color: t.color.inkMuted })

export const controlStack = css({ display: 'grid', gap: t.space.md })

export const checkbox = css({
  'display': 'flex',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'gap': t.space.sm,
  'minBlockSize': '2.75rem',
  'paddingInline': t.space.sm,
  'border': `1px solid ${t.color.border}`,
  'borderRadius': t.radius.sm,
  'background': t.color.surface,
  'cursor': 'pointer',
  '& input': { inlineSize: '1.1rem', blockSize: '1.1rem', accentColor: t.color.brand },
})

export const slider = css({ inlineSize: '100%', accentColor: t.color.brand, cursor: 'pointer' })

export const preview = css({
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  minInlineSize: 0,
})

export const previewHeader = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: t.space.sm,
  padding: `${t.space.sm} ${t.space.md}`,
  borderBlockEnd: `1px solid ${t.color.border}`,
  color: t.color.inkMuted,
})

export const live = css({
  ...t.text.small,
  'display': 'inline-flex',
  'alignItems': 'center',
  'gap': t.space.xs,
  'fontWeight': 600,
  '&::before': {
    content: '',
    inlineSize: '0.5rem',
    blockSize: '0.5rem',
    borderRadius: t.radius.pill,
    background: t.color.brand,
  },
})

export const previewBody = css({
  display: 'grid',
  alignContent: 'center',
  gap: t.space.lg,
  minBlockSize: '28rem',
  padding: t.space.md,
  md: { padding: t.space.lg },
})

export const actionRow = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: t.space.sm,
})

export const counter = css({ ...t.text.small, color: t.color.inkMuted })

export const progressGroup = css({ display: 'grid', gap: t.space.sm })

export const progressHead = css({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: t.space.sm,
})

export const progressValue = css({ ...t.text.small, color: t.color.inkMuted, fontVariantNumeric: 'tabular-nums' })

export const section = css({ display: 'grid', gap: t.space.md })

export const sectionHeader = css({
  display: 'grid',
  gap: t.space.xs,
  maxInlineSize: '42rem',
})

export const sectionTitle = css({ ...t.text.title, margin: 0 })

export const sectionCopy = css({ ...t.text.small, color: t.color.inkMuted, margin: 0 })

export const featureGrid = css({
  display: 'grid',
  gap: t.space.sm,
  md: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
})

export const feature = css({
  display: 'grid',
  alignContent: 'start',
  gap: t.space.sm,
  minBlockSize: '11rem',
  padding: t.space.md,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.md,
  background: t.color.surface,
})

export const featureNumber = css({ ...t.text.small, color: t.color.brand, fontWeight: 700 })

export const featureTitle = css({ ...t.text.body, margin: 0, fontWeight: 650 })

export const featureCopy = css({ ...t.text.small, margin: 0, color: t.color.inkMuted })

export const anatomy = css({
  display: 'grid',
  gap: t.space.md,
  padding: t.space.md,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.md,
  background: t.color.surface,
  md: { gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end' },
})

// One parent declaration themes every nested button through the recipe's
// published port. The relationship is an import, not selector archaeology.
export const compactActions = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: t.space.xs,
  ...button.ports.paddingX.set(t.space.sm),
})
