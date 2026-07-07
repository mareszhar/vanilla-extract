updated: 2026-07-06
status: spec — contracts settled, implementation pending

# vane-dux — spec: recipes

Variants and anatomy: how component styling compresses state into a legible, typed contract. Phase 4 of the roadmap. The behavioral law is [dux-patterns.md §7](./dux-patterns.md#7-variants-compress-state); the diagnostics bar is [§10](./dux-patterns.md#10-diagnostics-are-a-contract).

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | `recipe()` — variants, toggles, compound, defaults | ☐ |
| 2 | Published ports: the `ports:` key | ☐ |
| 3 | `anatomy()` — parts styled as one unit | ☐ |
| 4 | The call site: props in, classes out | ☐ |
| 5 | Headless states | ☐ |
| 6 | Diagnostics quality | ☐ |

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
- Calling with no arguments yields the defaults; the full call-site law — strict literals, permissive widened props — is [§4](#4-the-call-site-props-in-classes-out).

**Proposed approach.** Per-arm `css()` emission plus a tiny generated lookup (the runtime is a class-string join over a precomputed table). Prior art to read, not depend on: `@vanilla-extract/recipes`, CVA.

---

## 2. Published ports: the `ports:` key

**Why.** A component's variant space and its runtime style API belong to one contract. Without a home on the recipe, every component invents a sidecar export (`buttonPorts`) that the consumer must separately discover and import — coordination ceremony the recipe can erase.

**Usage.**

```TS
// Button.style.ts — declare locally, publish on the recipe
const paddingX = port(t.space.md)

export const button = recipe({
  ports: { paddingX },
  base: { paddingInline: paddingX, display: 'inline-flex' },
  variants: {
    size: {
      sm: { ...paddingX.set(t.space.sm) }, // static set, compiles into the class
      md: {},
    },
  },
  defaults: { size: 'md' },
})
```

```TS
// Toolbar.style.ts — the consumer reaches the style API through the recipe
import { button } from '../Button/Button.style'

export const toolbar = css({
  display: 'flex',
  ...button.ports.paddingX.set(t.space.lg), // themes every nested button, zero runtime
})
```

**Contract details.**

- `ports:` is publication, not declaration: values are ordinary port handles ([dux-spec-ports.md §1](./dux-spec-ports.md#1-port--declaration-and-interpolation)) created in module scope, so arms reference them directly and the grammar never forks into callback forms.
- Published ports surface as `button.ports.*` — one import gives a consumer the classes *and* the style API — and are recorded in the manifest as the component's runtime surface ([dux-spec-introspection.md §2](./dux-spec-introspection.md#2-the-manifest)).
- Anatomy publishes identically (`dialog.ports.*`).
- An unpublished port still works everywhere; publication is how a component *advertises* its themeable surface (principle 10 — publishing is opt-in, not a tax).

---

## 3. `anatomy()` — parts styled as one unit

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
- **Part-scoped conditions.** A part often responds to *another part's* state — the input flattens its corners when the root is open. Inside an anatomy arm, a `'<part>:<condition>'` key expresses that relationship, typed over the declared parts × the system's conditions, compiling to the ancestor-state selector:

  ```TS
  input: {
    borderRadius: t.radius.md,
    'root:open': { borderEndStartRadius: 0, borderEndEndRadius: 0 },
  }
  ```

  No raw `'[data-state="open"] &'` string needed for relationships the anatomy already knows about; the raw form remains available for states outside the anatomy ([dux-patterns.md §8](./dux-patterns.md#8-escape-hatch-grace)).
- Dev builds add `data-part` attributes' styling hooks via stable debug class names (`Dialog_content__h4x`) — provenance for devtools ([dux-spec-introspection.md §1](./dux-spec-introspection.md#1-provenance)).
- Cross-part selectors use typed part references, same rule as cross-file class references ([dux-spec-css.md §4](./dux-spec-css.md#4-selectors-and-cross-file-references)).

---

## 4. The call site: props in, classes out

**Why.** `button(props)` is the most-executed line in the SDK, and nearly every real component mixes variant props with its own (`disabled`, `href`, `loading`). If the everyday call required ceremony to strip non-variant keys, the boilerplate principle would be violated at the doorway of every component. So the call site is engineered around how TypeScript actually checks: strict on literals, permissive on widened objects.

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

- **A wider props object just works.** `button(props)` accepts any object assignable to the variant props; unknown keys are ignored at runtime (resolution reads only declared variants and toggles). No `pick`, no wrapper, no per-component stripping — ever.
- **Literals stay strict.** `button({ intnet: 'brand' })` is a red squiggle: TypeScript's excess-property checks fire on object literals, so inline typos die at the cursor while spread props flow through. The two behaviors are the same type, used as designed.
- **Values are always checked.** A declared variant key with an undeclared value (`intent: 'brnd'`) is a type error wherever the object is typed, and a dev-mode runtime warning when it arrives through an untyped edge.
- `VaneProps<typeof button>` hovers as the plain optional object (`{ intent?: 'brand' | 'ghost' | 'danger'; size?: 'sm' | 'md'; pill?: boolean }`) — readable public types, no internals wall.
- **Anatomy in Vue: `useAnatomy`.** An anatomy call returns a record, and the tempting `const d = dialog(props)` in `<script setup>` silently loses reactivity. The `/vue` overlay ships the blessed one-liner — a typed `computed` that keeps part classes reactive and template-clean ([dux-spec-vue.md §2](./dux-spec-vue.md#2-useanatomy)):

  ```vue
  <script setup lang="ts">
  const d = useAnatomy(dialog, props)
  </script>
  <template>
    <div :class="d.backdrop" />
    <div :class="d.content"><slot /></div>
  </template>
  ```

  Single-class recipes need no wrapper — `:class="button(props)"` inline is already reactive and stays the documented form.

---

## 5. Headless states

**Why.** Headless libraries (Reka UI, Ark) expose state as `data-*` attributes; styling them must be the happy path.

**Usage.**

```TS
export const accordionItem = css({
  open: { borderColor: t.color.brand },      // open: '&[data-state="open"]' in the system
  '&[data-highlighted]': { background: t.color.brandSoft },
})
```

**Contract details.** State conditions are ordinary system conditions (`data('state', 'open')` helper or raw selector); the preset ships the common headless set ([dux-spec-preset.md §2](./dux-spec-preset.md#2-preset-conditions)). No adapter layer exists or is needed. **Who sets `data-state`:** a headless library (Reka UI, Ark) sets it for you — that's its contract; when you own the DOM, bind it yourself (`:data-state="open ? 'open' : 'closed'"`). The quickstart and demo model both.

---

## 6. Diagnostics quality

**Why.** Variant authoring is where beginners live; the error experience is the contract ([dux-patterns.md §10](./dux-patterns.md#10-diagnostics-are-a-contract)).

**Contract details.**

- Recipe/anatomy options take **one signature with union-typed arms**, never sibling overloads — a malformed options object reports a single diagnostic at the offending property, never a "no overload matches" wall.
- A misspelled variant value at a call site names the valid set; a misspelled part names the declared parts.
- The editor-DX plane locks these messages per the workspace testing law ([dux-workspace.md §5](./dux-workspace.md#5-testing)).
