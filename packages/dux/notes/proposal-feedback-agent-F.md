# vane-dux proposal feedback — agent F

Reviewed: all of `docs/` (vision, language, patterns, all seven specs) plus both READMEs, 2026-07-07. Nothing is implemented; everything below is a reaction to the documented contracts and a simulation of what using them would actually feel like. The brief: delightfulness above all else.

---

## Part 1 — The simulation

### Task A (hello world): fresh Nuxt app → one good-looking button in both schemes

What I'd type, per the docs as written:

```TS
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@mszr/vane-dux/nuxt'],
  vane: { system: '~/design/system.style.ts' },
})
```

```TS
// design/tokens.style.ts
import { defineTokens } from '@mszr/vane-dux'
import { presetTokens } from '@mszr/vane-dux/preset'

export const t = defineTokens({
  ...presetTokens({ brand: '#635bff', radius: 'calm', density: 'comfortable' }),
})
```

```TS
// design/system.style.ts
import { createSystem } from '@mszr/vane-dux'
import { presetConditions } from '@mszr/vane-dux/preset'   // ← GUESS: this export name is never shown in any doc
import { t } from './tokens.style'

export const { css, recipe, anatomy, keyframes, globalCss, port, theme } = createSystem({
  tokens: t,
  conditions: { ...presetConditions },                     // ← GUESS: merge shape implied by preset spec §2, never shown
  layers: ['reset', 'tokens', 'recipes', 'utilities', 'overrides'],
})
```

```TS
// components/AppButton.style.ts
import { recipe } from '~/design/system.style'
import { t } from '~/design/tokens.style'

export const button = recipe({
  base: { ...t.text.body, display: 'inline-flex', gap: t.space.xs, borderRadius: t.radius.sm },
  variants: {
    intent: {
      brand: { background: t.color.brand, color: t.color.onBrand, hover: { background: t.color.brandHover } },
      ghost: { background: 'transparent', hover: { background: t.color.brandSoft } },
    },
  },
  defaults: { intent: 'brand' },
})
```

```vue
<!-- components/AppButton.vue -->
<script setup lang="ts">
import { button } from './AppButton.style'
import type { VaneProps } from '@mszr/vane-dux'
const props = defineProps<VaneProps<typeof button>>()
</script>
<template>
  <button :class="button(props)"><slot /></button>
</template>
```

**Narration.** The moment `presetTokens({ brand: '#635bff' })` gives me a full ramp, elevation surfaces, contrast pairings, and dark mode from one hex — that's the hook. If the button really renders well in both schemes at this point, I'd screenshot it and send it to someone. But getting there took **five files and three distinct concepts** (tokens vs system vs recipe) before the first pixel, and in file two I hit the first real snag: I don't know how to get the preset's conditions into my system. The preset spec (§2) says "One import provides the working set, mergeable with user conditions in `createSystem`" but no doc ever shows the import name or the merge. For the single file every user must write on day one, that's the wrong place for the only undocumented seam. I also don't know whether `layers` is required or has a default — the css spec §5 mentions "the preset order," which hints a default exists, but `createSystem`'s usage block always spells all five layers out. If I have to know what a cascade layer is to hello-world, that's a bounce point.

Also worth saying: nothing in the docs is a *tutorial*. The vision doc is a manifesto (a good one), the specs are contracts. The path I just walked I had to assemble myself from four documents.

### Task B (day-to-day): a Card component — surface, hover, responsive padding, one variant, used in an SFC

```TS
// components/Card.style.ts
import { css, recipe } from '~/design/system.style'
import { t } from '~/design/tokens.style'

export const card = recipe({
  base: {
    ...t.text.body,
    padding: t.space.md,
    background: t.color.surface,
    border: `1px solid ${t.color.border}`,
    borderRadius: t.radius.md,
    hover: { background: t.color.surfaceRaised },
    md: { padding: t.space.lg },
  },
  variants: {
    tone: {
      neutral: {},
      brand: { borderColor: t.color.brand, background: t.color.brandSoft },
    },
  },
  toggles: {
    interactive: { cursor: 'pointer', hover: { borderColor: t.color.brand } },
  },
  defaults: { tone: 'neutral' },
})
```

```vue
<script setup lang="ts">
import { card } from './Card.style'
import type { VaneProps } from '@mszr/vane-dux'

const props = defineProps<VaneProps<typeof card> & { href?: string }>()
</script>
<template>
  <article :class="card(props)"><slot /></article>
</template>
```

