import { createEngine } from '@mszr/vanity'
import { elevationPlugin } from '@mszr/vanity/preset'

/** The comparison lane uses the same public engine → module → system flow. */
const de = createEngine().use(elevationPlugin({ tint: 0.04 }))

const tokens = de.defineTokens({
  color: {
    brand: de.token.color({
      val: de.oklch(0.58, 0.2, 285),
      mutable: true,
      description: 'One runtime seed; every dependent color stays CSS-reactive.',
    }),
  },
  space: { xs: de.length.px(4), sm: de.length.px(8), md: de.length.px(16), lg: de.length.px(24) },
  radius: { sm: de.length.px(6), md: de.length.px(10), pill: de.length.px(999) },
  duration: { fast: de.time.ms(120), normal: de.time.ms(200) },
})
  .derive(({ color }) => ({
    color: {
      brandSoft: de.alpha(color.brand, 0.12),
      onBrand: de.legibleOn(color.brand),
      surface: de.elevation(color.brand, 0.03),
      border: de.elevation(color.brand, 0.2),
      inkMuted: de.elevation(color.brand, 0.62),
      ink: de.elevation(color.brand, 0.94),
    },
  }))
  .derive(({ color }) => ({ color: { brandHover: de.mix(color.brand, color.ink, 0.12) } }))

const ds = de.createSystem({
  tokens,
  prefix: 'compare',
  root: '[data-lane="vanity"]',
})

export const { css, port, recipe, t } = ds
export const bindVanityRuntime = ds.runtime
