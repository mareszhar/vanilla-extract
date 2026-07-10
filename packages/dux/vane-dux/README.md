# @mszr/vane-dux

**A DX/UX-first design-system engine for TypeScript: typed tokens, styles, variants, and anatomy in — boring, zero-runtime CSS out.**

vane-dux replaces the CSS-preprocessor stack with the tooling code has had for a decade: autocomplete, real types, rename-symbol, find-references, instant diagnostics. It builds on [vanilla-extract](https://vanilla-extract.style)'s proven build-time compiler and asks one question of every surface: *what would feel most delightful to use?*

> **Status:** v0 — every domain is implemented, locked by a four-plane test suite (runtime behavior, type shapes, editor DX, emitted CSS), and exercised by runnable demos, including a five-stack comparison matrix. The API below is the shipped contract.

## Start here

Two files and a config line to a button that looks good in **both schemes** — dark mode included, no second palette. (Runnable copy: `sandbox/demo-minimal`.)

```TS
// nuxt.config.ts — or add the /vite plugin in vite.config.ts
export default defineNuxtConfig({
  modules: ['@mszr/vane-dux/nuxt'],
  vane: { system: '~/design/system.style.ts' },
})
```

```TS
// design/system.style.ts — your whole design system, one call
import { createSystem } from '@mszr/vane-dux'
import { presetConditions, presetTokens } from '@mszr/vane-dux/preset'

export const { t, css, recipe, anatomy, port, theme } = createSystem({
  tokens: presetTokens({ brand: '#635bff' }),
  conditions: presetConditions(), // adds breakpoints, container sizes, headless states
})
```

```TS
// components/AppButton.style.ts
import { recipe, t } from '~/design/system.style'

export const button = recipe({
  base: { ...t.text.body, display: 'inline-flex', gap: t.space.xs, borderRadius: t.radius.sm },
  variants: {
    intent: {
      brand: { background: t.color.brand, color: t.color.onBrand, hover: { background: t.color.brandHover } },
      ghost: { background: 'transparent', hover: { background: t.color.brandSoft } },
    },
    size: {
      sm: { paddingInline: t.space.sm },
      md: { paddingInline: t.space.md },
    },
  },
  defaults: { intent: 'brand', size: 'md' },
})
```

```vue
<!-- components/AppButton.vue -->
<script setup lang="ts">
import { propsOf } from '@mszr/vane-dux/vue'
import { button } from './AppButton.style'

const props = defineProps({ ...propsOf(button), disabled: Boolean })
</script>

<template>
  <button :class="button(props)" :disabled="disabled">
    <slot />
  </button>
</template>
```

That's it. `propsOf` projects the recipe's variant space straight into the props declaration — one source of truth, so your props can never drift from your variants, and toggles get native boolean casting (`<AppButton pill>` just works). `button(props)` takes your component's whole props object: unknown keys are ignored, inline typos still die at the cursor. Everything below is reachable from here by *adding* keys, never by restructuring: hand-rolled tokens, cascade layers, your own conditions, whole custom presets.

## Highlights

🕸️ **Tokens are a graph, not a bag of strings** — derive a token from another (`brandSoft: ({ color }) => alpha(color.brand, 0.12)`) and the relationship survives to the browser as live CSS (`oklch(from var(--vane-color-brand) …)`). Rename a token and forty files follow; delete one and every usage turns red.

🌗 **Schemes fall out, not pile up** — light/dark is a value pair inside a token (`light-dark()`), and elevation-based surfaces derive both modes from one number. Adding dark mode touches token definitions only — zero component edits.

🎨 **User theming with zero recomputation** — mark a token `.live()`, call `applyTheme(el, t, { color: { brand: picked } })`, and every surface, hover, tint, and text pairing re-derives in the browser's cascade. No JS color math at runtime — and only declared live inputs are accepted, at the type level.

⚓ **Ports: the runtime boundary, typed** — a port is a declared, defaulted CSS variable a style exposes as its public runtime interface. One primitive covers reactive component styling (`v-bind()` done right), parent→child theming (`:deep()` retired), consumer theming of shipped libraries, and dynamic utility values.

🧬 **Variants and anatomy** — Stitches-shaped `recipe()` with toggles and compound variants, and `anatomy()` for multi-part components (parts, not "slots" — that word belongs to Vue). Components publish their runtime style API right on the recipe: `button.ports.gap`.

📌 **Errors at the cursor, not the browser** — token paths, variant values, and condition names fail as type errors at the offending key; value grammar (`'8pxx'`) fails as a build diagnostic naming the file and line. A typo'd style can never silently do nothing.

♿ **Guarantees, not guidelines** — legibility pairings are checked at build (APCA), removed focus outlines without replacement are flagged, and preset motion respects `prefers-reduced-motion` by default.

🫗 **100% of CSS, no cliffs** — `:has()`, container queries, `@starting-style`, cascade layers: plain keys, validated, never blocked on the library. The escape hatch is CSS itself (`css.raw`), still scoped, still parsed, still auditable.

🍃 **Boring CSS out the back** — classes, custom properties, `@layer`s, `data-*` selectors. Zero runtime by default; devtools rules trace back to the `.style.ts` line and the token that decided each value. If vane-dux disappeared tomorrow, your app keeps ordinary CSS it can live on.

💚 **Vue and Nuxt, first-class** — `usePorts` for reactive values, `useAnatomy` for multi-part components, a Nuxt module whose auto-imports reach your style files and whose DevTools tab browses your tokens, recipes, and ports live, SSR with no style pipeline at all. One component can adopt vane-dux inside an existing app; nothing demands a migration.

🤖 **Built for agents too** — a machine-readable manifest of tokens, recipes, and ports (`.vane/manifest.json`, live at `/__vane/` in dev), audits that flag unused tokens, near-duplicate values, and unaudited escapes, and diagnostics precise enough that a code-generating agent self-corrects before a human ever looks at pixels.

## Install

```bash
npm install @mszr/vane-dux
```

`vue`, `nuxt`, and `vite` are optional peers — add only what your entrypoints use.

## The shape

One package, a framework-agnostic core, thin overlays on top.

| Entrypoint | What it is |
| --- | --- |
| `@mszr/vane-dux` | `createSystem` → `t`, `css`, `recipe`, `anatomy`, `keyframes`, `globalCss`, `port`, `theme`, `defineAtoms`; `defineTokens` for standalone token graphs |
| `@mszr/vane-dux/runtime` | the ~300-byte live plane: `applyTheme`, `setScheme`, port helpers |
| `@mszr/vane-dux/vite` | the Vite plugin: evaluates `*.style.ts`, emits CSS + the manifest |
| `@mszr/vane-dux/vue` | `propsOf`, `usePorts`, `useAnatomy` |
| `@mszr/vane-dux/nuxt` | the Nuxt module: auto-imports (style files included), SSR polish, DevTools |
| `@mszr/vane-dux/preset` | the deletable opinions: `presetTokens`, `presetConditions`, `presetAtoms`, a11y + motion helpers, layout patterns |

## Going further

The preset is a furnished room, not the house. Hand-roll the token graph when you're ready — derivations, liveness, and legibility checks included:

```TS
// design/tokens.style.ts
import { alpha, defineTokens, elevation, legibleOn, oklch, scale } from '@mszr/vane-dux'

export const t = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285).live(),                // user-themeable at runtime
    surface: elevation(0.03),                           // both schemes from one number
    ink: elevation(0.94),
    brandSoft: ({ color }) => alpha(color.brand, 0.12), // stays live in the browser
    brandHover: ({ color }) => color.brand.lighten(0.06),
    onBrand: ({ color }) => legibleOn(color.brand),     // checked at build (APCA)
  },
  space: scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6 } }),
  radius: { sm: '4px', md: '8px', pill: '999px' },
})
```

And cross the runtime boundary through a typed port — reactive values, no runtime CSS:

```TS
// components/Progress.style.ts
import { css, port, t } from '~/design/system.style'

export const fraction = port(0) // typed by its default, named by its export

export const track = css({ background: t.color.surface, borderRadius: t.radius.pill })
export const fill = css({
  inlineSize: `calc(${fraction} * 100%)`,
  background: t.color.brand,
  motionOk: { transition: 'inline-size 200ms ease' },
})
```

```vue
<script setup lang="ts">
import { usePorts } from '@mszr/vane-dux/vue'
import { fill, fraction, track } from './Progress.style'

const props = defineProps<{ value: number }>()
const fillStyle = usePorts(() => [fraction.set(props.value / 100)])
</script>

<template>
  <div :class="track" role="progressbar" :aria-valuenow="value">
    <div :class="fill" :style="fillStyle" />
  </div>
</template>
```

## Coming from SFC styles

Vue's scoped-style machinery is a set of workarounds for CSS-the-global-language. A compiled, module-scoped model doesn't reimplement the workarounds — it removes the problems they work around. Each habit's home:

| SFC feature | Compensates for | In vane-dux |
| --- | --- | --- |
| `scoped` + `[data-v-x]` | the global namespace | dissolved — every class is hashed; scoping is automatic and cheaper (no attribute selectors) |
| `:deep(.child)` | piercing the scope wall to theme children | **ports** for values; typed class interpolation for structure |
| `:slotted()` | parent markup in child scope | non-issue — you style what you hold a class reference to; slotted markup already carries the parent's classes |
| `:global()` | escaping the scope wall | `globalCss()` / the `overrides` layer |
| `v-bind(expr)` in CSS | reactive values in static styles | **ports** + `usePorts` |

## The one hard contract

**vane-dux owes the browser boring CSS, not API compatibility to any SDK.** Everything it emits is plain, standards-track CSS — classes, custom properties, layers, data attributes.

## Development

The public `vane-dux` repo is the package face. Design docs, maintainer scripts, and the comparison sandbox live in the dux workspace inside the vanilla-extract fork ([public link](https://github.com/mareszhar/vanilla-extract/tree/dux/packages/dux) | [local fork path](..)).

## Docs

- `dux-vision.md` ([public link](https://github.com/mareszhar/vanilla-extract/blob/dux/packages/dux/docs/dux-vision.md) | [local fork path](../docs/dux-vision.md)) — philosophy, principles, architecture, roadmap
- `dux-language.md` ([public link](https://github.com/mareszhar/vanilla-extract/blob/dux/packages/dux/docs/dux-language.md) | [local fork path](../docs/dux-language.md)) — vocabulary, naming law, doc style
- `dux-patterns.md` ([public link](https://github.com/mareszhar/vanilla-extract/blob/dux/packages/dux/docs/dux-patterns.md) | [local fork path](../docs/dux-patterns.md)) — the cross-cutting behavioral law
- `dux-spec-*.md` ([public link](https://github.com/mareszhar/vanilla-extract/tree/dux/packages/dux/docs) | [local fork path](../docs)) — one spec per domain, plus the maintainer manual
