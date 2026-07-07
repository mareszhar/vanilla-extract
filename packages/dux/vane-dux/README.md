# @mszr/vane-dux

**A DX/UX-first design-system engine for TypeScript: typed tokens, styles, variants, and anatomy in — boring, zero-runtime CSS out.**

vane-dux replaces the CSS-preprocessor stack with the tooling code has had for a decade: autocomplete, real types, rename-symbol, find-references, instant diagnostics. It builds on [vanilla-extract](https://vanilla-extract.style)'s proven build-time compiler and asks one question of every surface: *what would feel most delightful to use?*

> **Status:** pre-release. The design is settled and specced ([docs](#docs)); implementation is underway. The API below is the contract the specs drive toward.

## Highlights

🕸️ **Tokens are a graph, not a bag of strings** — derive a token from another (`brandSoft: ({ color }) => alpha(color.brand, 0.12)`) and the relationship survives to the browser as live CSS (`oklch(from var(--vane-color-brand) …)`). Rename a token and forty files follow; delete one and every usage turns red.

🌗 **Schemes fall out, not pile up** — light/dark is a value pair inside a token (`light-dark()`), and elevation-based surfaces derive both modes from one number. Adding dark mode touches token definitions only — zero component edits.

🎨 **User theming with zero recomputation** — mark a token `.live()`, call `applyTheme(el, { color: { brand: picked } })`, and every surface, hover, tint, and text pairing re-derives in the browser's cascade. No JS color math at runtime.

⚓ **Ports: the runtime boundary, typed** — a port is a declared, defaulted CSS variable a style exposes as its public runtime interface. One primitive covers reactive component styling (`v-bind()` done right), parent→child theming (`:deep()` retired), consumer theming of shipped libraries, and dynamic utility values.

🧬 **Variants and anatomy** — Stitches-shaped `recipe()` with toggles and compound variants, and `anatomy()` for multi-part components (parts, not "slots" — that word belongs to Vue). Variant props are inferred: `VaneProps<typeof button>` *is* your component's style contract.

📌 **Errors at the cursor, not the browser** — token paths, variant values, and condition names fail as type errors at the offending key; value grammar (`'8pxx'`) fails as a build diagnostic naming the file and line. A typo'd style can never silently do nothing.

♿ **Guarantees, not guidelines** — contrast pairings are checked at build (APCA), removed focus outlines without replacement are flagged, and preset motion respects `prefers-reduced-motion` by default.

🫗 **100% of CSS, no cliffs** — `:has()`, container queries, `@starting-style`, cascade layers: plain keys, validated, never blocked on the library. The escape hatch is CSS itself (`css.raw`), still scoped, still parsed, still auditable.

🍃 **Boring CSS out the back** — classes, custom properties, `@layer`s, `data-*` selectors. Zero runtime by default; devtools rules trace back to the `.style.ts` line and the token that decided each value.

💚 **Vue and Nuxt, first-class** — `usePorts` for reactive values, a Nuxt module with auto-imports and DevTools, SSR with no style pipeline at all. One component can adopt vane-dux inside an existing app; nothing demands a migration.

🤖 **Built for agents too** — a machine-readable manifest of tokens, recipes, and ports, plus diagnostics precise enough that a code-generating agent self-corrects before a human ever looks at pixels.

## Install

```bash
npm install @mszr/vane-dux
```

`vue`, `nuxt`, and `vite` are optional peers — add only what your entrypoints use.

## The shape

One package, a framework-agnostic core, thin overlays on top.

| Entrypoint | What it is |
| --- | --- |
| `@mszr/vane-dux` | `defineTokens`, `createSystem` → `css`, `recipe`, `anatomy`, `keyframes`, `globalCss`, `port`, `theme` |
| `@mszr/vane-dux/runtime` | the ~300-byte live plane: `applyTheme`, port helpers |
| `@mszr/vane-dux/vite` | the Vite plugin: evaluates `*.style.ts`, emits CSS + the manifest |
| `@mszr/vane-dux/vue` | `usePorts` and the Vue helpers |
| `@mszr/vane-dux/nuxt` | the Nuxt module: auto-imports, SSR polish, DevTools |
| `@mszr/vane-dux/preset` | the deletable opinions: default tokens/conditions, `atoms`, a11y + motion helpers, layout patterns |

## A taste

```TS
// design/tokens.style.ts
export const t = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285).live(),
    surface: elevation(0.03),
    ink: elevation(0.94),
    brandSoft: ({ color }) => alpha(color.brand, 0.12),
    brandHover: ({ color }) => color.brand.lighten(0.06),
    onBrand: contrast(({ color }) => color.brand),
  },
  space: scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6 } }),
  radius: { sm: '4px', md: '8px', pill: '999px' },
})
```

```TS
// components/Button.style.ts
export const button = recipe({
  base: { display: 'inline-flex', gap: t.space.xs, borderRadius: t.radius.sm },
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
import { button } from './Button.style'
import type { VaneProps } from '@mszr/vane-dux'

const props = defineProps<VaneProps<typeof button>>()
</script>

<template>
  <button :class="button(props)">
    <slot />
  </button>
</template>
```

```vue
<!-- reactive values cross through a typed port -->
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

## The one hard contract

**vane-dux owes the browser boring CSS, not API compatibility to any SDK.** Everything it emits is plain, standards-track CSS — classes, custom properties, layers, data attributes. If vane-dux disappeared tomorrow, your app keeps ordinary CSS it can live on.

## Development

The public `vane-dux` repo is the package face. Design docs, maintainer scripts, and the comparison sandbox live in the dux workspace inside the vanilla-extract fork ([public link](https://github.com/mareszhar/vanilla-extract/tree/dux/packages/dux) | [local fork path](..)).

## Docs

- `dux-vision.md` ([public link](https://github.com/mareszhar/vanilla-extract/blob/dux/packages/dux/docs/dux-vision.md) | [local fork path](../docs/dux-vision.md)) — philosophy, principles, architecture, roadmap
- `dux-language.md` ([public link](https://github.com/mareszhar/vanilla-extract/blob/dux/packages/dux/docs/dux-language.md) | [local fork path](../docs/dux-language.md)) — vocabulary, naming law, doc style
- `dux-patterns.md` ([public link](https://github.com/mareszhar/vanilla-extract/blob/dux/packages/dux/docs/dux-patterns.md) | [local fork path](../docs/dux-patterns.md)) — the cross-cutting behavioral law
- `dux-spec-*.md` ([public link](https://github.com/mareszhar/vanilla-extract/tree/dux/packages/dux/docs) | [local fork path](../docs)) — one spec per domain, plus the maintainer manual
