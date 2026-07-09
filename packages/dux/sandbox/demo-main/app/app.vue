<script setup lang="ts">
import {
  controls,
  denseRow,
  display,
  header,
  note,
  page,
  row,
  section,
  sectionTitle,
  slider,
} from './app.style'

const progress = ref(62)
const dialogOpen = ref(false)

const tabItems = [
  { label: 'Tokens', content: 'A typed graph: derivations, liveness, schemes — one definition feeds everything.' },
  { label: 'Recipes', content: 'Variants compress state: props in, precompiled classes out.' },
  { label: 'Ports', content: 'The runtime boundary is a declared, defaulted custom property.' },
]
</script>

<template>
  <main :class="page">
    <header :class="header">
      <h1 :class="display">Prism</h1>
      <div :class="controls">
        <ThemePicker />
        <SchemeToggle />
      </div>
    </header>

    <section :class="section">
      <h2 :class="sectionTitle">Buttons</h2>
      <p :class="note">One recipe: intents, sizes, a pill toggle — pick a brand color above and watch every arm follow.</p>
      <div :class="row">
        <PrismButton>Primary</PrismButton>
        <PrismButton intent="ghost">Ghost</PrismButton>
        <PrismButton pill>Pill</PrismButton>
        <PrismButton size="sm">Small</PrismButton>
        <PrismButton intent="ghost" size="sm" pill>All of it</PrismButton>
      </div>
      <div :class="denseRow">
        <PrismButton>Dense</PrismButton>
        <PrismButton intent="ghost">via one</PrismButton>
        <PrismButton>published port</PrismButton>
      </div>
    </section>

    <section :class="section">
      <h2 :class="sectionTitle">Card</h2>
      <p :class="note">Drag the handle — the layout answers to a container query, not the viewport.</p>
      <PrismCard title="Container-aware">
        Below 26rem this card stacks; wider, it flows into a row. Zero JavaScript.
      </PrismCard>
    </section>

    <section :class="section">
      <h2 :class="sectionTitle">Tabs</h2>
      <PrismTabs :items="tabItems" />
    </section>

    <section :class="section">
      <h2 :class="sectionTitle">Progress</h2>
      <PrismProgress :value="progress" />
      <input v-model.number="progress" :class="slider" type="range" min="0" max="100" aria-label="Progress value">
    </section>

    <section :class="section">
      <h2 :class="sectionTitle">Dialog</h2>
      <div :class="row">
        <PrismButton intent="ghost" @click="dialogOpen = true">Open dialog</PrismButton>
      </div>
      <PrismDialog :open="dialogOpen" @close="dialogOpen = false">
        <template #title>An anatomy at work</template>
        <p :class="note">
          Five parts styled as one unit; the entrance animation runs only when
          your system allows motion.
        </p>
      </PrismDialog>
    </section>
  </main>
</template>
