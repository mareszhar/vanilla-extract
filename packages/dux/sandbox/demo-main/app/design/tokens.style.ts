// The Prism token graph — the library-authoring form ([dux-spec-tokens.md §1]):
// a live brand seed, elevation surfaces, derivations, a checked pairing.
import { alpha, defineTokens, elevation, legibleOn, oklch, scale } from '@mszr/vane-dux'

export const t = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285).live().describe('Primary brand hue. The theme picker owns this at runtime.'),
    brandSoft: ({ color }) => alpha(color.brand, 0.12),
    brandHover: ({ color }) => color.brand.lighten(0.06),
    onBrand: ({ color }) => legibleOn(color.brand),
    canvas: elevation(0),
    surface: elevation(0.03),
    surfaceRaised: elevation(0.08),
    border: elevation(0.2),
    inkMuted: elevation(0.62),
    ink: elevation(0.94),
    scrim: ({ color }) => alpha(color.ink, 0.42),
  },
  space: scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6, xl: 10 } }),
  radius: { sm: '6px', md: '10px', pill: '999px' },
  duration: { fast: '120ms', normal: '200ms' },
  font: { sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  text: {
    small: { fontSize: '0.875rem', lineHeight: 1.45, fontWeight: 400 },
    body: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400 },
    title: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600 },
    display: { fontSize: '2.25rem', lineHeight: 1.1, fontWeight: 700 },
  },
}, {
  prefix: 'prism',
  elevation: { hue: 285, chroma: 0.008 },
})
