# @mszr/vanity

**A delightful TypeScript harness for CSS: typed values, design systems, and styling APIs in — standards-aligned, boring CSS out.**

vanity replaces the CSS-preprocessor stack with the tooling code has had for a decade: autocomplete, real types, rename-symbol, find-references, instant diagnostics. It builds on [vanilla-extract](https://vanilla-extract.style)'s proven build-time compiler and asks one question of every surface: *what would feel most delightful to use?*

> **Status:** pre-release integration hardening — the canonical engine → system surface is implemented and exercised by runtime, type, editor-DX, output, integration, packaging, and browser tests. Publication waits on the release gate in the workspace docs; this README describes the current contract, not a stability promise.

## Start here

Two files and a config line to a button that looks good in **both schemes** — dark mode included, no second palette. The complete Prism design-system studio lives in `sandbox/demo-main`.

```TS
// nuxt.config.ts — or add the /vite plugin in vite.config.ts
import { vanityNuxtImports } from '@mszr/vanity/nuxt'

export default defineNuxtConfig({
  modules: ['@mszr/vanity/nuxt'],
  vanity: { system: '~/design/system.style.ts' },
  imports: { presets: [...vanityNuxtImports] },
})
```

```TS
// design/system.style.ts — an engine defines your system
import { createEngine } from '@mszr/vanity'

export const de = createEngine()

const tokens = de.defineTokens({
  color: { brand: de.oklch(0.58, 0.2, 285) },
  space: { xs: de.length.rem(0.5), sm: de.length.rem(0.75), md: de.length.rem(1) },
  radius: { sm: de.length.rem(0.375) },
}).derive(({ color }) => ({
  color: { onBrand: de.legibleOn(color.brand) },
}))

export const ds = de.createSystem({ tokens })
```

```TS
// components/AppButton.style.ts
import { ds } from '~/design/system.style'

export const button = ds.recipe({
  base: { display: 'inline-flex', gap: ds.t.space.xs, borderRadius: ds.t.radius.sm },
  variants: {
    intent: {
      brand: { background: ds.t.color.brand, color: ds.t.color.onBrand },
      ghost: { background: 'transparent' },
    },
    size: {
      sm: { paddingInline: ds.t.space.sm },
      md: { paddingInline: ds.t.space.md },
    },
  },
  defaults: { intent: 'brand', size: 'md' },
})
```

```vue
<!-- components/AppButton.vue -->
<template lang="pug">
button(:class="s.button(props)" :disabled="props.disabled")
  slot
</template>

<script setup lang="ts">
import * as s from './AppButton.style'

const props = defineProps({ ...propsOf(s.button), disabled: Boolean })
</script>
```

That's it. `propsOf` projects the recipe's variant space straight into the props declaration — one source of truth, so your props can never drift from your variants, and toggles get native boolean casting (`<AppButton pill>` just works). `button(props)` takes your component's whole props object: unknown keys are ignored, inline typos still die at the cursor. Everything below is reachable from here by *adding* keys, never by restructuring: hand-rolled tokens, cascade layers, your own conditions, whole custom presets.

## Highlights

🕸️ **Tokens are a composable graph, not a bag of strings** — `.derive(({ color }) => …)` sees the exact graph accumulated by earlier stages: `color.brand` completes, `color.braaand` is an error, and the relationship survives to the browser as live CSS. Split large systems into independently buildable modules and combine them with `.compose()` without losing inference or rename-symbol across files. Nuxt installs the graph-aware TypeScript bridge automatically.

🌗 **Schemes fall out, not pile up** — light/dark is a value pair inside a token (`light-dark()`), and elevation-based surfaces derive both modes from one number. Adding dark mode touches token definitions only — zero component edits.

🎨 **Runtime tuning with zero recomputation** — declare a value-agnostic mutable token, bind the finalized system to its real cascade root, and call `runtime.t.color.brand.$set(picked)`. Every surface, hover, tint, and text pairing re-derives in CSS; `$unset()` restores the authored value. No JS color math and no stylesheet patching.

⚓ **Ports: the runtime boundary, typed** — a port is a declared, defaulted CSS variable a style exposes as its public runtime interface. One primitive covers reactive component styling (`v-bind()` done right), parent→child theming (`:deep()` retired), consumer theming of shipped libraries, and dynamic utility values.

🧬 **Variants and anatomy** — Stitches-shaped `recipe()` with toggles and compound variants, and `anatomy()` for multi-part components (parts, not "slots" — that word belongs to Vue). Components publish their runtime style API right on the recipe: `button.ports.gap`.

📌 **Errors at the cursor, not the browser** — token paths, variant values, and condition names fail as type errors at the offending key; value grammar (`'8pxx'`) fails as a build diagnostic naming the file and line. A typo'd style can never silently do nothing.

♿ **Guarantees, not guidelines** — legibility pairings are checked at build (APCA), removed focus outlines without replacement are flagged, and preset motion respects `prefers-reduced-motion` by default.

🫗 **100% of CSS, no cliffs** — `:has()`, container queries, `@starting-style`, cascade layers: plain keys, validated, never blocked on the library. The escape hatch is CSS itself (`css.raw`), still scoped, still parsed, still auditable.

🍃 **Boring CSS out the back** — classes, custom properties, `@layer`s, `data-*` selectors. Zero runtime by default; devtools rules trace back to the `.style.ts` line and the token that decided each value. If vanity disappeared tomorrow, your app keeps ordinary CSS it can live on.

💚 **Vue and Nuxt, first-class** — `usePorts` for reactive values, `useAnatomy` for multi-part components, explicit opt-in import presets, optional style-module injection, a live DevTools view of tokens/recipes/ports, and SSR with no style pipeline. One component can adopt vanity inside an existing app; nothing demands a migration.

🤖 **Built for agents too** — a machine-readable manifest of tokens, classes, recipes, and ports (`.vanity/manifest.json`, live at `/__vanity/` in dev), including exact source positions and class→token provenance; audits flag unused tokens, near-duplicate values, and unaudited escapes, while precise diagnostics let a code-generating agent self-correct before a human ever looks at pixels.

## Install

```bash
npm install @mszr/vanity
```

`vue`, `nuxt`, `vite`, and `typescript` are optional peers — add only what your entrypoints use. Nuxt enables vanity's graph-aware rename bridge automatically. In a plain TypeScript/Vite project, opt into the same F2 rename behavior once:

```JSON
{
  "compilerOptions": {
    "plugins": [{ "name": "@mszr/vanity/typescript" }]
  }
}
```

## The shape

One package, a framework-agnostic core, thin overlays on top.

| Entrypoint | What it is |
| --- | --- |
| `@mszr/vanity` | `createEngine()` → engine-bound token modules and `de.createSystem()` → `ds.t`, styling APIs, and the configured value constructors |
| `@mszr/vanity/runtime` | the tree-shakeable live plane: explicit-target custom-property setters, runtime restoration, and port helpers |
| `@mszr/vanity/vite` | the Vite plugin: evaluates `*.style.ts`, emits CSS + the manifest |
| `@mszr/vanity/vue` | `propsOf`, `usePorts`, `useAnatomy` |
| `@mszr/vanity/nuxt` | the Nuxt module: Vite wiring, explicit import presets, optional style-module injection, SSR polish, DevTools |
| `@mszr/vanity/typescript` | graph-aware rename-symbol across token definitions, derivations, and consumers |
| `@mszr/vanity/preset` | the deletable opinions: `presetTokens`, `presetConditions`, `presetAtoms`, a11y + motion helpers, layout patterns |

## Going further

The preset is a furnished room, not the house. Hand-roll the token graph when you're ready — derivations, mutability, axes, and legibility checks included:

```TS
// design/engine.ts
import { createEngine } from '@mszr/vanity'

export const de = createEngine()
```

```TS
// design/palette.tokens.ts
import { de } from './engine'

export const palette = de.defineTokens({
  color: {
    brand: de.token.color({
      val: de.oklch(0.58, 0.2, 285),
      mutable: true,                                      // runtime-addressable input
    }),
    surfacePlane: de.scheme({ light: de.oklch(0.96, 0, 0), dark: de.oklch(0.16, 0, 0) }),
    inkPlane: de.scheme({ light: de.oklch(0.14, 0, 0), dark: de.oklch(0.94, 0, 0) }),
  },
  space: de.scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6 } }).tokens(),
  radius: { sm: '4px', md: '8px', pill: '999px' },
})
  .derive(({ color }) => ({
    color: {
      surface: de.mix(color.surfacePlane, color.brand, 0.04), // explicit graph edge
      ink: de.mix(color.inkPlane, color.brand, 0.04),
      brandSoft: de.alpha(color.brand, 0.12),                 // CSS-reactive by default
      brandHover: de.lighten(color.brand, 0.06),
      onBrand: de.legibleOn(color.brand),                     // checked at build (APCA)
    },
  }))
```

Stages are the topological order. A stage can reference every earlier token and cannot reference its own output; the next stage sees that output with exact completions. Cycles and forward references are therefore unrepresentable. Modules deliberately have no `.build()`—the final system is the only owner of prefix, names, root, and emission.

Large systems split without a parallel module API—the same builder is useful alone or as part of a larger graph:

```TS
// palette.tokens.ts
export const palette = de.defineTokens({
  color: {
    brand: de.token.color({ val: de.oklch(0.58, 0.2, 285), mutable: true }),
  },
}).derive(({ color }) => ({
  color: { brandSoft: de.alpha(color.brand, 0.12) },
}))

// foundations.tokens.ts
export const foundations = de.defineTokens({
  space: de.scale.linear({ unit: 4, steps: { sm: 2, md: 4 } }).tokens(),
})

// system.style.ts
export const ds = de.createSystem({
  tokens: de.defineTokens().compose(palette).compose(foundations),
})
```

Composition is immutable, rejects duplicate leaf paths at the `.compose()` call, and keeps rename-symbol connected from the contributing source module through `ds.t` consumers.

Mutable values cross through a root-bound runtime, not a global registry or stylesheet lookup. Export the serializable runtime factory from the system module:

```TS
// design/system.style.ts
export const studioRuntime = ds.runtime
export const studioRuntimeProps = ds.runtimeProps
```

```TS
// app code — the target must match the system's declared root (`:root` here)
const runtime = studioRuntime(document.documentElement)

runtime.t.color.brand.$set('oklch(62% 0.2 210)')
runtime.t.color.brand.$unset() // authored CSS wins again
runtime.setMode('density', 'compact')

const snapshot = runtime.snapshot()
const ssrProps = studioRuntimeProps(snapshot)
```

Snapshots contain semantic token paths and authored branch addresses, never private slot names. `runtimeProps()` projects a validated snapshot into root attributes and inline custom properties for SSR; binding with the same snapshot hydrates without rewriting the first paint.

## Typed CSS values and ports

CSS values use the same config-agnostic primitives everywhere—tokens, styles, keyframes, ports, atoms, and raw interpolation:

```TS
import { ds } from '~/design/system.style'

const fluidSpace = ds.clamp('1rem', ds.calc('2vw').add('0.5rem'), '3rem')
const cards = ds.grid.repeat('auto-fit', ds.grid.minmax('16rem', '1fr'))
const quietBrand = ds.oklch.from(ds.t.color.brand, {
  c: ds.channel.multiply(0.5),
  alpha: 0.72,
})
```

`calc()` tracks known CSS dimensions, preserves precedence across nested expressions, and rejects known-invalid arithmetic such as length + angle at the operand. Strings remain the universal escape for already-natural CSS.

And cross the runtime boundary through a typed port — reactive values, no runtime CSS:

```TS
// components/Progress.style.ts
import { ds } from '~/design/system.style'

export const fraction = ds.port(0) // typed by its default, named by its export

export const track = ds.css({ background: ds.t.color.surface, borderRadius: ds.t.radius.pill })
export const fill = ds.css({
  inlineSize: `calc(${fraction} * 100%)`, // strings stay natural when the CSS already reads cleanly
  background: ds.t.color.brand,
  motionOk: { transition: 'inline-size 200ms ease' },
})
```

```vue
<template>
  <div :class="track" role="progressbar" :aria-valuenow="value">
    <div :class="fill" :style="fillStyle" />
  </div>
</template>

<script setup lang="ts">
import { usePorts } from '@mszr/vanity/vue'
import { fill, fraction, track } from './Progress.style'

const props = defineProps<{ value: number }>()
const fillStyle = usePorts(() => [fraction.set(props.value / 100)])
</script>
```

## Coming from SFC styles

Vue's scoped-style machinery is a set of workarounds for CSS-the-global-language. A compiled, module-scoped model doesn't reimplement the workarounds — it removes the problems they work around. Each habit's home:

| SFC feature | Compensates for | In vanity |
| --- | --- | --- |
| `scoped` + `[data-v-x]` | the global namespace | dissolved — every class is hashed; scoping is automatic and cheaper (no attribute selectors) |
| `:deep(.child)` | piercing the scope wall to theme children | **ports** for values; typed class interpolation for structure |
| `:slotted()` | parent markup in child scope | non-issue — you style what you hold a class reference to; slotted markup already carries the parent's classes |
| `:global()` | escaping the scope wall | `globalCss()` / the `overrides` layer |
| `v-bind(expr)` in CSS | reactive values in static styles | **ports** + `usePorts` |

## The one hard contract

**vanity owes the browser boring CSS, not API compatibility to any SDK.** Everything it emits is plain, standards-track CSS — classes, custom properties, layers, data attributes.

## Development

Vanity's source repository contains the package, design documents, maintainer scripts, benchmarks, and demos.

## Docs

- [`vanity-vision.md`](https://github.com/mareszhar/vanity/blob/main/docs/vanity-vision.md) — philosophy, principles, architecture, and documentation map
- [`vanity-language.md`](https://github.com/mareszhar/vanity/blob/main/docs/vanity-language.md) — vocabulary, naming law, and public shapes
- [`vanity-patterns.md`](https://github.com/mareszhar/vanity/blob/main/docs/vanity-patterns.md) — the cross-cutting behavioral law
- [`docs/`](https://github.com/mareszhar/vanity/tree/main/docs) — domain specifications, evidence policy, demos, and maintainer guidance
