import { focusRing } from '@mszr/vanity/preset'
import { ds } from '../design/system.style'

const t = ds.t

export const tabs = ds.anatomy({
  parts: ['root', 'list', 'trigger', 'panel'],
  base: {
    root: { display: 'grid', gap: t.space.sm },
    list: {
      display: 'flex',
      gap: t.space.xs,
      padding: t.space.xs,
      background: t.color.surface,
      borderRadius: t.radius.md,
      inlineSize: 'fit-content',
    },
    trigger: {
      ...t.text.label,
      paddingInline: t.space.md,
      paddingBlock: t.space.xs,
      border: 'none',
      borderRadius: t.radius.sm,
      background: 'transparent',
      color: t.color.inkMuted,
      cursor: 'pointer',
      fontFamily: t.font.family,
      motionOk: { transition: `background ${t.duration.quick} ${t.ease.ui}, color ${t.duration.quick} ${t.ease.ui}` },
      hoverFocus: { color: t.color.ink },
      selected: { background: t.color.brand, color: t.color.onBrand },
      ...focusRing({ color: t.color.brand }),
    },
    panel: { ...t.text.body, color: t.color.inkMuted, margin: 0 },
  },
})
