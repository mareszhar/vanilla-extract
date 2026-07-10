<script setup lang="ts">
import type { ButtonIntent, ButtonSize } from '@prism/domain'
import type { ComponentPublicInstance } from 'vue'
import { applyTheme, setScheme } from '@mszr/vane-dux/runtime'
import { buttonIntents, buttonSizes, progress } from '@prism/domain'
import { computed, markRaw, reactive, ref, watchEffect } from 'vue'
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
import { t } from './lanes/vane/system.style'
import VaneButton from './lanes/vane/PrismButton.vue'
import VaneCard from './lanes/vane/PrismCard.vue'
import VaneProgress from './lanes/vane/PrismProgress.vue'

const intent = ref<ButtonIntent>('brand')
const size = ref<ButtonSize>('md')
const pill = ref(false)
const value = ref(progress.initial)
const scheme = ref<'auto' | 'light' | 'dark'>('auto')
const brand = ref('#635bff')
const vaneLane = ref<HTMLElement>()
const interactions = reactive<Record<string, number>>({})
const lastInteraction = ref('No interactions yet')

watchEffect(() => {
  setScheme(document.documentElement, scheme.value === 'auto' ? null : scheme.value)
  document.documentElement.style.setProperty('--demo-brand', brand.value)
})

watchEffect(() => {
  if (vaneLane.value)
    applyTheme(vaneLane.value, t, { color: { brand: brand.value } })
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

<template>
  <main class="shell">
    <header class="hero">
      <p class="eyebrow">Prism · controlled comparison</p>
      <h1>One interface.<br>Five styling models.</h1>
      <p class="lede">The same decisions and behavior in every lane. Change one control, then inspect where each model stores the work.</p>
    </header>

    <section class="control-panel" aria-labelledby="controls-title">
      <div class="control-head">
        <div>
          <p class="section-kicker">Shared state</p>
          <h2 id="controls-title">Test controls</h2>
        </div>
        <p class="status" aria-live="polite">
          {{ lastInteraction }} · {{ totalInteractions }} total
        </p>
      </div>

      <div class="control-grid">
        <label class="control">
          <span>Intent</span>
          <select v-model="intent">
            <option v-for="option in buttonIntents" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="control">
          <span>Size</span>
          <select v-model="size">
            <option v-for="option in buttonSizes" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="control switch-control">
          <span>Pill</span>
          <input v-model="pill" type="checkbox">
        </label>
        <label class="control control-wide">
          <span>Progress <strong>{{ value }}%</strong></span>
          <input v-model.number="value" type="range" min="0" max="100">
        </label>
        <label class="control">
          <span>Scheme</span>
          <select v-model="scheme">
            <option value="auto">auto</option>
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label class="control brand-control">
          <span>Live brand</span>
          <input v-model="brand" type="color" aria-label="Live vane-dux brand color">
        </label>
      </div>
      <p class="control-note">Brand changes are intentionally scoped to vane-dux: the other four lanes compiled their palette in.</p>
    </section>

    <section class="matrix" aria-label="Styling model comparison">
      <article
        v-for="lane in lanes"
        :key="lane.id"
        :ref="element => setLaneElement(lane.id, element)"
        class="lane"
        :data-lane="lane.id"
      >
        <header class="lane-head">
          <span class="lane-index">{{ lane.index }}</span>
          <div>
            <h2>{{ lane.name }}</h2>
            <span v-if="lane.id === 'vane'" class="live-badge">live graph</span>
          </div>
        </header>

        <p class="lane-note">{{ lane.note }}</p>

        <div class="lane-demo">
          <div class="demo-block">
            <span class="demo-label">Button</span>
            <component
              :is="lane.button"
              :intent="intent"
              :size="size"
              :pill="pill"
              @click="interact(lane.id, 'button')"
            >
              {{ interactions[lane.id] ? `Refracted ${interactions[lane.id]}×` : 'Refract' }}
            </component>
          </div>

          <div class="demo-block card-block">
            <span class="demo-label">Card</span>
            <component :is="lane.card" @action="interact(lane.id, 'card')" />
          </div>

          <div class="demo-block">
            <div class="demo-label-row">
              <span class="demo-label">Progress</span>
              <span class="demo-value">{{ value }}%</span>
            </div>
            <component :is="lane.progress" :value="value" />
          </div>
        </div>

        <footer class="lane-footer">
          {{ interactions[lane.id] ?? 0 }} interactions received
        </footer>
      </article>
    </section>
  </main>
</template>
