updated: 2026-07-06
status: spec — contracts settled, implementation pending

# vane-dux — spec: vue + nuxt

The framework overlays: where the delight investment goes, because Vue has never had a first-class typed build-time styling citizen. The core stays framework-free ([dux-vision.md §1.3](./dux-vision.md#13-vue-and-nuxt-are-the-first-clients-not-the-definition)); `/vue` and `/nuxt` are thin sugar over the core's three currencies — CSS, class strings, style-object fragments. Phase 6 of the roadmap.

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | `usePorts` | ☐ |
| 2 | `useAnatomy` | ☐ |
| 3 | The SFC mapping | ☐ |
| 4 | The Nuxt module | ☐ |
| 5 | SSR and HMR | ☐ |
| 6 | Colocation stance | ☐ |

---

## 1. `usePorts`

**Why.** Vue's `v-bind()` in CSS has the right mental model — static rule, reactive value — with the wrong properties: stringly, SFC-only, invisible to refactoring. `usePorts` is the same idea over typed port setters.

**Usage.**

```vue
<script setup lang="ts">
import { usePorts } from '@mszr/vane-dux/vue'
import { fill, fraction, track } from './Progress.style'

const props = defineProps<{ value: number, max?: number }>()

const fillStyle = usePorts(() => [
  fraction.set(props.value / (props.max ?? 100)),
])
</script>

<template>
  <div :class="track" role="progressbar" :aria-valuenow="value">
    <div :class="fill" :style="fillStyle" />
  </div>
</template>
```

**Contract details.**

- Reactive, typed, SSR-safe: a `computed()` merging port fragments — deliberately trivial, which is the mark of a boundary drawn in the right place.
- Accepts a thunk returning fragments (reactive) or plain fragments (static); the thunk's array **is** the merge — no `ports()` wrapper inside ([dux-spec-ports.md §2](./dux-spec-ports.md#2-setters-and-the-ports-merge)). The return binds to `:style` and serializes on the server ([dux-spec-ports.md §5](./dux-spec-ports.md#5-ssr)).
- Everything `v-bind()` offers — cascade-powered, no style recalc storms — with none of its limits: works across files, outside SFCs, rename-safe.

---

## 2. `useAnatomy`

**Why.** An anatomy call returns a record of part classes, and Vue's reactivity has a trap waiting there: `const d = dialog(props)` in `<script setup>` computes once and silently stops tracking. The correct `computed(() => dialog(props))` works but is the kind of pattern every first-timer discovers via a confused bug. This is the one place the "a typed function needs no wrapper" rule bends — because here the wrapper carries reactivity, not ceremony.

**Usage.**

```vue
<script setup lang="ts">
import { useAnatomy } from '@mszr/vane-dux/vue'
import { dialog } from './Dialog.style'
import type { VaneProps } from '@mszr/vane-dux'

const props = defineProps<VaneProps<typeof dialog>>()
const d = useAnatomy(dialog, props)
</script>

<template>
  <div :class="d.backdrop" />
  <div :class="d.positioner" role="dialog">
    <div :class="d.content">
      <h2 :class="d.title"><slot name="title" /></h2>
      <slot />
    </div>
  </div>
</template>
```

**Contract details.**

- Accepts the reactive props object directly (props are reactive) or a getter (`useAnatomy(dialog, () => ({ size: props.size }))`); returns a reactive, typed record of part classes — `d.content` in the template, no `.value`, no repeated calls.
- The call-site law applies unchanged: a wider props object flows through; unknown keys are ignored ([dux-spec-recipes.md §4](./dux-spec-recipes.md#4-the-call-site-props-in-classes-out)).
- Single-class recipes stay wrapper-free: `:class="button(props)"` inline is already reactive, and no `useRecipe` exists (principle 10 — a wrapper must carry something, and there it would carry nothing).

---

## 3. The SFC mapping

**Why.** Vue's scoped-style machinery is a set of workarounds for CSS-the-global-language. A compiled, module-scoped model doesn't reimplement the workarounds — it removes the problems they work around. The mapping is documentation-as-contract; migrating users must find each habit's home:

| SFC feature | Compensates for | In vane-dux |
| --- | --- | --- |
| `scoped` + `[data-v-x]` | the global namespace | dissolved — every class is hashed; scoping is automatic and cheaper (no attribute selectors) |
| `:deep(.child)` | piercing the scope wall to theme children | **ports** for values ([dux-spec-ports.md §4](./dux-spec-ports.md#4-child-and-consumer-theming)); typed class interpolation for structure ([dux-spec-css.md §4](./dux-spec-css.md#4-selectors-and-cross-file-references)) |
| `:slotted()` | parent markup in child scope | non-issue — you style what you hold a class reference to; slotted markup already carries the parent's classes |
| `:global()` | escaping the scope wall | `globalCss()` / the `overrides` layer |
| `v-bind(expr)` in CSS | reactive values in static styles | **ports** + `usePorts` |

**Contract details.** This table ships in the package docs verbatim; the demo app exercises every row. Recipes bind through plain functions — import the recipe and call it, no wrapper needed; `useAnatomy` ([§2](#2-useanatomy)) is the sole composable beyond `usePorts`, and it exists for reactivity, not style.

---

## 4. The Nuxt module

**Why.** Nuxt is where the zero-runtime payoff is largest — styles are `<link>`-able static CSS, so SSR, streaming, and prerendering need no style pipeline at all — and where setup ceremony would otherwise concentrate.

**Usage.**

```TS
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@mszr/vane-dux/nuxt'],
  vane: {
    system: '~/design/system.style.ts',
  },
})
```

**Contract details.**

- Wires the `/vite` plugin; auto-imports the system's bound functions and `t` per config; registers the manifest emission.
- **Auto-imports reach `*.style.ts` too.** The two-imports-per-style-file tax (`css` + `t`) is exactly where auto-imports matter most, so the module extends them into evaluated style modules, not just app code. Plain-Vite users get the same via a documented unimport recipe; the explicit imports always remain valid (and are what library code ships with).
- Nuxt DevTools tab: token browser (values per scheme, usage counts), recipe/anatomy inspector, click-a-node → jump to the `.style.ts` source ([dux-spec-introspection.md](./dux-spec-introspection.md)).
- Adoption slope contract: one component in an existing Nuxt app can adopt vane-dux with the module + one `.style.ts` file — no migration, no global buy-in.

---

## 5. SSR and HMR

**Why.** Instant feedback is a first-class requirement: edit a style, see the pixel, keep component state.

**Contract details.**

- **HMR:** editing a `.style.ts` hot-swaps the emitted CSS without a full reload or component state loss (the substrate's vite pipeline provides this; the contract locks it — a regression here is a release blocker).
- **SSR:** static styles ship as stylesheets; port values as inline style; no FOUC, no hydration style mismatch, no per-request collection.
- **Scheme flash:** SSR of a user-forced scheme uses the documented cookie + `data-scheme` recipe shipped with the module ([dux-spec-tokens.md §3](./dux-spec-tokens.md#3-schemes)) — the standard dance no zero-runtime system escapes, shipped rather than left to users.

---

## 6. Colocation stance

**Why.** The one honest ergonomic regression versus SFCs: styles move from `<style>` in the same file to a sibling `Button.style.ts`. Stated plainly rather than papered over.

**Contract details.**

- The sibling `*.style.ts` module is the stable, portable authoring form — required by the evaluation model ([dux-patterns.md §1](./dux-patterns.md#1-evaluate-dont-extract-compile-dont-run)).
- The sting is smallest exactly where colocation matters most: design-system styles (tokens, recipes, anatomies) *want* their own files, and small one-off styling stays short through `atoms` ([dux-spec-preset.md §3](./dux-spec-preset.md#3-atoms)) and `overrides`-layer `css()` calls.
- `<style lang="ts">` — compiled as a virtual style module, same evaluation model, zero new semantics — is a deferred intention with a named trigger ([dux-vision.md §8](./dux-vision.md#8-deferred-intentions)). It is a nicety, not a foundation; saying so keeps the project honest about custom-editor-tooling costs.