**Narration.** Writing the rule body is genuinely pleasant. `hover:` and `md:` as bare keys with full typing is the best version of this idea I've seen — no `_hover` underscore dialect, no `selectors: { '&:hover': … }` ceremony, no `@media` string. `...t.text.body` spreading a composite token feels like the language working *for* me. `toggles:` earning its own key instead of `variants: { interactive: { true: … } }` is a small thing I'd notice approvingly every single time.

Then the last line of the SFC stopped me cold. `card(props)` — where `props` includes `href` — **violates the recipes spec's own contract**. Spec §3 says: "Recipe/anatomy calls accept extra keys silently-ignored **never**: excess keys error," and tells me to write `card(pick(props, card.variants))`. But the *usage example directly above that bullet* (dux-spec-recipes.md §3, the `VaneProps<typeof button> & { disabled?: boolean }` example) does exactly what the bullet forbids: it spreads the wider props object straight into `button(props)`. The doc contradicts itself at the single most-executed call site in the whole SDK. And `pick` itself is unspecced — it appears once, in passing, sourced from nowhere ("or the overlay helpers").

This matters enormously for delight because *every component that mixes variant props with its own props* — which is nearly every real component — hits this line. If the answer on day 50 is "wrap every call in `pick(props, x.variants)`," that's the ceremony tax vane-dux exists to abolish, reintroduced at the doorway of every component. (There's a clean resolution; see Friction #1 below.)

Minor reading note: in `padding: { base: 'md', md: 'lg' }`-style atoms maps, `md` is simultaneously a space token *value* and a breakpoint *key* in the same object. Typed, so never wrong — but I had to slow down to read it, and I will every time. Tailwind has the same wart; a preset could dodge it by naming breakpoints differently from sizes, but I accept this may be the ecosystem's local optimum.

### Task C (edge case): a Dialog over Reka UI — anatomy, open/close animation with reduced motion, plus a parent-themable backdrop blur

```TS
// components/Dialog.style.ts
import { anatomy, css, keyframes, port } from '~/design/system.style'
import { t } from '~/design/tokens.style'
import { alpha } from '@mszr/vane-dux'          // ← GUESS: color helpers usable outside defineTokens

const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

export const dialogPorts = {
  backdropBlur: port<VaneLength>('backdropBlur', { default: '4px' }),
}

export const dialog = anatomy({
  parts: ['backdrop', 'positioner', 'content', 'title', 'close'],
  base: {
    backdrop: {
      position: 'fixed',
      inset: 0,
      background: alpha(t.color.ink, 0.42),
      backdropFilter: `blur(${dialogPorts.backdropBlur})`,
      open: { motionOk: { animation: `${fade} 160ms ease-out` } },
      closed: { motionOk: { animation: `${fade} 120ms ease-in reverse` } },
    },
    positioner: { position: 'fixed', inset: 0, display: 'grid', placeItems: 'center' },
    content: { width: 'min(100%, 36rem)', borderRadius: t.radius.md, background: t.color.surfaceRaised },
    title: { ...t.text.title },
  },
  variants: {
    size: { sm: { content: { width: 'min(100%, 28rem)' } }, lg: { content: { width: 'min(100%, 52rem)' } } },
  },
  defaults: { size: 'sm' },
})
```

```vue
<script setup lang="ts">
import { DialogRoot, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import { dialog } from './Dialog.style'
import type { VaneProps } from '@mszr/vane-dux'

const props = defineProps<VaneProps<typeof dialog>>()
</script>
<template>
  <DialogRoot>
    <DialogOverlay :class="dialog(props).backdrop" />   <!-- hmm — see narration -->
    <DialogContent :class="dialog(props).content">
      <DialogTitle :class="dialog(props).title"><slot name="title" /></DialogTitle>
      <slot />
    </DialogContent>
  </DialogRoot>
</template>
```

```TS
// Some parent that wants a heavier blur — zero runtime, compiles into the rule
export const heroDialogZone = css({
  ...dialogPorts.backdropBlur.set('12px'),
})
```

**Narration.** The good news first: the whole thing *composed*. Anatomy + conditions + keyframes + a port, all in one file, one grammar, and the headless `data-state` story really is the happy path — `open:` is just a condition, no adapter. The parent setting `backdropBlur` through a static `.set()` spread that compiles away entirely is the moment the port model clicked for me: the same primitive is reactive styling, `:deep()` replacement, *and* library theming, and I didn't have to learn three features. That's rare design economy.

