/**
 * The Prism fixture design system — the one graph every test plane exercises
 * ([dux-workspace.md §5]). Mirrors the spec's snippets: a live brand seed,
 * elevation surfaces, derivations, a checked pairing, a scheme pair, scales,
 * and composite text styles.
 */

import { alpha, container, createSystem, defineTokens, legibleOn, media, oklch, scale, scheme } from '@mszr/vane-dux'
import { elevation } from '@mszr/vane-dux/preset'

/** Define the Prism tokens — call inside an emit harness or a style module. */
export function definePrism() {
  return defineTokens({
    color: {
      brand: oklch(0.58, 0.2, 285).live().describe('Primary brand hue. Marketing owns this.'),
      canvas: scheme({ light: oklch(0.99, 0.005, 285), dark: oklch(0.14, 0.006, 285) }),
    },
    space: scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6, xl: 10 } }).tokens(),
    radius: { sm: '4px', md: '8px', pill: '999px' },
    duration: { fast: '120ms', normal: '200ms' },
    text: {
      body: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400 },
      title: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600 },
    },
  })
    .derive(({ color }) => ({
      color: {
        surface: elevation(color.brand, 0.03),
        ink: elevation(color.brand, 0.94),
        brandSoft: alpha(color.brand, 0.12),
        brandHover: color.brand.lighten(0.06),
        onBrand: legibleOn(color.brand),
      },
    }))
    .build()
}

export type PrismTokens = ReturnType<typeof definePrism>

/** The Prism system — the spec's `createSystem` example over the Prism graph. */
export function definePrismSystem() {
  return createSystem({
    tokens: definePrism(),
    conditions: {
      open: '&[data-state="open"]',
      closed: '&[data-state="closed"]',
      md: media('(min-width: 768px)'),
      lg: media('(min-width: 1024px)'),
      cardWide: container('card', '(min-width: 400px)'),
    },
  })
}

export type PrismSystem = ReturnType<typeof definePrismSystem>
