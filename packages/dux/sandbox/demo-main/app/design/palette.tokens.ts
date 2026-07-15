import { de } from './engine'

/** One mutable OKLCH seed drives both schemes and every semantic elevation. */
export const paletteTokens = de.defineTokens({
  color: {
    brand: de.token.color({
      val: de.oklch(0.62, 0.205, 285),
      mutable: true,
      register: { inherits: true },
      description: 'The live monochromatic hue seed for Prism.',
      metadata: { role: 'palette-seed' },
    }),
  },
})
  .derive(({ color }) => ({
    color: {
      brandSoft: de.alpha(color.brand, 0.14),
      brandMuted: de.alpha(color.brand, 0.34),
      onBrand: de.legibleOn(color.brand),
      canvas: de.elevation(color.brand, 0),
      surface: de.elevation(color.brand, 0.035),
      surfaceRaised: de.elevation(color.brand, 0.075),
      overlay: de.elevation(color.brand, 0.11),
      border: de.elevation(color.brand, 0.22),
      inkMuted: de.elevation(color.brand, 0.66),
      ink: de.elevation(color.brand, 0.96),
    },
  }))
  .derive(({ color }) => ({
    color: {
      brandHover: de.mix(color.brand, color.ink, 0.12),
      brandActive: de.mix(color.brand, color.ink, 0.22),
      scrim: de.alpha(color.ink, 0.5),
      application: de.token.color({
        val: color.surface,
        axes: {
          elevation: {
            flat: color.canvas,
            overlay: color.overlay,
          },
        },
        description: 'Application canvas plane selected by the elevation axis.',
      }),
    },
  }))

/** Scheme and density are independent; only exceptional intersections are authored. */
export const effectTokens = de.defineTokens({
  shadow: {
    panel: de.token({
      val: '0 18px 60px oklch(0 0 0 / 0.12), 0 2px 10px oklch(0 0 0 / 0.08)',
      axes: {
        scheme: {
          dark: '0 22px 80px oklch(0 0 0 / 0.42), 0 2px 12px oklch(0 0 0 / 0.28)',
        },
        density: {
          compact: '0 12px 36px oklch(0 0 0 / 0.1), 0 1px 6px oklch(0 0 0 / 0.08)',
          spacious: '0 26px 90px oklch(0 0 0 / 0.15), 0 4px 14px oklch(0 0 0 / 0.08)',
        },
      },
      cases: [
        {
          when: { scheme: 'dark', density: 'compact' },
          val: '0 14px 46px oklch(0 0 0 / 0.36), 0 2px 8px oklch(0 0 0 / 0.22)',
        },
      ],
      description: 'Panel depth: independent axes plus one sparse dark/compact exception.',
    }),
    card: de.token({
      val: '0 8px 24px oklch(0 0 0 / 0.08)',
      axes: {
        scheme: { dark: '0 10px 34px oklch(0 0 0 / 0.3)' },
        density: { compact: '0 5px 16px oklch(0 0 0 / 0.08)' },
      },
    }),
  },
})
