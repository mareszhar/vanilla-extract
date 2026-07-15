import { createEngine, customProperty } from '@mszr/vane-dux'
import { setCustomProperties, setCustomProperty } from '@mszr/vane-dux/runtime'

const de = createEngine().axes(({ scheme }) => ({ scheme: scheme() }))
const tokens = de.defineTokens({
  color: {
    brand: de.token.color({
      val: de.oklch(0.58, 0.2, 285),
      mutable: true,
      axes: { scheme: { dark: de.oklch(0.72, 0.16, 285) } },
    }),
  },
})
const ds = de.createSystem({ tokens, root: '#widget', prefix: 'runtime-doc' })
const runtime = ds.runtime(document.querySelector<HTMLElement>('#widget')!)

runtime.t.color.brand.$set('oklch(62% 0.2 210)')
runtime.t.color.brand.$axes.scheme.dark.$set('oklch(72% 0.16 210)')
runtime.applyTokenOverrides([[ds.t.color.brand, 'hotpink']])
runtime.t.color.brand.$unset()
runtime.setMode('scheme', 'dark')

const external = customProperty('--external-brand', { type: 'color' })
setCustomProperty(document.documentElement, external, 'rebeccapurple')
setCustomProperties(document.documentElement, [[ds.t.color.brand, 'hotpink']])

const snapshot = runtime.snapshot()
void ds.runtimeProps(snapshot)
void ds.reconcileRuntimeSnapshot(snapshot)
