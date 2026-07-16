updated: 2026-07-15
status: canonical implemented specification

# vanity — spec: preset

The thin opinionated convenience layer: a hospitable starting point that takes away ceremony for most users without locking the foundation it's built on.

The preset's law: **opinions live where they're deletable.** Everything here consumes only the public core surface — a user can replace any piece (or all of it) with their own, and the core never knows the difference. Starting from nothing is too much ceremony; starting from someone else's totalizing philosophy is moving into their house. The preset is a furnished room with the receipts attached.

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | Preset tokens | ☑ |
| 2 | Preset conditions | ☑ |
| 3 | `atoms` | ☑ (the engine is core, bound on the system; the preset ships the default map) |
| 4 | A11y helpers | ☑ (including the audit for outline removal without a focus-visible replacement) |
| 5 | Motion opinions | ☑ |
| 6 | Layout patterns | ☑ |
| 7 | Optional elevation/BEM engine plugins | ☑ |
| 8 | Style-fragment utilities | ☑ |

---

## 1. Preset tokens

**Why.** A serious default palette, scale, and motion set means the first component looks good in both schemes before any design decision has been made — and every piece is an ordinary token a user can override or delete.

**Usage.**

```TS
import { createEngine } from '@mszr/vanity'
import { presetTokens } from '@mszr/vanity/preset'

export const de = createEngine()
const base = presetTokens(de, {
  brand: '#635bff', radius: 'calm', density: 'comfortable',
})
const accents = de.defineTokens({
  accent: { positive: de.oklch(0.7, 0.15, 160) },
})

export const tokens = de.defineTokens().compose(base).compose(accents)
```

**Contract details.**

