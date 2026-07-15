import { createEngine } from '@mszr/vane-dux'
import { bemPlugin, elevationPlugin } from '@mszr/vane-dux/preset'

const de = createEngine()
  .use(elevationPlugin())
  .use(bemPlugin({ base: 4 }))

const palette = de.defineTokens({
  color: { brand: de.oklch(0.58, 0.2, 285) },
  space: { md: de.length.rem(1) },
})

const ds = de.createSystem({ tokens: palette, prefix: 'engine-doc' })

void ds.css({
  background: ds.elevation(ds.t.color.brand, 0.04),
  padding: ds.bem(4),
})
