<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import * as s from './app.style'

type Scheme = 'system' | 'light' | 'dark'
type Density = 'compact' | 'comfortable' | 'spacious'
type Elevation = 'flat' | 'raised' | 'overlay'
type Motion = 'none' | 'subtle' | 'springy'
type Font = 'modern' | 'editorial' | 'mono'

interface StudioSettings {
  hue: number
  radius: number
  scheme: Scheme
  density: Density
  elevation: Elevation
  motion: Motion
  font: Font
}

const defaults: StudioSettings = {
  hue: 285,
  radius: 14,
  scheme: 'system',
  density: 'comfortable',
  elevation: 'raised',
  motion: 'subtle',
  font: 'modern',
}

const fontStacks: Record<Font, string> = {
  modern: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  editorial: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
}

const schemes = ['system', 'light', 'dark'] as const
const densities = ['compact', 'comfortable', 'spacious'] as const
const elevations = ['flat', 'raised', 'overlay'] as const
const motions = ['none', 'subtle', 'springy'] as const
const fonts = ['modern', 'editorial', 'mono'] as const

const cookie = useCookie<StudioSettings>('prism-studio-v1', {
  default: () => ({ ...defaults }),
  sameSite: 'lax',
})
const settings = ref(normalizeSettings(cookie.value))
const root = useTemplateRef<HTMLElement>('root')
const dialogOpen = ref(false)
const progress = ref(72)
let runtime: ReturnType<typeof s.studioRuntime> | undefined

const navItems = ['Overview', 'Inbox', 'Automations', 'Reports', 'Settings'] as const
const chartPoints = [34, 48, 43, 61, 56, 72, 66, 81, 75, 88, 83, 96]
const people = [
  { initials: 'DM', name: 'Devon Marsh', email: 'devon@sparrow.co', amount: '$3,820', status: 'complete' },
  { initials: 'AK', name: 'Aisha Khan', email: 'aisha@north.dev', amount: '$2,164', status: 'pending' },
  { initials: 'TV', name: 'Tomás Vidal', email: 'tomas@masa.io', amount: '$1,908', status: 'complete' },
  { initials: 'PF', name: 'Priya Foster', email: 'priya@fond.co', amount: '$986', status: 'review' },
]
const inspectorTabs = [
  { label: 'Axes', content: 'Scheme, density, elevation, and motion are ordered environmental dimensions. Components never branch on them.' },
  { label: 'Cases', content: 'Panel shadow has independent scheme and density arms plus one explicit dark/compact intersection.' },
  { label: 'CSS', content: 'Media, container, supports, selectors, keyframes, @font-face, @property, and raw nesting all remain ordinary CSS.' },
]

const activeHue = computed(() => `oklch(62% 0.205 ${settings.value.hue})`)
const initialSnapshot = createSnapshot(settings.value)
const initialProps = s.studioRuntimeProps(initialSnapshot)

onMounted(() => {
  runtime = s.studioRuntime(root.value!, { initial: initialSnapshot })
})

watch(settings, (next) => {
  cookie.value = { ...next }
  if (runtime)
    applySettings(runtime, next)
}, { deep: true })

function choose<Key extends keyof StudioSettings>(key: Key, value: StudioSettings[Key]): void {
  settings.value = { ...settings.value, [key]: value }
}

function reset(): void {
  settings.value = { ...defaults }
  progress.value = 72
}

function createSnapshot(state: StudioSettings) {
  const values = new Map<string, string>()
  const target = {
    style: {
      setProperty: (name: string, value: string) => values.set(name, value),
      removeProperty: (name: string) => {
        const previous = values.get(name) ?? ''
        values.delete(name)
        return previous
      },
      getPropertyValue: (name: string) => values.get(name) ?? '',
    },
    setAttribute: () => {},
    removeAttribute: () => {},
    matches: (selector: string) => selector === '#prism-studio',
  }
  const seed = s.studioRuntime(target)
  applySettings(seed, state)
  return seed.snapshot()
}

function applySettings(bound: ReturnType<typeof s.studioRuntime>, state: StudioSettings): void {
  if (state.hue === defaults.hue)
    bound.t.color.brand.$unset()
  else
    bound.t.color.brand.$set(`oklch(62% 0.205 ${state.hue})`)

  if (state.radius === defaults.radius)
    bound.t.radius.seed.$unset()
  else
    bound.t.radius.seed.$set(`${state.radius}px`)

  if (state.font === defaults.font)
    bound.t.font.family.$unset()
  else
    bound.t.font.family.$set(fontStacks[state.font])

  setMode(bound, 'scheme', state.scheme, 'system')
  setMode(bound, 'density', state.density, defaults.density)
  setMode(bound, 'elevation', state.elevation, defaults.elevation)
  setMode(bound, 'motion', state.motion, defaults.motion)
}

function setMode(
  bound: ReturnType<typeof s.studioRuntime>,
  axis: 'scheme' | 'density' | 'elevation' | 'motion',
  mode: string,
  clear: string,
): void {
  if (mode === clear)
    bound.clearMode(axis)
  else
    bound.setMode(axis, mode as never)
}