Three stumbles:

1. **Calling `dialog(props)` once per part is ugly.** The natural template wants `const d = dialog(props)` — but in `<script setup>` that's non-reactive if `size` changes; I need `computed(() => dialog(props))` and then `d.content` unwrapping in the template. It works (standard Vue), but the docs never show an anatomy consumed from a component, and this is exactly where a first-time user will write the non-reactive version and file a confused bug. The vue spec proudly says "no `useRecipe` composable exists, because a typed function needs no wrapper" — for a single class string called inline in the template, true and admirable; for a multi-part anatomy result you want to destructure, the story is genuinely less obvious and deserves at least a documented pattern.
2. **`port<VaneLength>('backdropBlur', …)` made me name it twice** — the export *and* the string. The docs are explicit that "the *export* is the identity" and ports are hashed like classes, so the string is only a debug/var-name label… which means gauntlet moment 1 (F2 rename) *half-works* on the SDK's flagship primitive: rename the export and the stale string lingers in the emitted var name and manifest forever. vanilla-extract already proved debug names can be inferred from the export/filename. The string argument should not exist.
3. Small guess-flags: whether `alpha()` is legal outside `defineTokens` (patterns and specs only show color helpers in the token graph; anatomy spec's own dialog example uses `alpha(t.color.ink, 0.42)` in a rule, so I assume yes — but the css spec's value section never says so), and whether `closed:` is in the preset condition set for animating exit (preset spec §2 says yes).

---

## Part 2 — The feedback

### Gut check

Excited, genuinely — and I'm calibrated against a decade of styling-tool fatigue. The three-planes model plus liveness plus ports is a real idea, not a re-skin: nothing else in the ecosystem lets me write `brandSoft: ({ color }) => alpha(color.brand, 0.12)` and get `oklch(from var(--vane-color-brand) l c h / 0.12)` in the browser so user theming re-derives the world with zero JS. If the implementation delivers what these docs promise — especially error quality — this is the first styling tool since Tailwind I'd bring up unprompted. The excitement has one asterisk: the distance from `npm install` to that first wow is currently too long and passes through the project's only under-documented seam.

### Delight moments

Named precisely, best first:

1. **Liveness propagation** (dux-patterns.md §3, dux-spec-tokens.md §2). "One variable write re-derives the world with zero JS recomputation." Derivations surviving to the browser *as CSS* is the single best idea in the proposal, and gauntlet moment 3 (user picks a brand color; surfaces, hovers, and text pairings follow in both schemes) is the demo that sells the whole SDK. The honesty rule — `applyTheme` rejecting compile-folded tokens *as a type error at the key* — is the kind of correctness users feel as trust.
2. **`elevation(0.03)`** (dux-spec-tokens.md §4). A surface as one number, both schemes falling out. "A new elevation token is one number, not two colors" is the most quotable DX win in the docs, and shipping it as a *deletable preset derivation* rather than a core axiom is exactly the right humility.
3. **Ports as one primitive for four features** (dux-patterns.md §4). The unification list — `v-bind()` done right, `:deep()` retired, consumer theming, dynamic utility values — is real design compression. The static `.set()` that compiles away inside a `css()` rule (ports spec §4) was my favorite single line of the simulation.
4. **Bare condition keys, both nesting directions** (dux-patterns.md §5). `hover: { … }` and `color: { base, hover }` compiling identically is "how people think" made policy. No underscore dialect, and the factory refusing condition names that collide with CSS properties *at definition time* closes the ambiguity hole before it opens.
5. **The delight gauntlet itself** (dux-vision.md §6). Eleven concrete moments, referenced by number from test suites. This is the most credible delight-engineering artifact I've seen in a design doc — it converts "delightful" from vibes into fixtures.
6. **The diagnostics contract** (dux-patterns.md §10). "Exactly one diagnostic per mistake — never an overload wall," hovers that collapse to `{ intent?: 'brand' | 'ghost'; size?: 'sm' | 'md' }`, and the lane-redirect message ("use a variant for finite choices, or a port for live values"). Locking messages with an editor-DX test plane is the difference between promising good errors and having them.
7. **`toggles:`** (dux-language.md §4). "`pill: true` at the call site, no `'true'` key ceremony." Small, correct, felt every day.
8. **The SFC mapping table** (dux-spec-vue.md §2). Five habits, each with "compensates for" and "in vane-dux." This is the migration doc Vue people actually need, and shipping it verbatim in package docs is the right call.
9. **Writing quality as a product feature.** "The preset is a furnished room with the receipts attached" (dux-spec-preset.md). "Most class names were never ideas — just addresses" (dux-patterns.md §7). Docs this confident make the tool feel finished before it exists.

