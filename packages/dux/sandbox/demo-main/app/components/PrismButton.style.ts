// The spec's button ([dux-spec-recipes.md §1–2]): variants, a toggle, a
// compound arm, and a published port — classes and runtime style API in one
// export. `recipe`, `port`, and `t` arrive through the module's auto-imports.

const paddingX = port(t.space.md)

export const button = recipe({
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
    fontFamily: t.font.sans,
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 1px 0 oklch(0 0 0 / 0.06)',
    motionOk: { transition: `background ${t.duration.fast} ease, border-color ${t.duration.fast} ease, transform ${t.duration.fast} ease` },
    focusVisible: { outline: `2px solid ${t.color.brand}`, outlineOffset: '2px' },
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
        background: t.color.surfaceRaised,
        color: t.color.ink,
        border: `1px solid ${t.color.border}`,
        hover: { background: t.color.brandSoft, borderColor: t.color.brand },
      },
    },
    size: {
      sm: { ...t.text.small, ...paddingX.set(t.space.sm), paddingBlock: t.space.xs },
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