function normalizeSettings(input: StudioSettings | null | undefined): StudioSettings {
  const candidate = input ?? defaults
  return {
    hue: finiteIn(candidate.hue, 0, 360, defaults.hue),
    radius: finiteIn(candidate.radius, 0, 26, defaults.radius),
    scheme: includes(schemes, candidate.scheme) ? candidate.scheme : defaults.scheme,
    density: includes(densities, candidate.density) ? candidate.density : defaults.density,
    elevation: includes(elevations, candidate.elevation) ? candidate.elevation : defaults.elevation,
    motion: includes(motions, candidate.motion) ? candidate.motion : defaults.motion,
    font: includes(fonts, candidate.font) ? candidate.font : defaults.font,
  }
}

function finiteIn(value: number, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback
}

function includes<const Values extends readonly string[]>(values: Values, value: string): value is Values[number] {
  return values.includes(value)
}
</script>

<template lang="pug">
a(:class="s.skipLink" href="#studio-content") Skip to studio preview
main#prism-studio(ref="root" :class="s.page" :style="initialProps.style" v-bind="initialProps.attributes")
  .studio-shell(:class="s.studio")
    aside(:class="s.rail" aria-label="Design-system controls")
      div(:class="s.brand")
        span(:class="s.brandMark" aria-hidden="true") ◈
        div(:class="s.brandText")
          p(:class="s.brandName") Prism
          p(:class="s.brandTagline") system studio · vane-dux

      p(:class="s.controlsHeading") Live decisions
      div(:class="s.controlStack")
        label(:class="s.controlGroup")
          span(:class="s.controlLabel")
            span Palette hue
            output(:class="s.controlValue") {{ settings.hue }}°
          input(
            v-model.number="settings.hue"
            :class="s.range"
            type="range"
            min="0"
            max="360"
            aria-label="Palette hue"
          )
          span(:class="s.hueRamp" aria-hidden="true")

        div(:class="s.controlGroup")
          span(:class="s.controlLabel") Appearance
          div(:class="s.segmented")
            button(
              v-for="option in schemes"
              :key="option"
              :class="s.segment"
              :data-selected="settings.scheme === option ? '' : undefined"
              type="button"
              @click="choose('scheme', option)"
            ) {{ option }}

        label(:class="s.controlGroup")
          span(:class="s.controlLabel")
            span Radius seed
            output(:class="s.controlValue") {{ settings.radius }}px
          input(
            v-model.number="settings.radius"
            :class="s.range"
            type="range"
            min="0"
            max="26"
            aria-label="Radius seed"
          )

        label(:class="s.controlGroup")
          span(:class="s.controlLabel") Density
          select(v-model="settings.density" :class="s.select" aria-label="Density")
            option(v-for="option in densities" :key="option" :value="option") {{ option }}

        label(:class="s.controlGroup")
          span(:class="s.controlLabel") Elevation
          select(v-model="settings.elevation" :class="s.select" aria-label="Elevation")
            option(v-for="option in elevations" :key="option" :value="option") {{ option }}

        label(:class="s.controlGroup")
          span(:class="s.controlLabel") Typeface
          select(v-model="settings.font" :class="s.select" aria-label="Typeface")
            option(v-for="option in fonts" :key="option" :value="option") {{ option }}

        div(:class="s.controlGroup")
          span(:class="s.controlLabel") Motion profile
          div(:class="s.segmented")
            button(
              v-for="option in motions"
              :key="option"
              :class="s.segment"
              :data-selected="settings.motion === option ? '' : undefined"
              type="button"
              @click="choose('motion', option)"
            ) {{ option }}

      footer(:class="s.railFooter")
        button(:class="s.resetButton" type="button" @click="reset") Reset authored defaults
        p(:class="s.railNote") Persisted in a cookie and projected through the runtime snapshot before first paint.

    div(:class="s.workspace")
      header(:class="s.topbar")
        p(:class="s.breadcrumb") Prism / #[span(:class="s.breadcrumbStrong") Sparrow overview]
        div(:class="s.topActions")
          span(:class="[s.statusPill, s.statusTone]") {{ settings.scheme }} · {{ settings.density }}
          PrismButton(intent="ghost" size="sm" @click="dialogOpen = true") Inspect system

      div#studio-content(:class="s.canvasWrap")
        section(:class="s.application" aria-label="Responsive Sparrow application preview")
          nav(:class="s.appNav" aria-label="Sparrow")
            div(:class="s.brand")
              span(:class="s.brandMark" aria-hidden="true") S
              div(:class="s.brandText")
                strong Sparrow
                span(:class="s.brandTagline") Workspace
            button(
              v-for="(item, index) in navItems"
              :key="item"
              :class="s.appNavItem"
              :data-selected="index === 0 ? '' : undefined"
              type="button"
            )
              span(aria-hidden="true") {{ ['⌂', '◫', '↻', '⌁', '⚙'][index] }}
              span {{ item }}

          div(:class="s.appMain")
            header(:class="s.appHeader")
              div(:class="s.appTitleWrap")
                p(:class="s.appEyebrow") Realtime workspace
                h1(:class="s.appTitle") Overview
              PrismButton(size="sm" @click="progress = progress >= 100 ? 48 : progress + 7") New report

            div(:class="s.dashboard")
              div(:class="s.dashboardMain")
                div(:class="s.metricGrid")
                  article(:class="[s.metric, s.metricFeatured]")
                    span(:class="s.metricLabel") Active users
                    strong(:class="s.metricValue") 12,480
                    span(:class="s.metricDelta") +8.2% this week
                  article(:class="s.metric")
                    span(:class="s.metricLabel") Messages sent
                    strong(:class="s.metricValue") 48.3k
                    span(:class="s.metricDelta") +14.1%
                  article(:class="s.metric")
                    span(:class="s.metricLabel") Response rate
                    strong(:class="s.metricValue") 92%
                    span(:class="s.metricDelta") +2.5%
                  article(:class="s.metric")
                    span(:class="s.metricLabel") Avg. reply
                    strong(:class="s.metricValue") 2m 14s
                    span(:class="s.metricDelta") −18 seconds

                article(:class="s.panel")
                  header(:class="s.panelHead")
                    h2(:class="s.panelTitle") Engagement
                    span(:class="s.panelMeta") Last 12 weeks
                  div(
                    :class="s.chart"
                    :style="{ [s.chartAccentName]: `oklch(70% 0.13 ${settings.hue})` }"
                    role="img"
                    aria-label="Engagement increased over twelve weeks"
                  )
                    div(:class="s.chartBars" aria-hidden="true")
                      span(
                        v-for="(point, index) in chartPoints"
                        :key="index"
                        :class="s.chartBar"
                        :style="{ blockSize: `${point}%`, animationDelay: `${index * 22}ms` }"
                      )
                  div(:class="s.chartLegend")
                    span(:class="s.legendItem") #[i(:style="{ color: activeHue }") ●] Active users
                    span(:class="s.legendItem") Port-driven goal · {{ progress }}%
                  PrismProgress(:value="progress")

                article(:class="s.panel")
                  header(:class="s.panelHead")
                    h2(:class="s.panelTitle") Recent conversations
                    button(:class="s.resetButton" type="button") View all
                  div(:class="s.table")
                    div(v-for="person in people" :key="person.email" :class="s.tableRow")
                      div(:class="s.person")
                        span(:class="s.avatar" aria-hidden="true") {{ person.initials }}
                        span(:class="s.personText")
                          strong(:class="s.personName") {{ person.name }}
                          span(:class="s.personEmail") {{ person.email }}
                      span(:class="s.badge") {{ person.status }}
                      strong(:class="s.amount") {{ person.amount }}

              aside(:class="s.dashboardSide")
                article(:class="s.panel")
                  header(:class="s.panelHead")
                    h2(:class="s.panelTitle") Weekly goal
                    span(:class="s.panelMeta") {{ progress }}%
                  PrismProgress(:value="progress")
                  p(:class="s.activityCopy") One typed port moves the bar. The stylesheet remains static.

                article(:class="s.panel")
                  header(:class="s.panelHead")
                    h2(:class="s.panelTitle") Activity
                    span(:class="s.panelMeta") Live
                  div(:class="s.activity")
                    div(:class="s.activityItem")
                      span(:class="s.activityDot" aria-hidden="true")
                      p(:class="s.activityCopy") #[span(:class="s.activityStrong") Devon Marsh] started a new conversation.
                    div(:class="s.activityItem")
                      span(:class="s.activityDot" aria-hidden="true")
                      p(:class="s.activityCopy") Automation routed 3 tickets to Billing.
                    div(:class="s.activityItem")
                      span(:class="s.activityDot" aria-hidden="true")
                      p(:class="s.activityCopy") #[span(:class="s.activityStrong") Priya Foster] shared the weekly report.

        section(:class="[s.inspector, s.rawReach]" aria-labelledby="provenance-title")
          header(:class="s.inspectorHead")
            div
              p(:class="s.appEyebrow") Provenance, not guesswork
              h2#provenance-title(:class="s.inspectorTitle") Why does this look this way?
            p(:class="s.inspectorCopy") Each answer below comes from #[code ds.explain()] at build time. The private runtime slots stay private; semantic paths, branches, declarations, and CSS ownership remain inspectable.
          div(:class="s.provenanceGrid")
            article(v-for="fact in s.runtimeFacts" :key="fact.path" :class="s.provenanceCard")
              span(:class="s.provenanceLabel") {{ fact.label }}
              strong(:class="s.provenanceValue") {{ fact.path }} · &lt;{{ fact.type }}&gt;
              code(:class="s.provenanceCode") {{ fact.projection }}
              span(:class="s.panelMeta") {{ fact.detail }}

          PrismTabs(:items="inspectorTabs")

  Phase4Fixture
  Phase5Fixture

  PrismDialog(:open="dialogOpen" @close="dialogOpen = false")
    template(#title) One coherent system
    p(:class="s.inspectorCopy") The current runtime owns {{ settings.scheme }} scheme, {{ settings.density }} density, {{ settings.elevation }} elevation, and {{ settings.motion }} motion. Radius and font are mutable non-color tokens; hue is the only palette input.
</template>
