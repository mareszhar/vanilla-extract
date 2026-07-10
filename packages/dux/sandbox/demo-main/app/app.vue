<script setup lang="ts">
import {
  actionRow,
  anatomy,
  checkbox,
  compactActions,
  controlStack,
  counter,
  eyebrow,
  feature,
  featureCopy,
  featureGrid,
  featureNumber,
  featureTitle,
  field,
  fieldLabel,
  hero,
  intro,
  kicker,
  live,
  page,
  panel,
  panelCopy,
  panelHeader,
  panelTitle,
  preview,
  previewBody,
  previewHeader,
  progressGroup,
  progressHead,
  progressValue,
  section,
  sectionCopy,
  sectionHeader,
  sectionTitle,
  select,
  shell,
  slider,
  title,
  toolbar,
  workbench,
} from './app.style'

const intent = ref<'brand' | 'ghost'>('brand')
const size = ref<'sm' | 'md'>('md')
const pill = ref(false)
const progress = ref(62)
const presses = ref(0)
const dialogOpen = ref(false)

const tabItems = [
  { label: 'Tokens', content: 'Graph edges remain visible: change the brand and every dependent color re-derives in the cascade.' },
  { label: 'Recipes', content: 'Finite visual choices resolve to precompiled classes. The component receives ordinary typed props.' },
  { label: 'Ports', content: 'Live values cross one named boundary and become ordinary custom-property writes.' },
]
</script>

<template>
  <main :class="page">
    <div :class="shell">
      <header :class="hero">
        <p :class="eyebrow">vane-dux · interaction lab</p>
        <h1 :class="title">Style with intent. Inspect the result.</h1>
        <p :class="intro">
          A compact test bench for the contract, compiled, and live planes. Every control below changes something real; refreshes keep their CSS on the first paint.
        </p>
        <div :class="toolbar">
          <ThemePicker />
          <SchemeToggle />
        </div>
      </header>

      <section :class="section" aria-labelledby="workbench-title">
        <div :class="sectionHeader">
          <p :class="kicker">Recipe + port</p>
          <h2 id="workbench-title" :class="sectionTitle">Component workbench</h2>
          <p :class="sectionCopy">Tune a finite variant space, drive a live value, then press the preview button to verify behavior.</p>
        </div>

        <div :class="workbench">
          <aside :class="panel">
            <div :class="panelHeader">
              <h3 :class="panelTitle">Controls</h3>
              <p :class="panelCopy">All inputs are native, keyboard-friendly, and bound to the preview.</p>
            </div>

            <div :class="controlStack">
              <label :class="field">
                <span :class="fieldLabel">Intent</span>
                <select v-model="intent" :class="select">
                  <option value="brand">Brand</option>
                  <option value="ghost">Ghost</option>
                </select>
              </label>

              <label :class="field">
                <span :class="fieldLabel">Size</span>
                <select v-model="size" :class="select">
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                </select>
              </label>

              <label :class="checkbox">
                <span :class="fieldLabel">Pill radius</span>
                <input v-model="pill" type="checkbox">
              </label>

              <label :class="field">
                <span :class="fieldLabel">Progress · {{ progress }}%</span>
                <input v-model.number="progress" :class="slider" type="range" min="0" max="100">
              </label>
            </div>
          </aside>

          <div :class="preview">
            <div :class="previewHeader">
              <span :class="live">Live preview</span>
              <span :class="counter">{{ intent }} · {{ size }}<template v-if="pill"> · pill</template></span>
            </div>

            <div :class="previewBody">
              <div :class="actionRow">
                <PrismButton :intent="intent" :size="size" :pill="pill" @click="presses++">
                  {{ presses === 0 ? 'Refract' : `Refracted ${presses}×` }}
                </PrismButton>
                <span :class="counter">{{ presses === 0 ? 'Ready for input' : 'Click event received' }}</span>
              </div>

              <div :class="progressGroup">
                <div :class="progressHead">
                  <span :class="fieldLabel">Port-driven progress</span>
                  <span :class="progressValue">{{ progress }} / 100</span>
                </div>
                <PrismProgress :value="progress" />
              </div>

              <PrismCard title="Resize this card">
                Drag its right edge. The layout switches at the named container condition, independent of the viewport.
              </PrismCard>
            </div>
          </div>
        </div>
      </section>

      <section :class="section" aria-labelledby="principles-title">
        <div :class="sectionHeader">
          <p :class="kicker">What to inspect</p>
          <h2 id="principles-title" :class="sectionTitle">Three planes, no sleight of hand</h2>
        </div>
        <div :class="featureGrid">
          <article :class="feature">
            <span :class="featureNumber">01 · Contract</span>
            <h3 :class="featureTitle">Relationships are code</h3>
            <p :class="featureCopy">The preset’s elevation helper receives its base explicitly. Rename the token and the graph follows.</p>
          </article>
          <article :class="feature">
            <span :class="featureNumber">02 · Compiled</span>
            <h3 :class="featureTitle">Classes and layers</h3>
            <p :class="featureCopy">Recipes, anatomy, conditions, and selectors leave static CSS behind—no render-time style engine.</p>
          </article>
          <article :class="feature">
            <span :class="featureNumber">03 · Live</span>
            <h3 :class="featureTitle">Only declared crossings</h3>
            <p :class="featureCopy">The range writes one typed port. The color picker writes one live token. The cascade does the rest.</p>
          </article>
        </div>
      </section>

      <section :class="section" aria-labelledby="anatomy-title">
        <div :class="sectionHeader">
          <p :class="kicker">Anatomy</p>
          <h2 id="anatomy-title" :class="sectionTitle">Multi-part components stay one unit</h2>
          <p :class="sectionCopy">Tabs track headless state; the dialog coordinates five named parts and reduced-motion-aware animation.</p>
        </div>
        <div :class="anatomy">
          <PrismTabs :items="tabItems" />
          <div :class="compactActions">
            <PrismButton intent="ghost" size="sm" @click="dialogOpen = true">Open dialog</PrismButton>
            <PrismButton size="sm" @click="progress = progress >= 100 ? 0 : progress + 10">Advance 10%</PrismButton>
          </div>
        </div>
      </section>
    </div>

    <PrismDialog :open="dialogOpen" @close="dialogOpen = false">
      <template #title>An anatomy at work</template>
      <p :class="sectionCopy">Backdrop, positioner, content, title, and close control share one typed style contract.</p>
    </PrismDialog>
  </main>
</template>
