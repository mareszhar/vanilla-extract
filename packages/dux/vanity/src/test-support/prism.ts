/**
 * The Prism fixture design system — the one graph every test plane exercises
 * ([vanity-workspace.md §5]). Mirrors the spec's snippets: a live brand seed,
 * elevation surfaces, derivations, a checked pairing, a scheme pair, scales,
 * and composite text styles.
 */

import { createEngine } from '@mszr/vanity'
import { elevationPlugin } from '@mszr/vanity/preset'

const de = createEngine().use(elevationPlugin())

/** Define the Prism tokens — call inside an emit harness or a style module. */
export function definePrism() {
  const tokens = de.defineTokens({
    color: {
      brand: de.token({
        val: de.oklch(0.58, 0.2, 285),
        mutable: true,
        description: 'Primary brand hue. Marketing owns this.',
      }),
      canvas: de.scheme({ light: de.oklch(0.99, 0.005, 285), dark: de.oklch(0.14, 0.006, 285) }),
    },
    space: de.scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6, xl: 10 } }).tokens(),
    radius: { sm: '4px', md: '8px', pill: '999px' },
    duration: { fast: '120ms', normal: '200ms' },
    text: {
      body: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400 },
      title: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600 },
    },
  })
    .derive(({ color }) => ({
      color: {
        surface: de.elevation(color.brand, 0.03),
        ink: de.elevation(color.brand, 0.94),
        brandSoft: de.alpha(color.brand, 0.12),
        brandHover: de.lighten(color.brand, 0.06),
        onBrand: de.legibleOn(color.brand),
      },
    }))

  return de.createSystem({ tokens }).t
}

export type PrismTokens = ReturnType<typeof definePrism>

/** The Prism system — the spec's `createSystem` example over the Prism graph. */
export function definePrismSystem() {
  const tokens = de.defineTokens({
    color: {
      brand: de.token({
        val: de.oklch(0.58, 0.2, 285),
        mutable: true,
        description: 'Primary brand hue. Marketing owns this.',
      }),
      canvas: de.scheme({ light: de.oklch(0.99, 0.005, 285), dark: de.oklch(0.14, 0.006, 285) }),
    },
    space: de.scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6, xl: 10 } }).tokens(),
    radius: { sm: '4px', md: '8px', pill: '999px' },
    duration: { fast: '120ms', normal: '200ms' },
    text: {
      body: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400 },
      title: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600 },
    },
  }).derive(({ color }) => ({
    color: {
      surface: de.elevation(color.brand, 0.03),
      ink: de.elevation(color.brand, 0.94),
      brandSoft: de.alpha(color.brand, 0.12),
      brandHover: de.lighten(color.brand, 0.06),
      onBrand: de.legibleOn(color.brand),
    },
  }))

  return de.createSystem({
    tokens,
    conditions: {
      open: '&[data-state="open"]',
      closed: '&[data-state="closed"]',
      md: de.media('(min-width: 768px)'),
      lg: de.media('(min-width: 1024px)'),
      cardWide: de.container('card', '(min-width: 400px)'),
    },
  })
}

export type PrismSystem = ReturnType<typeof definePrismSystem>
