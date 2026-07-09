// components/AppButton.style.ts
import { recipe, t } from '~/design/system.style'

export const button = recipe({
  base: { ...t.text.body, display: 'inline-flex', gap: t.space.xs, borderRadius: t.radius.sm },
  variants: {
    intent: {
      brand: { background: t.color.brand, color: t.color.onBrand, hover: { background: t.color.brandHover } },
      ghost: { background: 'transparent', hover: { background: t.color.brandSoft } },
    },
    size: {
      sm: { paddingInline: t.space.sm },
      md: { paddingInline: t.space.md },
    },
  },
  defaults: { intent: 'brand', size: 'md' },
})
