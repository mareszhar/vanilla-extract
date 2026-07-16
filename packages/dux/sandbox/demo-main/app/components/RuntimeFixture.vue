<template lang="pug">
aside(ref="root" :class="s.runtimeFixture" :style="initialProps.style" data-runtime-fixture-root v-bind="initialProps.attributes" aria-hidden="true")
  span#runtime-fixture-primary(:class="s.runtimeProbe")
aside(:class="s.runtimeFixture" data-runtime-fixture-root data-scheme="light" aria-hidden="true")
  span#runtime-fixture-sibling(:class="s.runtimeProbe")
aside(ref="shadowHost" :class="s.runtimeFixture" data-runtime-fixture-root data-scheme="light" aria-hidden="true")
svg(ref="svg" :class="s.runtimeFixture" aria-hidden="true")
  rect#runtime-fixture-svg(width="12" height="12" fill="var(--runtime-fixture-svg-fill)")
span#runtime-fixture-document(:class="[s.runtimeFixture, s.runtimeDocumentProbe]" aria-hidden="true")
</template>

<script setup lang="ts">
import * as s from './RuntimeFixture.style'

declare global {
  interface Window {
    __runtimeFixture?: {
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
const initialProps = s.runtimeProps(s.initialSnapshot)
let bound: ReturnType<typeof s.runtime> | undefined

onMounted(() => {
  const documentRuntime = s.documentRuntime()
  documentRuntime.t.color.accent.$set('oklch(42% 0.025 250)')
  bound = s.runtime(root.value!, { initial: s.initialSnapshot })
  const shadow = shadowHost.value!.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<style>#probe { width: 12px; height: 12px; background: var(--runtime-fixture-color-accent); }</style><span id="probe"></span>'
  const shadowRuntime = s.runtime(shadowHost.value!)
  setCustomProperty(svg.value!, '--runtime-fixture-svg-fill', 'oklch(68% 0.2 45)')

  window.__runtimeFixture = {
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
  delete window.__runtimeFixture
})
</script>
