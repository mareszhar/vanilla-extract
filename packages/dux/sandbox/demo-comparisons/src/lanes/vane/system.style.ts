// The vane-dux lane's decisions — not mirrored values, *derivations*: one
// live seed and elevation positions; hovers, tints, pairings, and both
// schemes fall out, and the theme picker can re-derive them all at runtime.
import { alpha, createSystem, defineTokens, legibleOn, oklch } from '@mszr/vane-dux'
import { elevation } from '@mszr/vane-dux/preset'

export const { t, css, recipe, port, theme } = createSystem({
  tokens: defineTokens({
    color: {
      brand: oklch(0.58, 0.2, 285).live().describe('The seed. The theme picker owns this at runtime.'),
    },
    space: { xs: '4px', sm: '8px', md: '16px', lg: '24px' },
    radius: { sm: '6px', md: '10px', pill: '999px' },
    duration: { fast: '120ms', normal: '200ms' },
  })
    .derive(({ color }) => ({
      color: {
        brandSoft: alpha(color.brand, 0.12),
        onBrand: legibleOn(color.brand),
        surface: elevation(color.brand, 0.03),
        border: elevation(color.brand, 0.2),
        inkMuted: elevation(color.brand, 0.62),
        ink: elevation(color.brand, 0.94),
      },
    }))
    .derive(({ color }) => ({ color: { brandHover: color.brand.mix(color.ink, 0.12) } })),
  prefix: 'prism',
})
