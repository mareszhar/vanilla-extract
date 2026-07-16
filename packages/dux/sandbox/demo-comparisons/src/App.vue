<template lang="pug">
main.shell
  header.hero
    p.eyebrow Prism · controlled comparison
    h1
      | One dispatch card.
      br
      | Five styling models.
    p.lede The same small workflow, variants, live progress, and design-system change in every lane—implemented with each tool's current official idioms.

  section.control-panel(aria-labelledby="controls-title")
    .control-head
      div
        p.section-kicker Shared state
        h2#controls-title Shared workflow controls
      p.status(aria-live="polite") {{ lastInteraction }} · {{ totalInteractions }} total

    .control-grid
      label.control
        span Intent
        select(v-model="intent")
          option(v-for="option in buttonIntents" :key="option" :value="option") {{ option }}
      label.control
        span Size
        select(v-model="size")
          option(v-for="option in buttonSizes" :key="option" :value="option") {{ option }}
      label.control.switch-control
        span Pill
        input(v-model="pill" type="checkbox")
      label.control.control-wide
        span Progress #[strong {{ value }}%]
        input(v-model.number="value" type="range" min="0" max="100")
      label.control
        span Scheme
        select(v-model="scheme")
          option(value="auto") auto
          option(value="light") light
          option(value="dark") dark
      label.control.brand-control
        span Live brand
        input(v-model="brand" type="color" aria-label="Live vane-dux brand color")
    p.control-note Scheme and component decisions exercise every lane. Brand is intentionally scoped to vane-dux: it demonstrates a mutable seed re-deriving the graph without a mirrored JavaScript palette.

  section.matrix(aria-label="Styling model comparison")
    article.lane(
      v-for="lane in lanes"
      :key="lane.id"
      :ref="element => setLaneElement(lane.id, element)"
      :data-lane="lane.id"
      :data-scheme="scheme === 'auto' ? undefined : scheme"
    )
      header.lane-head
        span.lane-index {{ lane.index }}
        div
          h2 {{ lane.name }}
          span.live-badge(v-if="lane.id === 'vane'") live graph

      p.lane-note {{ lane.note }}

      .lane-demo(aria-label="Dispatch card workflow")
        .dispatch-head
          div
            span.demo-label Priority queue
            strong.dispatch-title Resolve Prism rollout
          span.dispatch-state {{ value >= 80 ? 'ready' : 'in progress' }}

        .demo-block
          span.demo-label Primary action
          component(
            :is="lane.button"
            :intent="intent"
            :size="size"
            :pill="pill"
            @click="interact(lane.id, 'button')"
          )
            | {{ interactions[lane.id] ? `Dispatched ${interactions[lane.id]}×` : 'Dispatch' }}

        .demo-block.card-block
          span.demo-label Supporting content
          component(:is="lane.card" @action="interact(lane.id, 'card')")

        .demo-block
          .demo-label-row
            span.demo-label Rollout progress
            span.demo-value {{ value }}%
          component(:is="lane.progress" :value="value")

      footer.lane-footer {{ interactions[lane.id] ?? 0 }} interactions received
</template>

<script setup lang="ts">
import type { ButtonIntent, ButtonSize } from '@prism/domain'
import { buttonIntents, buttonSizes, progress } from '@prism/domain'
import ExtractButton from './lanes/extract/PrismButton.vue'
import ExtractCard from './lanes/extract/PrismCard.vue'
import ExtractProgress from './lanes/extract/PrismProgress.vue'
import PandaButton from './lanes/panda/PrismButton.vue'
import PandaCard from './lanes/panda/PrismCard.vue'
import PandaProgress from './lanes/panda/PrismProgress.vue'
import SfcButton from './lanes/sfc/PrismButton.vue'
import SfcCard from './lanes/sfc/PrismCard.vue'
import SfcProgress from './lanes/sfc/PrismProgress.vue'
import TailwindButton from './lanes/tailwind/PrismButton.vue'
import TailwindCard from './lanes/tailwind/PrismCard.vue'
import TailwindProgress from './lanes/tailwind/PrismProgress.vue'
import VaneButton from './lanes/vane/PrismButton.vue'
import VaneCard from './lanes/vane/PrismCard.vue'
import VaneProgress from './lanes/vane/PrismProgress.vue'
import { bindVaneRuntime } from './lanes/vane/system.style'

const intent = ref<ButtonIntent>('brand')
const size = ref<ButtonSize>('md')
const pill = ref(false)
const value = ref(progress.initial)
const scheme = ref<'auto' | 'light' | 'dark'>('auto')
const brand = ref('#635bff')
const vaneLane = ref<HTMLElement>()
let vaneRuntime: ReturnType<typeof bindVaneRuntime> | undefined
const interactions = reactive<Record<string, number>>({})
const lastInteraction = ref('No interactions yet')

watchEffect(() => {
  if (scheme.value === 'auto')
    document.documentElement.removeAttribute('data-scheme')
  else
    document.documentElement.setAttribute('data-scheme', scheme.value)
  document.documentElement.style.setProperty('--demo-brand', brand.value)
})

watchEffect(() => {
  if (!vaneLane.value)
    return

  vaneRuntime ??= bindVaneRuntime(vaneLane.value)
  vaneRuntime.t.color.brand.$set(brand.value)
})

function setLaneElement(id: string, element: Element | ComponentPublicInstance | null) {
  if (id === 'vane' && element instanceof HTMLElement)
    vaneLane.value = element
}

function interact(id: string, source: 'button' | 'card') {
  interactions[id] = (interactions[id] ?? 0) + 1
  lastInteraction.value = `${laneName(id)} ${source} responded`
}

function laneName(id: string): string {
  return lanes.find(lane => lane.id === id)?.name ?? id
}

const totalInteractions = computed(() => Object.values(interactions).reduce((total, count) => total + count, 0))

const lanes = [
  {
    id: 'sfc',
    index: '01',
    name: 'SFC scoped CSS',
    note: 'Variables by hand, class-name variants, and v-bind() for the live width.',
    button: markRaw(SfcButton),
    card: markRaw(SfcCard),
    progress: markRaw(SfcProgress),
  },
  {
    id: 'tailwind',
    index: '02',
    name: 'Tailwind',
    note: '@theme values plus utility maps for each finite variant.',
    button: markRaw(TailwindButton),
    card: markRaw(TailwindCard),
    progress: markRaw(TailwindProgress),
  },
  {
    id: 'panda',
    index: '03',
    name: 'Panda',
    note: 'Config and codegen feed cva and generated property functions.',
    button: markRaw(PandaButton),
    card: markRaw(PandaCard),
    progress: markRaw(PandaProgress),
  },
  {
    id: 'extract',
    index: '04',
    name: 'vanilla-extract',
    note: 'Typed rules over a string token bag; createVar plumbing for live data.',
    button: markRaw(ExtractButton),
    card: markRaw(ExtractCard),
    progress: markRaw(ExtractProgress),
  },
  {
    id: 'vane',
    index: '05',
    name: 'vane-dux',
    note: 'One live seed; explicit graph edges keep every dependent color in sync.',
    button: markRaw(VaneButton),
    card: markRaw(VaneCard),
    progress: markRaw(VaneProgress),
  },
] as const
</script>
