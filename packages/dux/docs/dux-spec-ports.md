updated: 2026-07-06
status: spec — contracts settled, implementation pending

# vane-dux — spec: ports

The typed runtime boundary — vane-dux's flagship new primitive. Phase 3 of the roadmap. The unification argument and boundary law live in [dux-patterns.md §4](./dux-patterns.md#4-the-runtime-boundary-is-a-port); this spec owns the surface.

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | `port()` — declaration and interpolation | ☐ |
| 2 | Setters and the `ports()` merge | ☐ |
| 3 | Value kinds and serialization | ☐ |
| 4 | Child and consumer theming | ☐ |
| 5 | SSR | ☐ |

---

## 1. `port()` — declaration and interpolation

**Why.** Every existing build/runtime crossing is untyped (Vue's `v-bind()` in CSS), ceremonial (`createVar` + `assignInlineVars` plumbing per component), or implicit (utility-internal inline vars). A port is the crossing made first-class: declared with a type and a default, exported, findable, renameable, deprecable.

**Usage.**

```TS
// Progress.style.ts
import { css, port } from '~/design/system.style'
import { t } from '~/design/tokens.style'

export const fraction = port<number>('fraction', { default: 0 })
export const tint = port<VaneColor>('tint', { default: t.color.brand })

export const track = css({
  background: t.color.surface,
  borderRadius: t.radius.pill,
  blockSize: t.space.sm,
})

export const fill = css({
  inlineSize: `calc(${fraction} * 100%)`, // interpolates as var(--prism-fraction-h4x, 0)
  background: tint,
  blockSize: '100%',
  motionOk: { transition: 'inline-size 200ms ease' },
})
```

**Contract details.**

- A port interpolates in any rule position as `var(--…, <default>)`; the default makes every style complete without its runtime half.
- Ports are scoped identifiers (hashed like classes) — two components' `fraction` ports never collide; the *export* is the identity.
- `.describe()` / `.deprecated()` ride the same metadata machinery as tokens ([dux-spec-tokens.md §8](./dux-spec-tokens.md#8-metadata)) and flow into the manifest.

**Proposed approach.** `createVar` underneath with the system prefix and a serialized default; the handle carries the var reference (for interpolation via `toString`), the type, and the setter.

---

## 2. Setters and the `ports()` merge

**Why.** Setting a port must be typed at the value, cheap at runtime, and framework-neutral: the output currency is a style-object fragment any framework can bind.

**Usage.**

```TS
fraction.set(0.62)                       // → { '--prism-fraction-h4x': '0.62' }
ports(fraction.set(p), tint.set(color)) // merged fragment
```

**Contract details.**

- `set()` type-checks the value against the port's declared type; serialization is kind-driven (§3).
- Setting writes a value — never a rule, never a stylesheet ([dux-patterns.md §4](./dux-patterns.md#4-the-runtime-boundary-is-a-port)).
- `set()` and `ports()` live on the core handles with ~zero runtime; the `/runtime` subpath adds only DOM conveniences (`setPorts(el, …)` for imperative code outside a framework).

---

## 3. Value kinds and serialization

**Why.** A number can mean a ratio, a pixel length, or a degree; the port must serialize predictably or the type is a lie at the wire.

**Contract details.**

- The declared type maps to a serialization kind: `number` → unitless, `VaneLength` → the canonical unit rule from `css()`, `VaneColor` → color syntax or token var, `string` → passthrough (parsed once in dev for validity).
- Ambiguity is resolved at the declaration, not the call: `port<number>('angle', { as: 'deg' })`.
- Dev builds validate each `set()` value's serialization once and warn with the port's name on mismatch — the cursor lie ban extends to runtime writes.

---

## 4. Child and consumer theming

**Why.** Vue's `:deep()` couples a parent to a child's internal DOM through a string no tool can see. The port inversion: the child *declares* what's themable; the parent sets values through the cascade — component props, arrived at the same place for styling.

**Usage.**

```TS
// Button.style.ts — the child publishes its style API
export const buttonPorts = {
  gap: port<VaneLength>('gap', { default: t.space.xs }),
  radius: port<VaneLength>('radius', { default: t.radius.sm }),
}

// Toolbar.style.ts — the parent themes buttons without knowing their DOM
export const toolbar = css({
  display: 'flex',
  ...buttonPorts.gap.set(t.space.xs), // static set: compiles into the rule
})
```

**Contract details.**

- `set()` accepts token references as well as runtime values; a static `set` inside a `css()` rule compiles away entirely — parent→child theming can be fully zero-runtime.
- The same mechanism is the shipped-library theming story: consumers set a published port on any subtree, no build pipeline required (it's just a custom property).
- True structural child selectors remain available via `within()` ([dux-spec-css.md §4](./dux-spec-css.md#4-selectors-and-cross-file-references)); ports are for *values*, `within` for *structure*.

---

## 5. SSR

**Why.** The live plane must not complicate server rendering: port values are inline style, the most boring SSR primitive there is.

**Contract details.**

- Port fragments serialize into the rendered `style` attribute; hydration sees identical values and does nothing.
- No per-request style collection, no injected stylesheets, no hydration mismatch class — the failure modes of runtime CSS-in-JS are structurally absent.
- The reactive binding (`usePorts`) is specced with the Vue overlay ([dux-spec-vue.md §1](./dux-spec-vue.md#1-useports)).
