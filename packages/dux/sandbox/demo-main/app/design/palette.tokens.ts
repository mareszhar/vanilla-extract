import { alpha, channel, defineTokens, legibleOn, oklch } from '@mszr/vane-dux'
import { elevation } from '@mszr/vane-dux/preset'

/** Independently buildable color module; its derivations stay local and exact. */
export const paletteTokens = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285).live().describe('Primary brand color. The theme picker can override it at runtime.'),
  },
})
  .derive(({ color }) => ({
    color: {
      brandSoft: alpha(color.brand, 0.12),
      onBrand: legibleOn(color.brand),
      canvas: elevation(color.brand, 0),
      surface: elevation(color.brand, 0.03),
      surfaceRaised: elevation(color.brand, 0.08),
      border: elevation(color.brand, 0.2),
      inkMuted: elevation(color.brand, 0.62),
      ink: elevation(color.brand, 0.94),
    },
  }))
  .derive(({ color }) => ({
    color: {
      brandHover: oklch.from(color.brand, { l: channel.subtract(0.06) }),
      scrim: alpha(color.ink, 0.42),
    },
  }))
