<script setup lang="ts">
import type { ButtonIntent, ButtonSize } from '@prism/domain'
import { applyTheme } from '@mszr/vane-dux/runtime'
import { buttonIntents, buttonSizes, progress } from '@prism/domain'
import { markRaw, ref, watchEffect } from 'vue'
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

// ─── The shared state every lane renders ─────────────────────────────────────

const intent = ref<ButtonIntent>('brand')
const size = ref<ButtonSize>('md')
const pill = ref(false)
const value = ref(progress.initial)
const scheme = ref<'auto' | 'light' | 'dark'>('auto')
const brand = ref('#635bff')

watchEffect(() => {
  if (scheme.value === 'auto')
    delete document.documentElement.dataset.scheme
  else
    document.documentElement.dataset.scheme = scheme.value
})

// The vane lane re-derives at runtime: one live write, every surface follows.
const vaneLane = ref<HTMLElement>()

watchEffect(() => {
  if (vaneLane.value)
    applyTheme(vaneLane.value, t, { color: { brand: brand.value } })
})

// ─── The matrix ──────────────────────────────────────────────────────────────

const lanes = [
  {
    id: 'sfc',
    name: 'SFC scoped CSS',
    note: 'vars.css by hand, class-name variants, v-bind() for the live value.',
    button: markRaw(SfcButton),
    card: markRaw(SfcCard),
    progress: markRaw(SfcProgress),
  },
  {
    id: 'tailwind',
    name: 'Tailwind',
    note: '@theme by hand, utility maps per variant, inline style for the live value.',
    button: markRaw(TailwindButton),
    card: markRaw(TailwindCard),
    progress: markRaw(TailwindProgress),
  },
  {
    id: 'panda',
    name: 'Panda',
    note: 'config + codegen, cva variants, static extraction decides what compiles.',
    button: markRaw(PandaButton),
    card: markRaw(PandaCard),
    progress: markRaw(PandaProgress),
  },
  {
    id: 'extract',
    name: 'vanilla-extract',
    note: 'typed styles over a string token bag; createVar plumbing per live value.',
    button: markRaw(ExtractButton),
    card: markRaw(ExtractCard),
    progress: markRaw(ExtractProgress),
  },
  {
    id: 'vane',
    name: 'vane-dux',
    note: 'one live seed; hovers, tints, pairings, and both schemes derive from it.',
    button: markRaw(VaneButton),
    card: markRaw(VaneCard),
    progress: markRaw(VaneProgress),
  },
] as const
</script>

<template>
  <div class="shell">
    <header class="shell-head">
      <h1>Prism — the comparison matrix</h1>
      <p>The same components, the same decisions, five authoring models.</p>
    </header>

    <div class="controls">
      <label>
        intent
        <select v-model="intent">
          <option v-for="option in buttonIntents" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
      <label>
        size
        <select v-model="size">
          <option v-for="option in buttonSizes" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
      <label>
        <input v-model="pill" type="checkbox">
        pill
      </label>
      <label>
        progress
        <input v-model.number="value" type="range" min="0" max="100">
      </label>
      <label>
        scheme
        <select v-model="scheme">
          <option value="auto">auto</option>
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>
      </label>
      <label>
        brand
        <input v-model="brand" type="color">
        <small>re-derives live in the vane-dux lane — the others compiled theirs in</small>
      </label>
    </div>

    <div class="matrix">
      <section
        v-for="lane in lanes"
        :key="lane.id"
        :ref="lane.id === 'vane' ? (el) => { vaneLane = el as HTMLElement } : undefined"
        class="lane"
      >
        <header>
          <h2>{{ lane.name }}</h2>
        </header>
        <div class="lane-buttons">
          <component :is="lane.button" :intent="intent" :size="size" :pill="pill">
            Refract
          </component>
        </div>
        <component :is="lane.card" />
        <component :is="lane.progress" :value="value" />
        <p class="lane-note">{{ lane.note }}</p>
      </section>
    </div>
  </div>
</template>
