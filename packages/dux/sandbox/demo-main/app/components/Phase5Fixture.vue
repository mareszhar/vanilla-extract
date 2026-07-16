<template lang="pug">
aside(ref="root" :class="s.phase5Fixture" :style="initialProps.style" data-phase5-root v-bind="initialProps.attributes" aria-hidden="true")
  span#phase5-primary(:class="s.phase5Probe")
aside(:class="s.phase5Fixture" data-phase5-root data-scheme="light" aria-hidden="true")
  span#phase5-sibling(:class="s.phase5Probe")
aside(ref="shadowHost" :class="s.phase5Fixture" data-phase5-root data-scheme="light" aria-hidden="true")
svg(ref="svg" :class="s.phase5Fixture" aria-hidden="true")
  rect#phase5-svg(width="12" height="12" fill="var(--phase5-svg-fill)")
span#phase5-document(:class="[s.phase5Fixture, s.phase5DocumentProbe]" aria-hidden="true")
</template>

<script setup lang="ts">
import * as s from './Phase5Fixture.style'

declare global {
  interface Window {
    __phase5?: {
      snapshot: () => unknown
      setBase: (value: string) => void
      unsetBase: () => void
      setDark: (value: string) => void
      unsetDark: () => void
      setCase: (value: string) => void
      unsetCase: () => void
      setDensity: (mode: 'cozy' | 'compact') => void
      setShadowBase: (value: string) => void
    }
  }
}

const root = useTemplateRef<HTMLElement>('root')
const shadowHost = useTemplateRef<HTMLElement>('shadowHost')
const svg = useTemplateRef<SVGSVGElement>('svg')
const initialProps = s.phase5RuntimeProps(s.phase5InitialSnapshot)
let bound: ReturnType<typeof s.phase5Runtime> | undefined

onMounted(() => {
  const documentRuntime = s.phase5DocumentRuntime()
  documentRuntime.t.color.accent.$set('rgb(70 80 90)')
  bound = s.phase5Runtime(root.value!, { initial: s.phase5InitialSnapshot })
  const shadow = shadowHost.value!.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<style>#probe { width: 12px; height: 12px; background: var(--phase5-color-accent); }</style><span id="probe"></span>'
  const shadowRuntime = s.phase5Runtime(shadowHost.value!)
  setCustomProperty(svg.value!, '--phase5-svg-fill', 'rgb(240 90 20)')

  window.__phase5 = {
    snapshot: () => bound!.snapshot(),
    setBase: value => bound!.t.color.accent.$set(value),
    unsetBase: () => bound!.t.color.accent.$unset(),
    setDark: value => bound!.t.color.accent.$axes.scheme.dark.$set(value),
    unsetDark: () => bound!.t.color.accent.$axes.scheme.dark.$unset(),
    setCase: value => bound!.t.shadow.card.$case({ scheme: 'dark', density: 'compact' }).$set(value),
    unsetCase: () => bound!.t.shadow.card.$case({ scheme: 'dark', density: 'compact' }).$unset(),
    setDensity: mode => bound!.setMode('density', mode),
    setShadowBase: value => shadowRuntime.t.color.accent.$set(value),
  }
})

onBeforeUnmount(() => {
  delete window.__phase5
})
</script>
