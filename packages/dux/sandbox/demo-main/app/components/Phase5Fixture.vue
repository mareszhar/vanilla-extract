<script setup lang="ts">
import { setCustomProperty } from '@mszr/vane-dux/runtime'
import {
  phase5DocumentProbe,
  phase5DocumentRuntime,
  phase5Fixture,
  phase5InitialSnapshot,
  phase5Probe,
  phase5Runtime,
  phase5RuntimeProps,
} from './Phase5Fixture.style'

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
const initialProps = phase5RuntimeProps(phase5InitialSnapshot)
let bound: ReturnType<typeof phase5Runtime> | undefined

onMounted(() => {
  const documentRuntime = phase5DocumentRuntime()
  documentRuntime.t.color.accent.$set('rgb(70 80 90)')
  bound = phase5Runtime(root.value!, { initial: phase5InitialSnapshot })
  const shadow = shadowHost.value!.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<style>#probe { width: 12px; height: 12px; background: var(--phase5-color-accent); }</style><span id="probe"></span>'
  const shadowRuntime = phase5Runtime(shadowHost.value!)
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

<template>
  <aside
    ref="root"
    :class="phase5Fixture"
    :style="initialProps.style"
    data-phase5-root
    v-bind="initialProps.attributes"
    aria-hidden="true"
  >
    <span id="phase5-primary" :class="phase5Probe" />
  </aside>
  <aside :class="phase5Fixture" data-phase5-root data-scheme="light" aria-hidden="true">
    <span id="phase5-sibling" :class="phase5Probe" />
  </aside>
  <aside ref="shadowHost" :class="phase5Fixture" data-phase5-root data-scheme="light" aria-hidden="true" />
  <svg ref="svg" :class="phase5Fixture" aria-hidden="true">
    <rect id="phase5-svg" width="12" height="12" fill="var(--phase5-svg-fill)" />
  </svg>
  <span id="phase5-document" :class="[phase5Fixture, phase5DocumentProbe]" aria-hidden="true" />
</template>
