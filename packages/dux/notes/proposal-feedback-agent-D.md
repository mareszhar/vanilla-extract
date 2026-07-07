# vane-dux proposal feedback (agent-D)

Review performed 2026-07-07 against docs at `packages/dux/docs/`. Nothing is implemented yet; all reactions are to the documented contracts and proposed API.

---

## Simulations

### 1. Hello World — first component, first five minutes

```TS
// design/tokens.style.ts
import { defineTokens, oklch, elevation, scale, alpha, contrast } from '@mszr/vane-dux'

export const t = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285),
    surface: elevation(0.03),
    ink: elevation(0.94),
    brandSoft: ({ color }) => alpha(color.brand, 0.12),
    onBrand: contrast(({ color }) => color.brand),
  },
  space: scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6 } }),
  radius: { sm: '4px', md: '8px', pill: '999px' },
})
```

```TS
// design/system.style.ts
import { createSystem, media } from '@mszr/vane-dux'
import { t } from './tokens.style'

export const { css, recipe, port, theme } = createSystem({
  tokens: t,
  conditions: { hover: '&:hover', md: media('(min-width: 768px)') },
  layers: ['tokens', 'recipes', 'overrides'],
})
```

```TS
// components/Button.style.ts
import { recipe } from '~/design/system.style'
import { t } from '~/design/tokens.style'

export const button = recipe({
  base: { display: 'inline-flex', alignItems: 'center', gap: t.space.xs, borderRadius: t.radius.sm },
  variants: {
    intent: {
      brand: { background: t.color.brand, color: t.color.onBrand },
      ghost: { background: 'transparent', color: t.color.ink },
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
<script setup lang="ts">
import { button } from './Button.style'
import type { VaneProps } from '@mszr/vane-dux'
const props = defineProps<VaneProps<typeof button>>()
</script>
<template>
  <button :class="button(props)"><slot /></button>
</template>
```

**Reaction as I went:** Typing out 7 named imports feels heavy on day 1 — `defineTokens, oklch, elevation, scale, alpha, contrast, scheme` — that's a lot of things to know exist before you've written anything. `elevation(0.03)` is a genuine dopamine hit: one number, both schemes, done. `contrast(({ color }) => color.brand)` made me stop — is this a value or a check? (It's both, but the name doesn't say that.) Then I realize I've created two files before touching a component — a tax I haven't earned yet. `VaneProps<typeof button>` gave me chills. The readme's "a taste" block skips the import line entirely, so the distance from "I read this" to "I write this" is wider than the example suggests.

### 2. Daily driver — multi-part dialog with animation + ports

```TS
// components/Dialog.style.ts
import { anatomy, keyframes } from '~/design/system.style'
import { t } from '~/design/tokens.style'

const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

export const dialog = anatomy({
  parts: ['backdrop', 'positioner', 'content', 'title', 'close'],
  base: {
    backdrop: { position: 'fixed', inset: 0, background: alpha(t.color.ink, 0.42), open: { motionOk: { animation: `${fadeIn} 160ms` } } },
    content: { width: 'min(100%, 36rem)', borderRadius: t.radius.md, background: t.color.surface },
    title: { ...t.text.body },
  },
  variants: { size: { sm: { content: { width: 'min(100%, 28rem)' } }, lg: { content: { width: 'min(100%, 52rem)' } } } },
  defaults: { size: 'sm' },
})
```

```vue
<template>
  <div :class="dialog(props).backdrop" />
  <div :class="dialog(props).positioner" role="dialog">
    <div :class="dialog(props).content">
      <h2 :class="dialog(props).title"><slot name="title" /></h2>
      <slot />
    </div>
  </div>
</template>
```

**Reaction:** `dialog(props).content` is exactly right — a typed record, no slot-vs-part ambiguity. But I'm calling `dialog(props)` four times in the template. In a real codebase I'd add `const d = computed(() => dialog(props))` and use `d.backdrop`, `d.content` — but that's a pattern I have to discover, not one the docs surface. Also: `open:` as a bare condition assumes `data-state="open"` exists on the DOM. Who sets that? A headless library? Me? The docs promise "headless libraries are the happy path" but don't show the wiring. On day 1 I'd wonder why my animation doesn't fire.

### 3. Edge case — live theming + escape hatch + cross-file references

```TS
applyTheme(document.documentElement, { color: { brand: userPickedHex } })

export const specialCard = css({
  padding: '20px',  // outside token scale — works because css() accepts any CSS value
  background: t.color.surface,
  '&:has(> img)': { paddingTop: 0 },
})

export const toolbarTweaks = within(toolbar, {
  [button]: { borderRadius: 0 },
})
```

**Reaction:** `applyTheme(el, { color: { brand } })` — the arg shape mirrors the token definition shape. That's the consistency that builds trust. No ceremony, no separate "theme contract" declaration. The `:has()` worked without a library update — it's just CSS. `'20px'` in `css()` works because `css()` is open-valued, but this is implicit. The `within()` call is a real upgrade over `:deep()`. I realize that `unsafe.value(...)` is only for atoms — `css()` doesn't need it — but nowhere does the doc say "in css(), just write any CSS value, no escape needed." A Tailwind refugee would waste time looking for the escape hatch in the wrong place.

