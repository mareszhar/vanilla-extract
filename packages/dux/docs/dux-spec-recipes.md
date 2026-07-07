updated: 2026-07-06
status: spec — contracts settled, implementation pending

# vane-dux — spec: recipes

Variants and anatomy: how component styling compresses state into a legible, typed contract. Phase 4 of the roadmap. The behavioral law is [dux-patterns.md §7](./dux-patterns.md#7-variants-compress-state); the diagnostics bar is [§10](./dux-patterns.md#10-diagnostics-are-a-contract).

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | `recipe()` — variants, toggles, compound, defaults | ☐ |
| 2 | `anatomy()` — parts styled as one unit | ☐ |
| 3 | Inferred props: `VaneProps` | ☐ |
| 4 | Headless states | ☐ |
| 5 | Diagnostics quality | ☐ |

---

## 1. `recipe()` — variants, toggles, compound, defaults

**Why.** The variants model is the part of this problem the last decade actually solved (Stitches proved it; everyone inherited it). vane-dux keeps the settled shape deliberately — a proposal earns trust by not re-inventing solved things — and adds only two refinements: toggles as their own key, and full condition support inside every arm.

**Usage.**

```TS
// Button.style.ts
import { recipe } from '~/design/system.style'
import { t } from '~/design/tokens.style'

export const button = recipe({
  base: {
    ...t.text.body,
    display: 'inline-flex',
    alignItems: 'center',
    gap: t.space.xs,
    borderRadius: t.radius.sm,
  },
  variants: {
    intent: {
      brand: { background: t.color.brand, color: t.color.onBrand, hover: { background: t.color.brandHover } },
      ghost: { background: 'transparent', color: t.color.ink, hover: { background: t.color.brandSoft } },
      danger: { background: t.color.danger, color: t.color.onDanger },
    },
    size: {
      sm: { paddingInline: t.space.sm, minBlockSize: 32 },
      md: { paddingInline: t.space.md, minBlockSize: 40 },
    },
  },
  toggles: {
    pill: { borderRadius: t.radius.pill },
  },
  compound: [
    { when: { intent: 'ghost', size: 'sm' }, style: { paddingInline: t.space.xs } },
  ],
  defaults: { intent: 'brand', size: 'md' },
})
```

```TS
button({ intent: 'danger', size: 'sm', pill: true }) // → class string
button.variants // → the typed variant map, for prop forwarding and docs
```

**Contract details.**

- Every arm — `base`, each variant value, each toggle, each compound `style` — is a full vane rule: conditions, selectors, ports, and composite tokens all legal.
- **Finite choice only:** a recipe call resolves among precompiled classes; the lane redirect diagnostic points non-finite values to ports ([dux-patterns.md §4](./dux-patterns.md#4-the-runtime-boundary-is-a-port)).
- `compound` entries type `when` against declared variants/toggles — an impossible combination errors at the offending key.
- `defaults` compile into `base` where possible (no extra class for the default case).
- Calling with no arguments yields the defaults; unknown variant keys and misspelled values error at the key.

**Proposed approach.** Per-arm `css()` emission plus a tiny generated lookup (the runtime is a class-string join over a precomputed table). Prior art to read, not depend on: `@vanilla-extract/recipes`, CVA.

---

## 2. `anatomy()` — parts styled as one unit

**Why.** Serious components are multi-part — dialog, select, tabs, data table. Without a first-class unit, every component invents its own naming, context, and override conventions. An anatomy styles named **parts** together, with variants that apply across parts. (The word is *part*, never "slot" — [dux-language.md §3](./dux-language.md#3-naming-collisions-we-refuse).)

**Usage.**

```TS
// Dialog.style.ts
export const dialog = anatomy({
  parts: ['backdrop', 'positioner', 'content', 'title', 'close'],
  base: {
    backdrop: {
      position: 'fixed',
      inset: 0,
      background: alpha(t.color.ink, 0.42),
      open: { motionOk: { animation: `${fade} 160ms ease-out` } },
    },
    positioner: { position: 'fixed', inset: 0, display: 'grid', placeItems: 'center' },
    content: {
      width: 'min(100%, 36rem)',
      borderRadius: t.radius.md,
      background: t.color.surfaceRaised,
    },
    title: { ...t.text.title },
  },
  variants: {
    size: {
      sm: { content: { width: 'min(100%, 28rem)' } },
      lg: { content: { width: 'min(100%, 52rem)' } },
    },
  },
  defaults: { size: 'sm' },
})
```

```TS
const d = dialog({ size: 'lg' })
d.content // → class string per part; d is a typed record keyed by part
```

**Contract details.**

- Same options grammar as `recipe` with one added dimension: each arm is keyed by part. Learn `recipe`, know `anatomy` (principle 5).
- Part names are typed everywhere: a variant arm referencing an undeclared part errors at that key.
- Dev builds add `data-part` attributes' styling hooks via stable debug class names (`Dialog_content__h4x`) — provenance for devtools ([dux-spec-introspection.md §1](./dux-spec-introspection.md#1-provenance)).
- Cross-part selectors use typed part references, same rule as cross-file class references ([dux-spec-css.md §4](./dux-spec-css.md#4-selectors-and-cross-file-references)).

---

## 3. Inferred props: `VaneProps`

**Why.** A recipe's variant space *is* the component's style-prop contract; restating it as prop types is drift waiting to happen.

**Usage.**

```vue
<script setup lang="ts">
import { button } from './Button.style'
import type { VaneProps } from '@mszr/vane-dux'

const props = defineProps<VaneProps<typeof button> & { disabled?: boolean }>()
</script>

<template>
  <button :class="button(props)" :disabled="disabled">
    <slot />
  </button>
</template>
```

**Contract details.**

- `VaneProps<typeof button>` hovers as the plain optional object (`{ intent?: 'brand' | 'ghost' | 'danger'; size?: 'sm' | 'md'; pill?: boolean }`) — readable public types, no internals wall.
- Recipe/anatomy calls accept extra keys silently-ignored **never**: excess keys error (the props object is often a component's whole `props` — the type must catch a typo'd variant, not swallow it). Spreading a wider props object is supported via `button(pick(props, button.variants))` or the overlay helpers.

---

## 4. Headless states

**Why.** Headless libraries (Reka UI, Ark) expose state as `data-*` attributes; styling them must be the happy path.

**Usage.**

```TS
export const accordionItem = css({
  open: { borderColor: t.color.brand },      // open: '&[data-state="open"]' in the system
  '&[data-highlighted]': { background: t.color.brandSoft },
})
```

**Contract details.** State conditions are ordinary system conditions (`data('state', 'open')` helper or raw selector); the preset ships the common headless set ([dux-spec-preset.md §2](./dux-spec-preset.md#2-preset-conditions)). No adapter layer exists or is needed.

---

## 5. Diagnostics quality

**Why.** Variant authoring is where beginners live; the error experience is the contract ([dux-patterns.md §10](./dux-patterns.md#10-diagnostics-are-a-contract)).

**Contract details.**

- Recipe/anatomy options take **one signature with union-typed arms**, never sibling overloads — a malformed options object reports a single diagnostic at the offending property, never a "no overload matches" wall.
- A misspelled variant value at a call site names the valid set; a misspelled part names the declared parts.
- The editor-DX plane locks these messages per the workspace testing law ([dux-workspace.md §5](./dux-workspace.md#5-testing)).
