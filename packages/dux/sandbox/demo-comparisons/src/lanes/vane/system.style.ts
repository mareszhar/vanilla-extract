// The vane-dux lane's decisions — not mirrored values, *derivations*: one
// live seed and elevation positions; hovers, tints, pairings, and both
// schemes fall out, and the theme picker can re-derive them all at runtime.
import { alpha, createSystem, legibleOn, oklch } from '@mszr/vane-dux'
import { elevation } from '@mszr/vane-dux/preset'

export const { t, css, recipe, port, theme } = createSystem({
  tokens: {
    color: {
      brand: oklch(0.58, 0.2, 285).live().describe('The seed. The theme picker owns this at runtime.'),
      brandHover: ({ color }) => color.brand.mix(color.ink, 0.12),
      brandSoft: ({ color }) => alpha(color.brand, 0.12),
      onBrand: ({ color }) => legibleOn(color.brand),
      surface: ({ color }) => elevation(color.brand, 0.03),
      border: ({ color }) => elevation(color.brand, 0.2),
      inkMuted: ({ color }) => elevation(color.brand, 0.62),
      ink: ({ color }) => elevation(color.brand, 0.94),
    },
    space: { xs: '4px', sm: '8px', md: '16px', lg: '24px' },
    radius: { sm: '6px', md: '10px', pill: '999px' },
    duration: { fast: '120ms', normal: '200ms' },
  },
  prefix: 'prism',
})
