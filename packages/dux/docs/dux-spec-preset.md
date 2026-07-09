updated: 2026-07-09
status: spec — contracts settled, implemented (phases 5 + 7)

# vane-dux — spec: preset

The thin opinionated convenience layer: a hospitable starting point that takes away ceremony for most users without locking the foundation it's built on. The preset ships in two waves: the **foundations** (§1–2) land as phase 5 because the quickstart runs through them ([dux-spec-css.md §1.1](./dux-spec-css.md#11-the-happy-path-one-file)); the **conveniences** (§3–6) follow as phase 7.

The preset's law: **opinions live where they're deletable.** Everything here consumes only the public core surface — a user can replace any piece (or all of it) with their own, and the core never knows the difference. Starting from nothing is too much ceremony; starting from someone else's totalizing philosophy is moving into their house. The preset is a furnished room with the receipts attached.

## Implementation status

| # | Contract | Phase | Status |
| --- | --- | --- | --- |
| 1 | Preset tokens | 5 | ☑ |
| 2 | Preset conditions | 5 | ☑ |
| 3 | `atoms` | 7 | ☑ (the engine is core, bound on the system; the preset ships the default map) |
| 4 | A11y helpers | 7 | ☑ (the outline-removal *check* lands with the audits, phase 8) |
| 5 | Motion opinions | 7 | ☑ |
| 6 | Layout patterns | 7 | ☑ |

---

## 1. Preset tokens

**Why.** A serious default palette, scale, and motion set means the first component looks good in both schemes before any design decision has been made — and every piece is an ordinary token a user can override or delete.

**Usage.**

```TS
import { presetTokens } from '@mszr/vane-dux/preset'

export const t = defineTokens({
  ...presetTokens({ brand: '#635bff', radius: 'calm', density: 'comfortable' }),
  color: { accent: oklch(0.7, 0.15, 160) }, // extend freely
})
```

**Contract details.**

- OKLCH-derived brand ramp from one seed color; elevation-driven surfaces/borders/inks ([dux-spec-tokens.md §4](./dux-spec-tokens.md#4-elevation)) so both schemes fall out automatically; `legibleOn()` pairings prewired.
- Spacing (linear ×4), type scale with composite `text.*` styles, radii, shadows, z-index scale, durations and easings.
- The seed options (`radius`, `density`, `contrast`) are hail-styl-style **controls**: one knob retunes a family of tokens without editing them individually.
- The output is a plain token subtree — inspectable, spreadable, partially adoptable. The merge semantics are ordinary object spread and therefore already understood: later keys win, so preset tokens are *defaults you extend or override*, with no hidden merge logic. `createSystem({ tokens: presetTokens({ brand }) })` (the quickstart) and the `defineTokens` spread above are the same operation in two positions.

---

## 2. Preset conditions

**Why.** The condition set is where accumulated platform knowledge lives; nobody should have to remember the forced-colors media query. And because this import sits in the one file every user writes first, its exact name and merge shape are part of the contract — the quickstart must be copy-pasteable, never inferred.

**Usage.**

```TS
import { presetConditions } from '@mszr/vane-dux/preset'

createSystem({
  tokens: t,
  conditions: presetConditions(), // or { ...presetConditions(), cardWide: container('card', '…') }
})
```

**Contract details.** `presetConditions()` returns a plain conditions map — spread it to extend, omit keys by destructuring, or pass it whole. It *adds to* the core base set ([dux-spec-css.md §1](./dux-spec-css.md#1-createsystem--bind-once-typed-everywhere)), contributing the opinionated names:

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
- The labeled escape emits its rule at build time, memoized and labeled (style modules are where the compiler is listening); one reaching a *runtime* call gets the lane redirect — runtime data crosses through a port ([dux-patterns.md §4]).
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

**Contract details.** `focusRing()` (token-driven, `:focus-visible`-scoped), `visuallyHidden()`, `minTarget(px)`. Each is a plain declaration fragment — spreadable, overridable, deletable. Forced-colors styling needs no helper: `forcedColors` is already a preset condition, one bare key away — a wrapper would carry nothing (principle 10). The companion *check* — removing `outline` in an interactive style without a `focusVisible` replacement warns with `focusRing()` as the fix-it — lands with the audits ([dux-spec-introspection.md §3](./dux-spec-introspection.md#3-audits)).

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
