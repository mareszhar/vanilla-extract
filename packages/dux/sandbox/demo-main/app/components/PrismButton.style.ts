import { focusRing } from '@mszr/vanity/preset'
import { ds } from '../design/system.style'

const t = ds.t

const paddingX = ds.port(t.space.md)

export const button = ds.recipe({
  ports: { paddingX },
  base: {
    ...t.text.body,
    display: 'inline-flex',
    alignItems: 'center',
    gap: t.space.xs,
    paddingInline: paddingX,
    paddingBlock: t.space.sm,
    border: 'none',
    borderRadius: t.radius.sm,
    fontFamily: t.font.family,
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 1px 0 oklch(0 0 0 / 0.06)',
    motionOk: { transition: `background ${t.duration.quick} ${t.ease.ui}, border-color ${t.duration.quick} ${t.ease.ui}, transform ${t.duration.quick} ${t.ease.ui}` },
    ...focusRing({ color: t.color.brand }),
    active: { transform: 'translateY(1px)' },
    disabled: { opacity: 0.5, cursor: 'not-allowed' },
  },
  variants: {
    intent: {
      brand: {
        background: t.color.brand,
        color: t.color.onBrand,
        hover: { background: t.color.brandHover },
      },
      ghost: {
        background: t.color.surface,
        color: t.color.ink,
        border: `1px solid ${t.color.border}`,
        hover: { background: t.color.brandSoft, borderColor: t.color.brand },
      },
    },
    size: {
      sm: { ...t.text.detail, ...paddingX.set(t.space.sm), paddingBlock: t.space.xs },
      md: {},
    },
  },
  toggles: {
    pill: { borderRadius: t.radius.pill },
  },
  compound: [
    { when: { intent: 'ghost', size: 'sm' }, style: { borderWidth: '1px' } },
  ],
  defaults: { intent: 'brand', size: 'md' },
})