---

## Feedback

### Gut check

I'm genuinely excited. This is one of the best-designed API docs I've read for a pre-1.0 project. The three-plane model reifies problems I've actually felt (runtime JS doing color math, `:deep()` spaghetti, parallel palettes, untyped variant props) as structural errors rather than inherent tradeoffs. I want to use this. But the excitement assumes a design-system-maintainer mindset. Someone who just wants to style a single Vue component will feel the floor of the buy-in, not the ceiling of the power. The docs are written for the convert, not the tourist.

### Delight moments

- **`elevation(0.03)`** (`dux-spec-tokens.md §4`) — One number, two schemes, zero thought. The best advertisement for the whole project. This is the kind of API that makes you trust every other decision.

- **`VaneProps<typeof button>`** (`dux-spec-recipes.md §3`) — The commitment to hover as `{ intent?: 'brand' | 'ghost'; size?: 'sm' | 'md' }` and not an internals wall. If you nail this, it's a killer feature. No second source of truth for prop types.

- **`port<number>('fraction', { default: 0 })` + `${fraction}` in CSS** (`dux-spec-ports.md §1`) — The template literal IS the API. No `.value`, no `.var`, no `.toString()`. Just `${port}` → `var(--vane-fraction-h4x, 0)`. This is the kind of detail that never makes feature checklists but makes daily use frictionless.

- **`fraction.set(0.62)` returns a style fragment** (`dux-spec-ports.md §2`) — Named for what you're *doing* (setting a value), not what it *is* (writing a CSS variable). The naming law working as intended.

- **`scheme({ light, dark })` → `light-dark()`** (`dux-spec-tokens.md §3`) — The compiler maps the concept to the platform primitive. One token def, no parallel palette, no JS toggling for the default path.

- **`css.raw\`…\``** (`dux-spec-css.md §8`) — The escape hatch looks like CSS because it IS CSS. Tagged template literal, scoped, validated, token-interpolating. Familiar shape, zero new syntax to learn. This is what "escape-hatch grace" looks like when you mean it.

- **The naming map** (`dux-language.md §4`) — "port" not "variable", "scheme" not "theme", "part" not "slot", "atoms" not "sprinkles". Every rename is justified against a real confusion it prevents. I'd print this table.

### Friction / dread moments

- **The import list for `defineTokens`** (`dux-spec-tokens.md §1`) — `defineTokens, alpha, contrast, elevation, oklch, scale, scheme` is 7 named imports on day one. The README's "a taste" block omits the import line entirely. A user hits their first red squiggle and has to reverse-engineer where each name lives. The preset reduces this but isn't the default example.

- **`contrast(({ color }) => color.brand)` — the name doesn't say what the thing IS** (`dux-spec-tokens.md §5`). The naming law says "does it say what the thing is." `contrast` reads as a verb (the action of checking) but the call produces a value (the paired color). It also triggers a build check, but that's a side effect. `paired({ with: ({ color }) => color.brand })` or `legibleOn({ for: ({ color }) => color.brand })` would be self-documenting. I had to read the spec paragraph to understand this isn't just an assertion.

- **`dialog(props).backdrop` called N times** (`dux-spec-recipes.md §2`, sample usage) — Vue `<template>` doesn't let you destructure. The docs never show `const d = computed(() => dialog(props))`. Every example repeats the call. On day 50 this is a quiet sigh every time you author a multi-part component. A `useParts` composable or a render-function example would fix it.

- **The two-file tax** (`dux-spec-css.md §1` + `dux-spec-tokens.md §1`) — `tokens.style.ts` + `system.style.ts` before a component can exist. The preset exists (`dux-spec-preset.md`) but isn't the default teaching path. Every README "a taste" and every spec example shows the bespoke path. A user following along creates two files before styling anything, and the README's "a taste" block skips the import lines, making it look simpler than it really is.

- **`css()` unit inference** (`dux-spec-css.md §2`) — `padding: 8` → `8px` is stated as a contract. "Ambiguous cases are a type error asking for a unit." This means the compiler has a per-property "canonical unit" table. That's an impressive engineering bet and a permanent source of edge-case confusion. `opacity: 1` is fine. `lineHeight: 1.5` vs `lineHeight: '1.5'` vs `lineHeight: '1.5em'` — all three are valid CSS. The inference rules need exhaustive docs or people will be periodically confused.

- **Color handle API surface is unspecced** (`dux-spec-tokens.md §2` example shows `.lighten(0.06)`) — What's the full set?
  `.lighten()`, `.darken()`, `.saturate()`, `.desaturate()`, `.mix()`, `.hueRotate()`? The expression tree is clever but users need the leaf methods documented.

- **The `unsafe` escape is atoms-only; `css()` doesn't need it, but nowhere is this stated** (`dux-spec-preset.md §3` vs `dux-spec-css.md §2`) — `unsafe.value(...)` is defined only for atoms. `css()` accepts any CSS value, so it doesn't need an escape. A user coming from Tailwind (where arbitrary values are a branded Thing) would look for the escape hatch in `css()`, not find it, and wonder if they're doing something wrong. A single sentence in the css spec ("css() accepts any CSS value without an escape wrapper — unsafe.value is for atom-only closed sets") would fix this.

