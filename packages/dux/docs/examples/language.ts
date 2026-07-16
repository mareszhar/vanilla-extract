import { createEngine } from '@mszr/vanity'

export const de = createEngine()
  .axes(({ axis, data, defaultMode, scheme }) => ({
    scheme: scheme({ locality: 'element' }),
    density: axis({
      modes: {
        compact: data('density', 'compact'),
        comfortable: defaultMode(),
      },
      default: 'comfortable',
    }),
  }))

export const colors = de.defineTokens({
  color: {
    brand: de.token.color({
      val: de.oklch(0.62, 0.2, 285),
      mutable: true,
      axes: { scheme: { dark: de.oklch(0.72, 0.16, 285) } },
    }),
  },
})

export const ds = de.createSystem({ tokens: colors, prefix: 'docs' })

void ds.css({
  color: ds.t.color.brand,
  padding: ds.length.em(2),
})
void ds.t.color.brand.$var('currentColor')
void ds.namesOf(colors)