### Friction / dread moments

1. **The recipe call site contradicts itself — and it's the most-used line in the SDK.** dux-spec-recipes.md §3: the contract bullet mandates excess-key errors and `button(pick(props, button.variants))`, while the usage example ten lines above it spreads `VaneProps<typeof button> & { disabled?: boolean }` directly into `button(props)`. One of these is the law; decide which. My strong recommendation: make the example the law. TypeScript already gives you the delightful split for free — excess-property checks fire on *object literals* (so `button({ intnet: 'brand' })` is a red squiggle, typo protection intact) but not on widened variables (so `button(props)` just works); at runtime, ignore unknown keys. `pick(props, button.variants)` as the blessed everyday pattern is dread — pure ceremony, per component, forever.
2. **Hello world is five files and an undocumented seam.** Tokens → system → style → SFC → nuxt config, and the system file requires knowing (a) the preset-conditions import that no doc names, and (b) what cascade layers are. Nothing in the specs gives a zero-decision starting system. The preset furnishes the *tokens* room beautifully and leaves the *system* room empty.
3. **`port('name', …)` double-naming.** The flagship primitive is the one place the SDK asks me to repeat myself and the one place F2-rename silently half-works (stale debug/var label). Infer the name from the export like the substrate already does for classes; keep an optional label override for the rare collision.
4. **Anatomy consumption in Vue is unshown and has a reactivity trap.** `dialog(props)` per part is noisy; `const d = dialog(props)` in `<script setup>` silently loses reactivity. The docs never show anatomy used from a component. Either document `computed(() => dialog(props))` as the pattern or admit the one composable the "no wrappers" principle should bend for.
5. **Two authoring styles for the same rule** (selector-first vs property-first, legal to mix in one object — dux-spec-css.md §3). I like writing it; I'm less sure about reading a teammate's 40-line rule that mixes directions freely. This is a deliberate, defensible choice, but the docs should take a house-style stance ("group states selector-first; use property-first for a property that varies across 3+ states") so teams don't relitigate it per PR.
6. **The preset `hover` condition is secretly `:hover, :focus-visible`** (dux-spec-css.md §1 example, preset spec §2). A11y-smart as a default, but the name claims less than it does — someone styling a hover-only affordance (cursor-preview, tooltip trigger) gets keyboard-focus styles they didn't ask for and won't notice until a bug report. At minimum the manifest/hover-docs should surface the expansion loudly.
7. **Docs have no on-ramp.** Vision → language → patterns → seven specs is a superb reference architecture and a poor first hour. There is no "getting started" page anywhere in the plan. For a project whose #1 goal is delight, the first sixty minutes is the product.
8. Small: two import origins per style file, forever (`css` from `~/design/system.style`, `t` from `~/design/tokens.style`, `defineTokens` from the package). Nuxt auto-imports allegedly erase this (vue spec §3 — flagged: it says "auto-imports the system's bound functions and `t` per config" but not whether that reaches `.style.ts` files, which is where it matters most). Non-Nuxt Vite users pay it on every file.

### Mental model

Statable in two sentences, which is itself a compliment: *Your design system is a typed graph of decisions that compiles to plain CSS; anything that must change at runtime crosses through a declared, typed port.* The three-planes framing (contract / compiled / live) is the clearest articulation of "where does my styling live" I've read in any tool's docs — most competitors never answer that question at all.

### The first five minutes

