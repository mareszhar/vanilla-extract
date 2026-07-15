import { definePatterns, focusRing, visuallyHidden } from '@mszr/vane-dux/preset'
import { ds } from './design/system.style'

const t = ds.t
const patterns = definePatterns({ css: ds.css, t })
const chartAccent = ds.customProperty('--prism-chart-accent', { type: 'color' })
const studioAtoms = ds.defineAtoms({
  properties: {
    color: { brand: t.color.brand, muted: t.color.inkMuted },
    fontWeight: [650, 750],
  },
}, 'studio-atoms')

const editorialFace = ds.fontFace({
  src: 'local("Iowan Old Style"), local("Palatino Linotype"), local("Book Antiqua")',
  fontDisplay: 'swap',
  fontStyle: 'normal',
  fontWeight: '400 800',
}, 'Prism editorial')

const grow = ds.keyframes({
  from: { transform: 'scaleY(0.08)', opacity: 0.35 },
  to: { transform: 'scaleY(1)', opacity: 1 },
}, 'grow')

ds.globalCss('*, *::before, *::after', { boxSizing: 'border-box' })
ds.globalCss('html', { minBlockSize: '100%', background: '#0c0c10' })
ds.globalCss('body', { margin: 0, minBlockSize: '100%', minInlineSize: '20rem' })
ds.globalCss('button, input, select', { font: 'inherit' })
ds.globalCss('button', { color: 'inherit' })
ds.globalCss('::selection', { background: t.color.brandMuted, color: t.color.ink })

export const page = ds.css({
  minBlockSize: '100dvh',
  background: t.color.canvas,
  color: t.color.ink,
  colorScheme: 'light dark',
  fontFamily: t.font.family,
  fontSynthesis: 'none',
  dark: { colorScheme: 'dark' },
  light: { colorScheme: 'light' },
  motionReduce: { scrollBehavior: 'auto' },
}, 'studio-page')

export const skipLink = ds.css({
  position: 'fixed',
  insetBlockStart: t.space.sm,
  insetInlineStart: t.space.sm,
  zIndex: 100,
  padding: `${t.space.xs} ${t.space.sm}`,
  borderRadius: t.radius.sm,
  background: t.color.brand,
  color: t.color.onBrand,
  transform: 'translateY(-180%)',
  focusVisible: { transform: 'translateY(0)' },
})

export const studio = ds.css({
  display: 'grid',
  minBlockSize: '100dvh',
  lg: { gridTemplateColumns: '18.5rem minmax(0, 1fr)' },
})

export const rail = ds.css({
  position: 'relative',
  zIndex: 4,
  display: 'grid',
  alignContent: 'start',
  gap: t.space.lg,
  padding: ds.bem(5),
  borderBlockEnd: `1px solid ${t.color.border}`,
  background: t.color.surface,
  lg: {
    position: 'sticky',
    insetBlockStart: 0,
    blockSize: '100dvh',
    overflowY: 'auto',
    borderBlockEnd: 'none',
    borderInlineEnd: `1px solid ${t.color.border}`,
  },
})

export const brand = ds.css({
  display: 'flex',
  alignItems: 'center',
  gap: t.space.sm,
  minInlineSize: 0,
})

export const brandMark = ds.css({
  display: 'grid',
  placeItems: 'center',
  inlineSize: '2.25rem',
  blockSize: '2.25rem',
  flex: '0 0 auto',
  borderRadius: t.radius.md,
  background: `linear-gradient(145deg, ${t.color.brand}, ${t.color.brandHover})`,
  color: t.color.onBrand,
  boxShadow: `0 0 0 1px ${t.color.brandMuted}, 0 8px 24px ${t.color.brandSoft}`,
  fontWeight: 800,
})

export const brandText = ds.css({ display: 'grid', minInlineSize: 0 })
export const brandName = ds.css({ ...t.text.title, margin: 0, letterSpacing: '-0.035em' })
export const brandTagline = ds.css({ ...t.text.detail, margin: 0, color: t.color.inkMuted })

export const controlsHeading = ds.css({
  ...t.text.detail,
  margin: 0,
  color: t.color.inkMuted,
  letterSpacing: '0.11em',
  textTransform: 'uppercase',
})

export const controlStack = patterns.stack({ gap: 'md' })

export const controlGroup = ds.css({ display: 'grid', gap: t.space.xs })
export const controlLabel = ds.css({
  ...t.text.label,
  display: 'flex',
  justifyContent: 'space-between',
  gap: t.space.sm,
  color: t.color.inkMuted,
})
export const controlValue = ds.css({ color: t.color.ink, fontVariantNumeric: 'tabular-nums' })

