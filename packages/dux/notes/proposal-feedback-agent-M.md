# vane-dux proposal feedback — agent M

Review of `docs/dux-*.md` and `vane-dux/README.md`. Judging the vision and proposed API as documented — not implementation status.

---

## Simulation

### Task 1: Hello World — First Five Minutes

I've got a Nuxt 3 app. Install vane-dux, set up tokens, style a button.

```bash
npm install @mszr/vane-dux @mszr/vane-dux/nuxt
```

```TS
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@mszr/vane-dux/nuxt'],
  vane: { system: '~/design/system.style.ts' },
})
```

```TS
// design/tokens.style.ts
import { defineTokens, oklch, scale } from '@mszr/vane-dux'

export const t = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285).live(),
    surface: elevation(0.03),
    ink: elevation(0.94),
    onBrand: contrast(({ color }) => color.brand),
  },
  space: scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6 } }),
  radius: { sm: '4px', md: '8px', pill: '999px' },
})
```

```TS
// design/system.style.ts
import { createSystem } from '@mszr/vane-dux'
import { presetConditions } from '@mszr/vane-dux/preset'
import { t } from './tokens.style'

export const { css, recipe } = createSystem({
  tokens: t,
  conditions: { ...presetConditions },
  layers: ['reset', 'tokens', 'recipes', 'utilities', 'overrides'],
})
```

```TS
// components/Button.style.ts
import { recipe } from '~/design/system.style'
import { t } from '~/design/tokens.style'

export const button = recipe({
  base: { display: 'inline-flex', gap: t.space.xs, borderRadius: t.radius.sm },
  variants: {
    intent: {
      brand: { background: t.color.brand, color: t.color.onBrand },
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
  <button :class="button(props)"><slot /></button>
</template>
```

**Narration:** The `defineTokens` → `createSystem` → `recipe` → `VaneProps` chain is clean. Importing from one package — tokens, utilities, everything — is the right density. The `VaneProps<typeof button>` inference is the moment where this all clicks. My component props *are* the variant space. Zero prop-type restatement. That's the kind of API that disappears — you think about your interface, not the library. No friction in this flow. The mental model of "define tokens, bind a system, author styles, infer props" is clear and learnable.

---

### Task 2: Day-to-Day — Card with Responsive Padding, Hover, Cross-File Selector

```TS
// components/Card.style.ts
import { css } from '~/design/system.style'
import { t } from '~/design/tokens.style'
import { button } from '../Button/Button.style'

export const card = css({
  padding: t.space.md,
  background: t.color.surface,
  hover: { background: t.color.surfaceRaised },
  md: { padding: t.space.lg },
  [`${button} + &`]: { marginTop: t.space.sm },
})
```

**Narration:** The bare `hover:` and `md:` condition keys are exactly the right ergonomics. No `_hover`, no wrapper function. The property-first map (`color: { base, hover }`) is clever for tracking one property across states — I haven't seen that before and I like it. The cross-file selector `` [`${button} + &`] `` interpolates the generated class, so if I rename the `button` export, every reference follows. Find-references works. That's the kind of thing that saves you months down the line. The `&` is CSS nesting syntax, so it feels like CSS — not an escape hatch, just the language. This is a good day-to-day surface. It would feel natural on the 50th component.

---

### Task 3: Edge Case — Dynamic Progress Bar with Ports

```TS
// components/Progress.style.ts
import { css, port, ports } from '~/design/system.style'
import { t } from '~/design/tokens.style'

export const fraction = port<number>('fraction', { default: 0 })
export const tint = port<VaneColor>('tint', { default: t.color.brand })

export const track = css({
  background: t.color.surface,
  borderRadius: t.radius.pill,
  blockSize: t.space.sm,
})

export const fill = css({
  inlineSize: `calc(${fraction} * 100%)`,
  background: tint,
  blockSize: '100%',
  motionOk: { transition: 'inline-size 200ms ease' },
})
```

```vue
<!-- components/ProgressBar.vue -->
<script setup lang="ts">
import { usePorts } from '@mszr/vane-dux/vue'
import { fill, fraction, tint, track } from './Progress.style'

const props = defineProps<{ value: number; color?: string }>()
const fillStyle = usePorts(() => [
  ports(fraction.set(props.value / 100), tint.set(props.color ?? tint.default)),
])
</script>
<template>
  <div :class="track" role="progressbar">
    <div :class="fill" :style="fillStyle" />
  </div>
</template>
```