As documented: install → nuxt config → tokens file → system file (⚠ undocumented conditions import, layer-literacy required) → style file → SFC. Realistically 15–25 minutes for someone new to the concepts, with the bounce risk concentrated entirely in `system.style.ts`. The payoff on the other side (a button that's beautiful in both schemes from one hex seed) is a top-tier first success — better than Tailwind's, because dark mode came free. The problem is purely that the docs make me *assemble* the runway. A starter (`vane init`, or a pre-bound preset system you can eject from) turns 20 minutes into 4 and removes zero power. Principle 10 says "the simple path never pays for power" — today the simple path pays a layers-and-conditions toll.

### Day 50

**Wears well:** bare conditions (never think about media queries again), `...t.text.title` composite spreads, `VaneProps` (component prop types that literally cannot drift), toggles, the errors-at-the-key discipline, HMR-speed value diagnostics, devtools class names like `Dialog_content--size-lg__h4x` when debugging. Ports fade into the background the way good primitives do — you stop noticing the wall.

**Starts to grate:** creating the sibling `.style.ts` + two imports for every small component (the colocation cost is honestly stated in vue spec §5, and honesty doesn't make the 50th file more fun — `atoms` is the pressure valve and had better be excellent); `pick(props, x.variants)` on every mixed-props component *if friction #1 resolves the wrong way*; the port string label drifting from renamed exports; writing `computed(() => anatomy(props))` and momentarily doubting yourself each time. None of these are dealbreakers; all of them are the kind of paper cut this project's own principle 2 ("boilerplate is an active harm") exists to catch.

### Compared to alternatives

- **vs vanilla-extract (the substrate):** strictly and dramatically better authoring. `defineTokens` replaces the `createGlobalThemeContract`/`createGlobalTheme` two-step; ports replace `createVar` + `assignInlineVars` plumbing; conditions replace `selectors`/`@media` blocks; recipes gain toggles and full conditions. A VE user reading these docs would feel their entire pain list addressed. Exceeds expectations.
- **vs Panda CSS (the closest competitor in spirit):** matches the typed tokens/conditions/recipes surface while deleting Panda's biggest annoyance — the generated `styled-system/` artifact directory and codegen lag ("inference is the codegen" is a genuine differentiator). Exceeds on theming (liveness has no Panda equivalent), matches on variants (both inherit Stitches), **undershoots on output**: Panda emits atomic CSS and vane-dux deliberately doesn't (deferred, dux-vision.md §8). At design-system scale the non-atomic bundle will be measurably larger; the docs' "measured pain" trigger is reasonable, but expect the comparison table to get thrown at you early.
- **vs Tailwind:** different species; `atoms` is the peace treaty and coexistence is explicit. A Tailwind loyalist won't convert on utilities — they might on `applyTheme` + `elevation`, which Tailwind structurally cannot do.
- **vs Vue SFC scoped styles:** the mapping table wins the argument feature-by-feature, and loses exactly one thing — colocation — which the docs admit plainly. That admission ("stated plainly rather than papered over," vue spec §5) buys more trust than a workaround would.

### One thing I'd cut, one thing I'd add

**Cut: `within()`** (dux-spec-css.md §4). It's the one blessed re-entry of the pattern the whole design campaigns against — a parent reaching into a child's structure. The legitimate cases are already covered: values → ports; genuine structural selectors → typed class interpolation (`` [`${button} + ${button}`] ``), which is more honest *because* it looks like what it is. `within` is sugar that makes the anti-pattern the easy path and gives every future `:deep()` refugee a familiar-shaped crutch to avoid learning ports. If real-world pain demands it back, re-add it post-1.0 with audit enrollment like the other escapes.

**Add: a pre-bound starter system in the preset** — `import { css, recipe, anatomy, port, t } from '@mszr/vane-dux/preset/starter'` (preset tokens + preset conditions + preset layers, already wired), explicitly documented as eject-when-ready. It consumes only the public surface, so it obeys the preset's own deletability law, and it collapses hello world from five files to two. The furnished room should include the wiring, not just the furniture.

### Delight score: 8/10

The ideas are 9–10 (liveness, ports, elevation, the gauntlet, the diagnostics bar); the documented *experience* around the edges is 7 (arrival ceremony, the recipe-props contradiction, the port double-name, no on-ramp doc).

**The single highest-leverage change:** fix the everyday call sites — resolve dux-spec-recipes.md §3 so `button(props)` with a wider typed props object just works (literal typos still die at the cursor), and drop the string argument from `port()` in favor of export-name inference. Those two lines are the ones every user writes every day; right now they're the only places where vane-dux's own principles (boilerplate is harm; rename-symbol is sacred) get violated by its own spec. Make them frictionless and the day-to-day surface matches the quality of the big ideas — that's the point where people start recommending it unprompted.