export const select = ds.css({
  inlineSize: '100%',
  minBlockSize: '2.5rem',
  paddingInline: t.space.sm,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.sm,
  background: t.color.canvas,
  color: t.color.ink,
  cursor: 'pointer',
  ...focusRing({ color: t.color.brand }),
})

export const range = ds.css({
  inlineSize: '100%',
  minBlockSize: '1.5rem',
  margin: 0,
  accentColor: t.color.brand,
  cursor: 'pointer',
  ...focusRing({ color: t.color.brand }),
})

export const hueRamp = ds.css({
  blockSize: '0.45rem',
  marginBlockStart: '-0.35rem',
  borderRadius: t.radius.pill,
  background: 'linear-gradient(90deg, oklch(62% .2 0), oklch(62% .2 60), oklch(62% .2 120), oklch(62% .2 180), oklch(62% .2 240), oklch(62% .2 300), oklch(62% .2 360))',
  pointerEvents: 'none',
})

export const segmented = ds.css({
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  gap: t.space['2xs'],
  padding: t.space['2xs'],
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.sm,
  background: t.color.canvas,
})

export const segment = ds.css({
  minBlockSize: '2.15rem',
  paddingInline: t.space.xs,
  border: 0,
  borderRadius: t.radius.sm,
  background: 'transparent',
  color: t.color.inkMuted,
  cursor: 'pointer',
  transition: `background ${t.duration.quick} ${t.ease.ui}, color ${t.duration.quick} ${t.ease.ui}, transform ${t.duration.quick} ${t.ease.ui}`,
  hover: { color: t.color.ink },
  selected: { background: t.color.brandSoft, color: t.color.brand, fontWeight: 720 },
  active: { transform: 'scale(0.97)' },
  ...focusRing({ color: t.color.brand }),
})

export const railFooter = ds.css({
  display: 'grid',
  gap: t.space.xs,
  paddingBlockStart: t.space.md,
  borderBlockStart: `1px solid ${t.color.border}`,
})

export const resetButton = ds.css({
  minBlockSize: '2.5rem',
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.sm,
  background: t.color.canvas,
  cursor: 'pointer',
  hover: { borderColor: t.color.brand, color: t.color.brand },
  ...focusRing({ color: t.color.brand }),
})

export const railNote = ds.css({ ...t.text.detail, margin: 0, color: t.color.inkMuted })

export const workspace = ds.css({ minInlineSize: 0, overflow: 'clip' })

export const topbar = ds.css({
  position: 'sticky',
  insetBlockStart: 0,
  zIndex: 3,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: t.space.md,
  minBlockSize: '4.25rem',
  paddingInline: t.space.md,
  borderBlockEnd: `1px solid ${t.color.border}`,
  background: `color-mix(in oklab, ${t.color.canvas} 82%, transparent)`,
  supportsBackdrop: { backdropFilter: 'blur(18px) saturate(1.3)' },
  md: { paddingInline: t.space.xl },
})

export const breadcrumb = ds.css({ ...t.text.label, color: t.color.inkMuted })
export const breadcrumbStrong = ds.css({ color: t.color.ink })
export const topActions = patterns.cluster({ gap: 'xs' })

export const statusPill = ds.css({
  ...t.text.detail,
  'display': 'inline-flex',
  'alignItems': 'center',
  'gap': t.space.xs,
  'padding': `${t.space['2xs']} ${t.space.xs}`,
  'border': `1px solid ${t.color.border}`,
  'borderRadius': t.radius.pill,
  'background': t.color.surface,
  'color': t.color.inkMuted,
  '&::before': {
    content: '',
    inlineSize: '0.45rem',
    blockSize: '0.45rem',
    borderRadius: '50%',
    background: t.color.brand,
    boxShadow: `0 0 0 4px ${t.color.brandSoft}`,
  },
})
export const statusTone = studioAtoms({ color: 'brand', fontWeight: 650 })

export const canvasWrap = ds.css({
  containerName: 'application',
  containerType: 'inline-size',
  padding: t.space.md,
  md: { padding: t.space.xl },
})

export const application = ds.css({
  display: 'grid',
  minInlineSize: 0,
  overflow: 'hidden',
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.lg,
  background: t.color.application,
  boxShadow: t.shadow.panel,
  transition: `border-radius ${t.duration.deliberate} ${t.ease.ui}, box-shadow ${t.duration.deliberate} ${t.ease.ui}, background ${t.duration.deliberate} ${t.ease.ui}`,
  previewWide: { gridTemplateColumns: '12rem minmax(0, 1fr)' },
})

export const appNav = ds.css({
  display: 'none',
  alignContent: 'start',
  gap: t.space.sm,
  padding: t.space.md,
  borderInlineEnd: `1px solid ${t.color.border}`,
  background: t.color.surface,
  previewWide: { display: 'grid' },
})