**Narration:** This is where I feel friction. The `port` declaration, the `set()`, the `ports()` merge, the `usePorts` wrapper — that's four layers of ceremony for a progress bar. In Vue's native `v-bind()`, it's one line in `<style>` and one binding in the template. The docs acknowledge the port is typed while `v-bind()` isn't. That's real value. But on the 50th port I'm setting up, I'd start wishing for a shorthand. Something like `usePorts({ fraction: () => props.value / 100 })` — an object form where the port is inferred from the key. Also: `usePorts(() => [...])` — why a thunk returning an array? I assume it's for reactivity (Vue's `computed` needs a getter), but the API could sugar this. The thunk is a minor annoyance, not a dealbreaker. The real question: is the typed port worth the ceremony over `v-bind()`? For a library author publishing a design system, absolutely — the type safety is non-negotiable. For a one-off dynamic value in an app component? The jury's out.

---

## Gut check

Excited. The vision is coherent, the API surface is clean, and the core ideas are *right*. This isn't "yet another wrapper around vanilla-extract" — it's a coherent design system philosophy that happens to emit vanilla-extract CSS. The `scheme()` API alone is worth the price of admission. I'd want to use this.

## Delight moments

1. **`scheme()` as a value inside a token, not a parallel palette.** "Add dark mode touches token definitions only — zero component edits" — this is the single best design decision in the docs. It eliminates the entire class of "dark mode maintenance" bugs. The mental model is *chef's kiss*: one token, two scheme values, CSS `light-dark()` does the work.

2. **`VaneProps<typeof button>` — variant props inferred, never restated.** This is the moment the API pays for itself. Your component's style contract *is* your variant space. No prop types to maintain, no drift possible. The Stitches model perfected.

3. **`elevation(n)` — one number, both schemes.** The hail-styl idea generalized. `surface: elevation(0.03)` is so much cleaner than maintaining light/dark surface colors. The fact that it compiles to `light-dark()` means zero runtime cost.

4. **Liveness propagation through relative color syntax.** Marking `.live()` on `brand` and having `brandSoft` automatically emit `oklch(from var(--vane-color-brand) l c h / 0.12)` — that's the compiler doing real work. One `applyTheme` call re-derives the world. This is the "user theming with zero recomputation" promise made real.

5. **Condition keys as bare identifiers, both nesting directions.** `hover: { ... }` and `color: { base, hover }` compile identically. No `_hover`, no wrapper. The factory refuses CSS property collisions at definition time — the two namespaces can never blur. This is the kind of detail that separates "good API" from "delightful API."

6. **Ports unify four mechanisms into one primitive.** Reactive styling, parent→child theming, consumer theming, dynamic utilities — all the same `port()`. The docs call this "one primitive covering four mechanisms" and it's true. That's the kind of abstraction that earns its complexity.

## Friction / dread moments

1. **Port ceremony for dynamic values.** Declaring a port, calling `set()`, wrapping in `ports()`, binding through `usePorts` — four steps for a progress bar. The typed port is objectively better than `v-bind()` for library consumers, but for app developers doing one-off dynamic values, the ceremony-to-value ratio is high. I'd want a shorthand form: `usePorts({ fraction: () => props.value / 100 })`.

2. **The sibling `.style.ts` file is an honest ergonomic regression.** The docs acknowledge this ("the one honest ergonomic regression versus SFCs"), but acknowledging it doesn't make it hurt less on the 50th component. The `atoms` lane softens it for small one-offs, but medium-complexity components — the ones that need 10-15 lines of CSS — still live in a separate file. `<style lang="ts">` being deferred is understandable but feels like the thing that would make or break daily adoption. The docs could be more upfront about this cost in the main pitch, not just buried in the Vue spec.

3. **The `preset` import pattern feels slightly loose.** Spreading `presetTokens(...)` into `defineTokens` works, but it's unclear whether the preset tokens are *defaults to override* or a *starting point to extend*. The docs say "opinions live where they're deletable" — good principle — but the API boundary could be sharper. Would `createSystem({ preset: 'prism', tokens: { ... } })` be cleaner than manual spreading?

4. **No `useRecipe` composable, and the docs are proud of it.** "Recipes bind through plain functions — no `useRecipe` composable exists, because a typed function needs no wrapper." I agree in principle — a typed function needs no wrapper. But in Vue SFCs, there's a muscle memory for composables. The *absence* of `useRecipe` is correct, but the docs could explicitly say "import the recipe function directly, no wrapper needed" in a prominent place to preempt the question.

## Mental model

vane-dux is a design system expressed as a typed TypeScript graph. Tokens are the foundation — a dependency DAG where values derive from values, liveness propagates through CSS, and schemes are value pairs inside tokens. Styles, recipes, and anatomies are build-time evaluations that compile to boring CSS. The runtime boundary is a typed port — one primitive for all dynamic values. You author design intent; the compiler projects it into CSS; anything alive crosses through a typed port. The three planes — contract, compiled, live — have different lifetimes and different costs, and vane-dux names the boundary between them.

## The first five minutes

The install-to-first-success path is clear: `npm install`, configure Nuxt module, define tokens, create system, write a recipe, use `VaneProps` in a component. That's 5 files, maybe 10 minutes. The friction point: you need to understand the three-plane model before you can use the API confidently. If you come from vanilla-extract, the token graph is a new concept. If you come from Panda, the absence of a config file and codegen is disorienting in a good way. If you come from Tailwind, the `.style.ts` file is a different world. The first five minutes are fine; the first *fifteen* minutes — where you internalize the mental model — are where the real investment happens.

## Day 50

The token graph and liveness propagation wear *extremely* well. Renaming a token used in 40 files with F2 instead of grep — that's the kind of thing that makes you never want to go back. The scheme system — adding dark mode by editing token definitions only — is the other thing that ages well. The port ceremony is the thing that starts to grate. By day 50, you've set up twenty ports and you want a shorthand. By day 100, you want the `<style lang="ts">` SFC block. The deferred intentions are the right deferrals, but they're the things you'll feel the absence of.

## Compared to alternatives

- **Vanilla-extract:** vane-dux is strictly more capable. The token graph, liveness, schemes, ports, and recipes are all absent from vanilla-extract's public API. The cost is a slightly steeper learning curve (three-plane model) and the sibling file regression. The payoff is a real design system model with type safety that vanilla-extract alone can't provide.

- **Panda CSS:** Panda has tokens, recipes, and conditions. But Panda's tokens are generated artifacts — a `panda codegen` step sits between "I defined a token" and "autocomplete knows it." vane-dux's tokens are plain TypeScript exports — inference is the codegen. Panda's config file is a second source of truth; vane-dux's `createSystem` call is the only configuration. vane-dux wins on authoring ergonomics; Panda's docs and community are more mature.

- **Tailwind:** Different category entirely. Tailwind is utility-first with no type safety. vane-dux is design-intent-first with full type safety. The `atoms` lane in the preset is the bridge — call-site utility authoring backed by the token map. A Tailwind refugee would find `atoms` familiar and the rest of vane-dux a different paradigm.

- **Vue's `v-bind()` in CSS:** vane-dux's port is typed `v-bind()`. Same mental model (static rule, reactive value), better properties (typed, multi-file, rename-safe). The ceremony is higher, the guarantees are stronger. For library authors, the trade is clearly worth it. For app developers, it depends on how much dynamic styling they do.

## One thing I'd cut, one thing I'd add

**Cut:** The `preset` from the initial docs focus. The core is the product — tokens, liveness, schemes, ports, recipes. The preset is opinionated convenience that can be layered on top. Every page explaining atoms and a11y helpers is a page that doesn't explain why `scheme()` is a breakthrough. The preset can ship later with zero breaking changes; the core needs to land first and land clean. Slim the preset to a one-paragraph "planned" note and focus the full docs weight on the token graph + liveness + ports trifecta.

**Add:** A minimal runnable example section in the README or a `examples/` directory. Not the full Prism demo — just a 20-line `tokens.style.ts` + `Button.style.ts` + `App.vue` that someone can paste into a fresh Nuxt project and run. The comparison sandbox is the long-form proof; the minimal example is the 5-minute proof. It would also serve as the "ground truth" for the docs — every code snippet in the specs could reference it as "see `examples/minimal/`."

## Delight score: 8

The vision scores 9, the API design 8, the naming precision 9, the mental model coherence 8.

**Highest-leverage change to reach 9:** Cut the preset from the initial docs focus. The core — tokens, liveness, schemes, ports, recipes — is the product. Slimming the preset to a one-paragraph "planned" note and focusing the full weight on the token graph + liveness + ports trifecta would make the pitch sharper and the delight score a 9. Everything else is polish on top of a vision that's already correct.
