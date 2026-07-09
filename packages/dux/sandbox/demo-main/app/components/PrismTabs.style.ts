// Tabs as an anatomy — the headless-state happy path ([dux-spec-recipes.md §5]):
// `selected` is the preset's `[data-selected]` condition, one bare key.

export const tabs = anatomy({
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
      ...t.text.small,
      paddingInline: t.space.md,
      paddingBlock: t.space.xs,
      border: 'none',
      borderRadius: t.radius.sm,
      background: 'transparent',
      color: t.color.inkMuted,
      cursor: 'pointer',
      fontFamily: t.font.sans,
      motionOk: { transition: `background ${t.duration.fast} ease, color ${t.duration.fast} ease` },
      hoverFocus: { color: t.color.ink },
      selected: { background: t.color.brand, color: t.color.onBrand },
    },
    panel: { ...t.text.body, color: t.color.inkMuted, margin: 0 },
  },
})