export const appNavItem = ds.css({
  ...t.text.label,
  display: 'flex',
  alignItems: 'center',
  gap: t.space.sm,
  minBlockSize: '2.35rem',
  paddingInline: t.space.sm,
  border: 0,
  borderRadius: t.radius.sm,
  background: 'transparent',
  color: t.color.inkMuted,
  textAlign: 'start',
  cursor: 'pointer',
  selected: { background: t.color.brandSoft, color: t.color.brand },
  hover: { color: t.color.ink },
  ...focusRing({ color: t.color.brand }),
})

export const appMain = ds.css({ minInlineSize: 0 })

export const appHeader = ds.css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: t.space.md,
  padding: t.space.md,
  borderBlockEnd: `1px solid ${t.color.border}`,
  previewRoomy: { paddingInline: t.space.lg },
})

export const appTitleWrap = ds.css({ display: 'grid', gap: t.space['2xs'] })
export const appEyebrow = ds.css({ ...t.text.detail, margin: 0, color: t.color.brand, letterSpacing: '0.08em', textTransform: 'uppercase' })
export const appTitle = ds.css({ ...t.text.title, margin: 0, letterSpacing: '-0.03em' })

export const dashboard = ds.css({
  display: 'grid',
  gap: t.space.md,
  padding: t.space.md,
  previewRoomy: { gridTemplateColumns: 'minmax(0, 1.65fr) minmax(16rem, .75fr)', padding: t.space.lg },
})

export const dashboardMain = ds.css({ display: 'grid', alignContent: 'start', gap: t.space.md, minInlineSize: 0 })
export const dashboardSide = ds.css({ display: 'grid', alignContent: 'start', gap: t.space.md, minInlineSize: 0 })

export const metricGrid = ds.css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: t.space.sm,
  previewRoomy: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
})

export const metric = ds.css({
  display: 'grid',
  gap: t.space.xs,
  minInlineSize: 0,
  padding: t.space.md,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.md,
  background: t.color.surface,
  boxShadow: t.shadow.card,
  transition: `transform ${t.duration.quick} ${t.ease.ui}, border-color ${t.duration.quick} ${t.ease.ui}`,
  hover: { transform: 'translateY(-2px)', borderColor: t.color.brandMuted },
})

export const metricFeatured = ds.css({ background: t.color.brandSoft, borderColor: t.color.brandMuted })
export const metricLabel = ds.css({ ...t.text.detail, color: t.color.inkMuted })
export const metricValue = ds.css({ fontSize: 'clamp(1.25rem, 4cqi, 1.9rem)', lineHeight: 1, fontWeight: 780, letterSpacing: '-0.045em' })
export const metricDelta = ds.css({ ...t.text.detail, color: t.color.brand })

export const panel = ds.css({
  display: 'grid',
  gap: t.space.md,
  minInlineSize: 0,
  padding: t.space.md,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.md,
  background: t.color.surface,
  boxShadow: t.shadow.card,
})

export const panelHead = ds.css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: t.space.sm })
export const panelTitle = ds.css({ ...t.text.label, margin: 0, color: t.color.ink })
export const panelMeta = ds.css({ ...t.text.detail, color: t.color.inkMuted })

export const chart = ds.css({
  position: 'relative',
  display: 'grid',
  alignItems: 'end',
  minBlockSize: '11rem',
  overflow: 'hidden',
  borderRadius: t.radius.sm,
  background: `linear-gradient(${t.color.border} 1px, transparent 1px) 0 0 / 100% 25%`,
})

export const chartBars = ds.css({
  display: 'grid',
  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
  alignItems: 'end',
  gap: 'clamp(0.2rem, 1.2cqi, 0.55rem)',
  blockSize: '100%',
  padding: `${t.space.md} ${t.space.xs} 0`,
})

export const chartBar = ds.css({
  minBlockSize: '8%',
  borderRadius: `${t.radius.sm} ${t.radius.sm} 0 0`,
  background: `linear-gradient(to top, ${t.color.brandMuted}, ${chartAccent.$var(t.color.brand)})`,
  transformOrigin: 'bottom',
  motionOk: { animation: `${grow} ${t.duration.deliberate} ${t.ease.ui} both` },
})

export const chartLegend = patterns.cluster({ gap: 'sm' })
export const legendItem = ds.css({ ...t.text.detail, display: 'inline-flex', alignItems: 'center', gap: t.space.xs, color: t.color.inkMuted })