- OKLCH-derived brand ramp from one seed color; elevation-driven surfaces/borders/inks ([vanity-spec-tokens.md §4](./vanity-spec-tokens.md#4-elevation)) so both schemes fall out automatically; `legibleOn()` pairings prewired.
- Spacing (linear ×4), type scale with composite `text.*` styles, radii, shadows, z-index scale, durations and easings.
- The seed options (`radius`, `density`, `contrast`) are hail-styl-style **controls**: one knob retunes a family of tokens without editing them individually.
- The output is an ordinary engine-bound token module — inspectable, composable, and partially adoptable. It uses the same public `defineTokens().compose(...)` protocol as application modules; there is no privileged preset graph path.

---

## 2. Preset conditions

**Why.** The condition set is where accumulated platform knowledge lives; nobody should have to remember the forced-colors media query. And because this import sits in the one file every user writes first, its exact name and merge shape are part of the contract — the quickstart must be copy-pasteable, never inferred.

**Usage.**

```TS
import { createEngine } from '@mszr/vanity'
import { presetConditions, presetTokens } from '@mszr/vanity/preset'

const de = createEngine()
de.createSystem({
  tokens: presetTokens(de),
  conditions: {
    ...presetConditions(de),
    cardWide: de.container('card', '(min-width: 30rem)'),
  },
})
```

**Contract details.** `presetConditions(de)` returns a plain conditions map built with that engine's helpers — spread it to extend, omit keys by destructuring, or pass it whole. It *adds to* the core base set ([vanity-spec-css.md §1](./vanity-spec-css.md#1-decreatesystem--bind-once-typed-everywhere)), contributing the opinionated names:

- breakpoints `sm…2xl`; container sizes; orientation
- preference: `contrastMore`, `forcedColors`
- headless states: `open`, `closed`, `checked`, `selected`, `highlighted`, `invalid` (the Zag/Reka `data-state`/`data-*` contract)

The interaction and preference basics (`hover`, `hoverFocus`, `active`, `focusVisible`, `disabled`, `motionOk`, `motionReduce`, `dark`, `light`, `ltr`, `rtl`) are core, not preset — they're platform facts, not opinions. Note the naming law at work: `hover` is `&:hover` and nothing more, `active` is `&:active`, and the hover-plus-keyboard-focus affordance pair is **`hoverFocus`**, so a condition never claims less than it does. Preset helpers and patterns use `hoverFocus` for interactive affordances and the docs recommend it — by name, not by stealth.

---

## 3. `atoms`

**Why.** The strict utility lane: for styling where a recipe is overkill, and the inline-ish sugar that softens the sibling-file cost. Backed by the token map, so it's fast *and* consistent — and output stays bounded by construction: one class per property value per declared condition, so CSS cost scales with the declaration, never with call sites.

**Usage.**

```vue
<template>
  <section :class="atoms({ stack: true, gap: 'sm', p: { base: 'md', md: 'lg' } })">
    <slot />
  </section>
</template>
```

```TS
// design/atoms.style.ts — `defineAtoms` comes off the system, like `recipe`
export const atoms = defineAtoms({
  properties: {
    display: ['none', 'flex', 'grid', 'inline-flex'],
    gap: t.space,
    padding: t.space,
    color: t.color,
    borderRadius: t.radius,
  },
  shorthands: { p: 'padding', bg: 'background', rounded: 'borderRadius' },
  toggles: {
    stack: { display: 'flex', flexDirection: 'column' },
    center: { display: 'grid', placeItems: 'center' },
  },
  conditions: ['sm', 'md', 'lg'],
})
```

**Contract details.**

- Token keys autocomplete; values outside the map are rejected at the key — *unless* passed through the labeled escape (`unsafe.value('37ch', 'editorial measure')`), which surfaces in the audit.
- Responsive/conditional maps use the same condition grammar as everything else (principle 5), over the conditions the atoms *declare* — declaring them is what keeps pre-generation bounded, and none are declared by default (principle 10).
- The labeled escape emits its rule at build time, memoized and labeled (style modules are where the compiler is listening); one reaching a *runtime* call gets the lane redirect — runtime data crosses through a port ([vanity-patterns.md §4]).
- `defineAtoms` is bound on the system beside `recipe` and `anatomy` — learn one surface, know the rest, and the condition grammar flows in typed. (The serialization machinery that carries the resolver across the build/app wall is substrate territory, which is why the engine is core, not preset.) The preset ships the tasteful default *map*: `defineAtoms(presetAtoms(t))`, over the preset token shape — spacing, colors, radii, shadows, z order, the breakpoint lane, and the `stack`/`center` toggles.

---

## 4. A11y helpers

**Why.** The most common accessibility moves should be single composable declarations, in the same feedback loop as everything else (principle 7).

**Usage.**

```TS
export const input = css({
  ...focusRing(),
  ...minTarget(44),
})
```

**Contract details.** `focusRing()` (token-driven, `:focus-visible`-scoped), `visuallyHidden()`, `minTarget(px)`. Each is a plain declaration fragment — spreadable, overridable, deletable. Forced-colors styling needs no helper: `forcedColors` is already a preset condition, one bare key away — a wrapper would carry nothing (principle 10). The companion audit checks emitted selectors: removing `outline` without a visible `:focus-visible` replacement warns at the class source with `focusRing()` as the fix-it ([vanity-spec-introspection.md §3](./vanity-spec-introspection.md#3-audits)).

---

## 5. Motion opinions

**Why.** Respecting `prefers-reduced-motion` should be the default posture, not a per-animation memory test.

**Contract details.**

- Preset motion tokens ship in `presetTokens` (§1): durations and easing curves, including a spring-approximation `linear()` easing (`t.ease.spring`), computed from the physics rather than hardcoded.
- Named keyframe fragments (`fade`, `slideUp`, `scaleIn`) feed the system's `keyframes()`: `const fadeIn = keyframes(fade)`.
- `animate('…')` and `transition('…')` return `motionOk`-guarded fragments — `css({ ...animate(\`${fadeIn} 200ms ease-out\`) })`; `animate.always('…')`/`transition.always('…')` is the explicit opt-out for motion that must run (e.g. a loading spinner).
- Core `css()` is never silently rewritten — the guard is a preset-helper opinion, not a compiler mutation (principle 10).

---

## 6. Layout patterns

**Why.** The recurring compositional layouts have names; giving them typed, token-fed implementations removes a whole class of flexbox re-derivation.

**Contract details.** `stack`, `inline`, `cluster`, `center`, `sidebar`, `switcher`, `frame`, `reel` — each a parameterized style over the space scale (`stack({ gap: 'md', align: 'start' })`), returning ordinary, memoized classes. Bound once beside the system — `export const { stack, sidebar } = definePatterns({ css, t })` — and called in style modules, where the compiler is listening. Gaps are typed by `t.space`'s keys. Documented with their CSS so they teach, not obscure.

Patterns are layout composition and return classes. `circle`, `square`, `truncate`, and `visuallyHidden` are declaration fragments and stay separate; calling every reusable fragment a pattern would blur what the output owns.

---

## 7. Optional convention plugins

Elevation and base-scale em are opinions, not privileged engine primitives. They are the first preset consumers of the same `defineEnginePlugin()`/`.use()` contract available to applications:

```ts
const de = createEngine()
  .use(elevationPlugin())
  .use(bemPlugin({ base: 4, targetPx: 16 }))

de.elevation(de.oklch(0.6, 0.2, 280), 0.2)
de.bem(4) // 1rem
```

- `elevationPlugin()` adds a scheme-aware `elevation(base, position)` color constructor. Custom curves carry a stable semantic ID so engine compatibility/HMR never depends on function identity.
- `bemPlugin()` adds the deliberately nonstandard base-scale-em constructor: design-scale-relative like px, expressed in rem so browser root font-size accessibility remains effective.
- both constructors reappear on the finalized system through ordinary plugin re-exposure and receive exact IntelliSense;
- neither imports a private IR class or receives a hidden registration privilege.

---

## 8. Scales, interpolation, and fragment utilities

Core scales are callable numeric functions. Named token generation is explicit:

```ts
const space = de.scale.linear({ unit: 4, steps: { sm: 2, md: 4 } })

space('sm')      // 8px
space(-0.5)      // -2px; negative/fractional finite steps are deliberate
space.tokens()   // { sm: 8px, md: 16px } for defineTokens()
```

Modular scales accept the same named/numeric access, require a positive ratio, and support negative/fractional exponents. `interpolate(from, to, progress)` is the general typed numeric CSS interpolation primitive; `progress` accepts either a finite JavaScript number or a typed CSS `<number>` expression. `fluid({ min, max, minVw, maxVw })` is its monotonic viewport specialization emitted as ordinary `clamp()`/`calc()` CSS. Inverted value or viewport bounds diagnose instead of producing a surprising curve.

The preset's proven style fragments are deliberately small:

- `square(size)` and `circle(size)`;
- `truncate()` for one line or `truncate(lines)` for a positive multi-line clamp;
- `visuallyHidden()` and accessibility helpers from §4.

They return plain overridable declaration objects. No new mixin runtime or custom-property primitive exists.