- **`keyframes` accepts "ordinary vane rule objects"** (`dux-spec-css.md §6`) — This means conditions are legal inside keyframe steps. Can I write `from: { hover: { ... } }` inside `@keyframes`? That's semantically meaningless but structurally allowed. The spec should either explicitly exclude conditions from keyframe contexts or document that they're silently ignored.

### Mental model

vane-dux is a TypeScript native compiler for CSS design systems that splits styling into three planes — tokens as a typed graph, styles as compiled-away classes, and runtime values as typed ports — and types every crossing between them so the editor catches what the browser used to silently swallow. One sentence: *TypeScript as the preprocessor, CSS as the runtime, ports as the only bridge between them.*

### The first five minutes

6-10 minutes from `npm install` to a styled button on screen, assuming Nuxt with the module. Steps: install → configure module → create `tokens.style.ts` (with 7 imports to figure out) → create `system.style.ts` → create `Button.style.ts` → create `AppButton.vue`.

Someone bounces at step 3 (the import list — where does `oklch` come from? do I need all 7?) or step 4-5 ("I need a tokens file AND a system file AND a style file? For one button?"). The preset cuts this to 3 steps but isn't shown as the default path.

The README's "a taste" block is beautiful but aspirational — it shows the destination, not the starting path. It's the difference between "I want to use this" and "I know how to start using this."

### Day 50

**Wears well:** The consistency. `createSystem` → every function has the same shape. Conditions work identically across `css`, `recipe`, `anatomy`, and `atoms`. Ports are always ports. You stop thinking about the library and think about the design. The `applyTheme` cascade is still magic. The audit catches near-duplicate values you'd have let slide.

**Starts to grate:** Two imports per style file (`{ css, recipe }` from system + `{ t }` from tokens). The periodic "wait, is this value legal in `css()` or do I need `unsafe.value`?" mental check. The `computed(() => anatomy(props))` boilerplate for every multi-part component. The import line sprawl when adding a new color helper to the tokens file (did I already import `mix`?). Small things, individually ignorable, compositionally annoying.

### Compared to alternatives

| vs | vane-dux wins on | matches | trails |
|---|---|---|---|
| vanilla-extract | Removes `createVar` + `assignInlineVars`, ports, recipe/anatomy, token graph, `createSystem`, typed conditions | Evaluation model, zero-runtime output, vite integration | Atomic output (deferred), ecosystem maturity |
| Panda CSS | No codegen step, no config file, no stale artifacts — inference IS the codegen | Token-to-style pipeline, variant model, conditions | Panda `studio`, preset composition |
| Stitches | Zero runtime (compiled away), typed ports, anatomy, build-time contrast | Recipe variants model, compounds, defaults | Stitches `css` prop (by design), theme-token spec |
| Vue SFC styles | Cross-file refs, no `:deep()`, typed variant props, token graph, build diagnostics, HMR on style files | — | Two files vs one, no `<style lang="ts">` (deferred), framework buy-in required |

### One thing I'd cut, one thing I'd add

**Cut: The agent-context file generator** (`dux-spec-introspection.md §4`). Ship the manifest as a build artifact the DevTools consume, but defer the "generate agent-context prose" feature until someone actually builds an agent that needs it. The diagnostics and type system already deliver the agent feedback loop the spec describes. This is ~2 months of implementation and test surface for a problem without confirmed consumers.

**Add: `defineSystem` — a one-call wrapper around the `defineTokens + createSystem` dance.** `export const { css, recipe, t } = defineSystem({ tokens: { ... }, conditions: { ... }, layers: [...] })`. This is the 80% case: someone who defines tokens and immediately binds them into a system. The power user can still split (and the spec documents when). The day-1 user gets one file, one call, zero "why two files?" friction.

### Delight score: 7/10

**Single highest-leverage change to reach 8/10:** Ship the preset + `defineSystem` as the default path in every README and spec example. Replace the first code block in the README "a taste" section with:

```TS
import { defineSystem } from '@mszr/vane-dux'
import { presetTokens, presetConditions } from '@mszr/vane-dux/preset'

export const { css, recipe, t } = defineSystem({
  tokens: presetTokens({ brand: '#635bff' }),
  conditions: presetConditions(),
})
```

Sidebar "want more control?" to show the bespoke path. This would:
- Collapse 7 imports → 2
- Collapse 2 files → 1
- Reduce first-five-minutes to 2 steps (install → system → button)
- Demonstrate "deletable opinions" with the first line of code a user writes
- Let the Nuxt module's `vane.system` config work with one file

The delight is already present in the second-order interactions — `applyTheme` cascading, `VaneProps` being exactly the shape you needed, `port.set()` being trivial. The first-order interaction (getting something on screen) has ceremony the docs don't fully acknowledge. Fix that and the 7 becomes an 8, and the day-50 delight moments get a day-1 audience.