export const table = ds.css({ display: 'grid', gap: t.space['2xs'] })
export const tableRow = ds.css({
  'display': 'grid',
  'gridTemplateColumns': 'minmax(7rem, 1fr) auto auto',
  'alignItems': 'center',
  'gap': t.space.sm,
  'minBlockSize': '2.75rem',
  'paddingInline': t.space.xs,
  'borderBlockEnd': `1px solid ${t.color.border}`,
  '&:last-child': { borderBlockEnd: 0 },
})
export const person = ds.css({ display: 'flex', alignItems: 'center', gap: t.space.sm, minInlineSize: 0 })
export const avatar = ds.css({ display: 'grid', placeItems: 'center', inlineSize: '1.8rem', blockSize: '1.8rem', flex: '0 0 auto', borderRadius: '50%', background: t.color.brandSoft, color: t.color.brand, fontSize: '0.64rem', fontWeight: 760 })
export const personText = ds.css({ display: 'grid', minInlineSize: 0 })
export const personName = ds.css({ ...t.text.label, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
export const personEmail = ds.css({ ...t.text.detail, overflow: 'hidden', color: t.color.inkMuted, textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
export const amount = ds.css({ ...t.text.label, fontVariantNumeric: 'tabular-nums' })

export const badge = ds.css({
  ...t.text.detail,
  padding: `${t.space['2xs']} ${t.space.xs}`,
  borderRadius: t.radius.pill,
  background: t.color.brandSoft,
  color: t.color.brand,
  whiteSpace: 'nowrap',
})

export const activity = ds.css({ display: 'grid', gap: t.space.md })
export const activityItem = ds.css({ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: t.space.sm })
export const activityDot = ds.css({ inlineSize: '0.58rem', blockSize: '0.58rem', marginBlockStart: '0.26rem', borderRadius: '50%', background: t.color.brand, boxShadow: `0 0 0 4px ${t.color.brandSoft}` })
export const activityCopy = ds.css({ ...t.text.detail, margin: 0, color: t.color.inkMuted })
export const activityStrong = ds.css({ color: t.color.ink, fontWeight: 700 })

export const inspector = ds.css({
  display: 'grid',
  gap: t.space.md,
  marginBlockStart: t.space.xl,
  padding: t.space.md,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.lg,
  background: t.color.surface,
  md: { padding: t.space.lg },
})

export const inspectorHead = ds.css({ display: 'flex', flexWrap: 'wrap', alignItems: 'end', justifyContent: 'space-between', gap: t.space.md })
export const inspectorTitle = ds.css({ fontFamily: editorialFace, fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', lineHeight: 1, margin: 0, letterSpacing: '-0.045em' })
export const inspectorCopy = ds.css({ ...t.text.body, maxInlineSize: '62ch', margin: 0, color: t.color.inkMuted })
export const provenanceGrid = ds.css({ display: 'grid', gap: t.space.sm, md: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' } })
export const provenanceCard = ds.css({ display: 'grid', gap: t.space.xs, padding: t.space.md, border: `1px solid ${t.color.border}`, borderRadius: t.radius.md, background: t.color.canvas })
export const provenanceLabel = ds.css({ ...t.text.detail, color: t.color.brand, letterSpacing: '0.08em', textTransform: 'uppercase' })
export const provenanceValue = ds.css({ ...t.text.label, overflowWrap: 'anywhere' })
export const provenanceCode = ds.css({ fontFamily: t.font.mono, fontSize: '0.74rem', color: t.color.inkMuted, overflowWrap: 'anywhere' })

/** Parsed, scoped CSS remains available for syntax that reads better as CSS. */
export const rawReach = ds.css.raw`
  @starting-style {
    & { opacity: 0; transform: translateY(10px); }
  }
  & code { text-wrap: pretty; }
`

export const srOnly = ds.css(visuallyHidden())

export const runtimeFacts = (() => {
  const brand = ds.explain(t.color.brand)
  const surface = ds.explain(t.color.application)
  const shadow = ds.explain(t.shadow.panel)

  return Object.freeze([
    { label: 'Live palette seed', path: brand.path.join('.'), type: brand.type, projection: brand.name, detail: `${brand.dependencies.length} dependencies · ${brand.runtime?.addresses.length ?? 0} runtime address` },
    { label: 'Elevation axis', path: surface.path.join('.'), type: surface.type, projection: surface.name, detail: `${surface.branches.length} authored branches · ${surface.declarations.length} declarations` },
    { label: 'Sparse shadow', path: shadow.path.join('.'), type: shadow.type, projection: shadow.name, detail: `${shadow.branches.length} branches across scheme + density` },
  ])
})()

export const studioRuntime = ds.runtime
export const studioRuntimeProps = ds.runtimeProps
export const studioTokens = ds.t
export const chartAccentName = chartAccent.$name
