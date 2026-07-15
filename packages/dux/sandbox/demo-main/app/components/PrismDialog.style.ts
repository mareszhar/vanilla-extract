import { ds } from '../design/system.style'

const t = ds.t

const fade = ds.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
})

const rise = ds.keyframes({
  from: { opacity: 0, transform: 'translateY(12px) scale(0.98)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' },
})

export const dialog = ds.anatomy({
  parts: ['backdrop', 'positioner', 'content', 'title', 'close'],
  base: {
    backdrop: {
      position: 'fixed',
      inset: 0,
      background: t.color.scrim,
      open: { motionOk: { animation: `${fade} ${t.duration.quick} ${t.ease.ui}` } },
    },
    positioner: {
      position: 'fixed',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      padding: t.space.md,
    },
    content: {
      display: 'grid',
      gap: t.space.sm,
      inlineSize: 'min(100%, 26rem)',
      padding: t.space.lg,
      background: t.color.overlay,
      border: `1px solid ${t.color.border}`,
      borderRadius: t.radius.md,
      open: { motionOk: { animation: `${rise} ${t.duration.deliberate} ${t.ease.ui}` } },
    },
    title: { ...t.text.title, margin: 0 },
    close: { justifySelf: 'end' },
  },
  variants: {
    size: {
      sm: { content: { inlineSize: 'min(100%, 22rem)' } },
      md: {},
    },
  },
  defaults: { size: 'md' },
})
