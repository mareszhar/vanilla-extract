updated: 2026-07-06
status: spec — contracts settled, implementation pending

# vane-dux — spec: preset

The thin opinionated convenience layer: a hospitable starting point that takes away ceremony for most users without locking the foundation it's built on. Phase 6 of the roadmap.

The preset's law: **opinions live where they're deletable.** Everything here consumes only the public core surface — a user can replace any piece (or all of it) with their own, and the core never knows the difference. Starting from nothing is too much ceremony; starting from someone else's totalizing philosophy is moving into their house. The preset is a furnished room with the receipts attached.

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | Preset tokens | ☐ |
| 2 | Preset conditions | ☐ |
| 3 | `atoms` | ☐ |
| 4 | A11y helpers | ☐ |
| 5 | Motion opinions | ☐ |
| 6 | Layout patterns | ☐ |

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

- OKLCH-derived brand ramp from one seed color; elevation-driven surfaces/borders/inks ([dux-spec-tokens.md §4](./dux-spec-tokens.md#4-elevation)) so both schemes fall out automatically; `contrast()` pairings prewired.
- Spacing (linear ×4), type scale with composite `text.*` styles, radii, shadows, z-index scale, durations and easings.
- The seed options (`radius`, `density`, `contrast`) are hail-styl-style **controls**: one knob retunes a family of tokens without editing them individually.
- The output is a plain token subtree — inspectable, spreadable, partially adoptable.

---

## 2. Preset conditions

**Why.** The condition set is where accumulated platform knowledge lives; nobody should have to remember the forced-colors media query.

**Contract details.** One import provides the working set, mergeable with user conditions in `createSystem`:

- interaction: `hover` (`:hover, :focus-visible`), `down`, `focusVisible`, `disabled`
- breakpoints `sm…2xl`; container sizes; orientation
- preference: `dark`, `light`, `motionOk`, `motionReduce`, `contrastMore`, `forcedColors`
- direction: `ltr`, `rtl`
- headless states: `open`, `closed`, `checked`, `selected`, `highlighted`, `invalid` (the Zag/Reka `data-state`/`data-*` contract)

---

## 3. `atoms`

**Why.** The strict utility lane: for styling where a recipe is overkill, and the inline-ish sugar that softens the sibling-file cost. Backed by the token map, so it's fast *and* consistent — and dynamic values ride through ports, so CSS output scales with conditions, never with values (the rainbow-sprinkles model, made a core pattern).

**Usage.**

```vue
<template>
  <section :class="atoms({ stack: true, gap: 'sm', p: { base: 'md', md: 'lg' } })">
    <slot />
  </section>
</template>
```

```TS
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
})
```

**Contract details.**

- Token keys autocomplete; values outside the map are rejected at the key — *unless* passed through the labeled escape (`unsafe.value('37ch', 'editorial measure')`), which flows through a port and surfaces in the audit.
- Responsive/conditional maps use the same condition grammar as everything else (principle 5).
- Static combinations pre-generate bounded CSS; arbitrary values write port vars inline — output cost is predictable by construction.
- `defineAtoms` is public core-consuming machinery: teams define their own maps; the preset ships a tasteful default instance.

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

**Contract details.** `focusRing()` (token-driven, `:focus-visible`-scoped), `visuallyHidden()`, `minTarget(px)`, `forcedColors()` mappings to system colors. Each is a plain declaration fragment — spreadable, overridable, deletable. The companion *check*: removing `outline` in an interactive style without a `focusVisible` replacement is a build warning with `focusRing()` as the fix-it.

---

## 5. Motion opinions

**Why.** Respecting `prefers-reduced-motion` should be the default posture, not a per-animation memory test.

**Contract details.**

- Preset motion tokens: durations, easing curves (including a spring-approximation `linear()` easing), and named keyframe fragments (`fade`, `slideUp`, `scaleIn`).
- Under the preset, `animation`/`transition` declarations in preset-derived helpers are `motionOk`-guarded by default; `.always()` is the explicit opt-out for motion that must run (e.g. a loading spinner).
- Core `css()` is never silently rewritten — the guard is a preset-helper opinion, not a compiler mutation (principle 10).

---

## 6. Layout patterns

**Why.** The recurring compositional layouts have names; giving them typed, token-fed implementations removes a whole class of flexbox re-derivation.

**Contract details.** `stack`, `inline`, `cluster`, `center`, `sidebar`, `switcher`, `frame`, `reel` — each a parameterized recipe over preset tokens (`stack({ gap: 'md', align: 'start' })`), returning ordinary classes. Documented with their CSS so they teach, not obscure.
