updated: 2026-07-07
status: spec — contracts settled, implementation pending

# vane-dux — spec: tokens

The token graph: how design decisions are defined, related, compiled, checked, and themed. This is the product's foundation — components are downstream of tokens — and phase 1 of the roadmap, deliberately shippable against plain vanilla-extract before any other domain exists.

Each entry is **contract-driven**: the desired behavior and why it matters, the intended usage, then a proposed implementation. Vocabulary: [dux-language.md §1](./dux-language.md#1-vocabulary). Cross-cutting law: [dux-patterns.md §3](./dux-patterns.md#3-liveness).

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | `defineTokens` — the graph in plain TS | ☐ |
| 2 | Liveness compilation | ☐ |
| 3 | Schemes | ☐ |
| 4 | Elevation | ☐ |
| 5 | Contrast and checks | ☐ |
| 6 | Composite tokens | ☐ |
| 7 | Themes: `theme()` and `applyTheme` | ☐ |
| 8 | Metadata | ☐ |
| 9 | Emitted names | ☐ |

Snippets use the Prism fixture design system ([dux-workspace.md §2](./dux-workspace.md#2-sandbox)).

---

## 1. `defineTokens` — the graph in plain TS

**Why.** Tokens elsewhere are flat bags of strings, relationships frozen into literals by a preprocessor, maintained per scheme by hand. Making tokens a typed *graph* — values, pairs, and derivations — is what turns the TypeScript language server into the design system's tooling: autocomplete knows a token the instant it's typed, find-references lists every consumer, deleting one turns every usage red. No YAML, no config file, no codegen step, no CLI to keep in sync.

**Usage.**

```TS
// design/tokens.style.ts
import { alpha, defineTokens, elevation, legibleOn, oklch, scale, scheme } from '@mszr/vane-dux'

export const t = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285).live(),                 // runtime input — user-themeable
    surface: elevation(0.03),                            // plane position, scheme-aware
    ink: elevation(0.94),
    brandSoft: ({ color }) => alpha(color.brand, 0.12),  // derivation — a graph edge
    brandHover: ({ color }) => color.brand.lighten(0.06),
    onBrand: legibleOn(({ color }) => color.brand),      // guaranteed-legible pairing
    canvas: scheme({ light: oklch(0.99, 0.005, 285), dark: oklch(0.14, 0.006, 285) }),
  },
  space: scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6, xl: 10 } }),
  radius: { sm: '4px', md: '8px', pill: '999px' },
  duration: { fast: '120ms', normal: '200ms' },
})
```

**Contract details.**

- `t` is an ordinary typed export; token references are property accesses, never string paths. Hovering a token shows its resolved value(s) and emitted variable name.
- Derivations receive the typed graph and return values or further expressions; cycles are a build diagnostic naming the loop.
- Plain strings/numbers are valid leaves — the graph machinery is opt-in per token (principle 10).
- `scale.*` generators (`linear`, `modular`, …) are ordinary functions producing token subtrees; nothing about them is special-cased.
- The dedicated tokens file is the *library-authoring* form. An app that wants one design file passes the same graph to `createSystem({ tokens: { … } })` and receives `t` back bound ([dux-spec-css.md §1](./dux-spec-css.md#1-createsystem--bind-once-typed-everywhere)) — the split is available, never required.

**Proposed approach.** `defineTokens` walks the object, resolves derivation thunks against a lazy proxy of the graph, classifies liveness (§2), and registers one global-theme emission via the vanilla-extract substrate (`createGlobalThemeContract` + `createGlobalTheme` internally; never re-exported). The returned `t` is a proxy of typed token handles: each carries its `var(--…)` reference for interpolation, its resolved value(s) for hovers/checks, and its metadata.

---

## 2. Liveness compilation

**Why.** hail-styl's most valuable idea — a color's lightness as a *formula* over semantic elevation, alive in the browser — died in every TS token system because tokens were static value maps. Liveness generalizes it: derivations survive to runtime **as CSS**, so one variable write re-derives the world with zero JS recomputation.

**Usage → emitted.**

```TS
brand: oklch(0.58, 0.2, 285).live(),
brandSoft: ({ color }) => alpha(color.brand, 0.12),
brandHover: ({ color }) => color.brand.lighten(0.06),
```

```css
:root {
  --vane-color-brand: oklch(0.58 0.2 285);
  --vane-color-brand-soft: oklch(from var(--vane-color-brand) l c h / 0.12);
  --vane-color-brand-hover: oklch(from var(--vane-color-brand) calc(l + 0.06) c h);
}
```

**Contract details.**

- Classification per [dux-patterns.md §3](./dux-patterns.md#3-liveness): all-static inputs fold at build; any live input compiles the derivation to relative color syntax, `color-mix()`, `calc()`, or `light-dark()`.
- **The color-handle surface is finite and documented.** Color handles carry: `alpha`, `lighten`, `darken`, `saturate`, `desaturate`, `rotate` (hue), and `mix(other, amount)`; each exists both as a method (`color.brand.lighten(0.06)`) and a standalone helper (`alpha(color.brand, 0.12)`). Every one has a defined live-CSS serialization, which is what bounds the set — a proposed helper that cannot compile to CSS under liveness doesn't ship. Helpers are equally legal in style rules (`background: alpha(t.color.ink, 0.42)` inside `css()`), where they follow the same static-fold/live-serialize classification.
- Build-time color math and emitted CSS color math must agree to the rounding digit, or static and live ramps diverge subtly. This is a locked test fixture, not a hope.
- A derivation the compiler cannot express as CSS (e.g. arbitrary string manipulation over a live input) is a build diagnostic at the derivation, naming the unexpressible step and the two exits: make the input static, or accept a build-folded approximation explicitly.

**Proposed approach.** Color handles (`oklch`, `alpha`, `lighten`, `mix`, …) build a tiny expression tree rather than computing eagerly. The compiler either evaluates the tree (culori-grade math) or serializes it to CSS, choosing per liveness. Non-color numeric derivations serialize to `calc()`.

---

## 3. Schemes

**Why.** "Add dark mode" must touch token definitions only (gauntlet moment 2). A scheme is a value pair inside one token — never a parallel palette — and switching is native: `color-scheme` + `light-dark()`, no JS, no flash-prone class swap for the preference-following default.

**Usage.**

```TS
canvas: scheme({ light: oklch(0.99, 0.005, 285), dark: oklch(0.14, 0.006, 285) }),
surface: elevation(0.03), // elevation is scheme-aware by construction
```

```css
:root { color-scheme: light dark; }
:root { --vane-color-canvas: light-dark(oklch(0.99 0.005 285), oklch(0.14 0.006 285)); }
```

**Contract details.**

- Scheme-dependent tokens are live by definition (§2 applies downstream).
- Forcing a scheme (user toggle) is standard CSS: the system emits `[data-scheme='light']`/`[data-scheme='dark']` scopes that pin `color-scheme`; `/runtime` ships a two-line `setScheme(el, scheme)` and the Nuxt module documents the SSR cookie dance ([dux-spec-vue.md §5](./dux-spec-vue.md#5-ssr-and-hmr)) — no zero-runtime system escapes it, so we ship the recipe instead of pretending.
- Custom scheme axes beyond light/dark (high-contrast brand modes) are themes ([§7](#7-themes-theme-and-applytheme)), not schemes — the scheme axis is the one the platform natively pairs.

---

## 4. Elevation

**Why.** The single strongest idea in hail-styl: express surfaces, borders, and inks as *positions between the background and foreground planes* (0–1), and derive per-scheme lightness from position. Light/dark falls out automatically; a new elevation token is one number, not two colors.

**Usage.**

```TS
surface: elevation(0.03),
surfaceRaised: elevation(0.08),
border: elevation(0.20),
inkMuted: elevation(0.62),
ink: elevation(0.94),
```

**Contract details.**

- `elevation(n)` maps `n` to lightness per scheme (rising = lighter in dark, darker in light), tinted by the system's configurable base hue/chroma, compiled to `light-dark()` (§3).
- Elevation is a **preset derivation, not a core axiom**: it ships in the box because it's the maintainer's proven model, but it is expressible entirely in userland via `scheme()` + derivations — deleting it costs nothing (principle 10).
- The curve (how positions map to lightness) is a system option with a perceptually-tuned default.

---

## 5. Contrast and checks

**Why.** Accessibility pairings are usually an audit nobody re-runs. The graph knows both endpoints of every pairing — including both scheme values — so legibility becomes a build diagnostic with a fix-it (principle 7). The derivation is named for what it *produces* — a color legible on its target — not for the check it happens to carry; `onBrand: legibleOn(…brand)` reads as the relationship it is.

**Usage.**

```TS
onBrand: legibleOn(({ color }) => color.brand),
```

```text
✖ VANE_TOKENS_CONTRAST  color.onBrand / color.brand fails APCA Lc 60 in scheme "dark"
    brand (dark) → oklch(0.68 0.2 285); best pairing white = Lc 47.2
    at design/tokens.style.ts:9
  fix: darken brand in dark scheme, or accept explicitly: legibleOn(…, { minLc: 45 })
```

**Contract details.**

- `legibleOn(fn)` yields the legible pairing for a target token, checked at build against both schemes (APCA by default; WCAG2 selectable per system).
- Over a **live** target the guarantee cannot be total: the emitted value uses `contrast-color()` where supported plus a computed fallback, and the handle types as `LiveContrast`, not `CheckedContrast` — honest limits, stated in types ([dux-patterns.md §3](./dux-patterns.md#3-liveness)). `applyTheme` can optionally clamp live inputs to a legible range.
- Standalone assertions cover pairings the graph doesn't own: `checks: [check.textContrast(t.color.ink, t.color.canvas).aa()]` in `defineTokens` options.
- Checks are diagnostics with fix-its, never hard gates you can't consciously accept — an explicit threshold override is always available and shows up in the audit ([dux-spec-introspection.md §3](./dux-spec-introspection.md#3-audits)).

---

## 6. Composite tokens

**Why.** Some design decisions are multi-property (a text style: size + line height + weight; a focus ring). hail-styl called these token assignments; they must spread as ordinary declarations, no unwrap ceremony.

**Usage.**

```TS
text: {
  body: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 400 },
  title: { fontSize: '1.375rem', lineHeight: 1.25, fontWeight: 600 },
},
```

```TS
export const heading = css({ ...t.text.title, color: t.color.ink })
```

**Contract details.** A composite token is a declaration fragment whose values may themselves be tokens or derivations; it participates in liveness per member. Spreading is the whole consumption API.

---

## 7. Themes: `theme()` and `applyTheme`

**Why.** A theme is a scoped set of token overrides — brand sections, white-labeling, user preference. The same concept exists at build time (a class scoping overridden variables) and at runtime (writing live variables); naming them as a pair keeps one mental model.

**Usage.**

```TS
// build time — any tokens; standalone form (phase 1, before the system exists)
export const midnight = theme(t, { color: { brand: oklch(0.45, 0.15, 250) } }) // → class

// runtime — live tokens only, ~300B from /runtime
applyTheme(document.documentElement, { color: { brand: userPicked } })
```

Once a system exists, `createSystem` binds the tokens and the bound form drops the first argument: `theme({ color: { brand } })` ([dux-spec-css.md §1](./dux-spec-css.md#1-createsystem--bind-once-typed-everywhere)).

**Contract details.**

- `theme()` accepts overrides for any token and emits a class scoping the re-declared variables; derivations downstream re-derive automatically (live ones via CSS; static ones re-folded at build within the theme scope).
- `applyTheme()` accepts **live tokens only** — a static key is a type error at that key ([dux-patterns.md §3](./dux-patterns.md#3-liveness)). One write re-derives every downstream surface, hover, and pairing in the cascade: gauntlet moment 3.
- Themes nest by DOM scoping, exactly like the custom properties they are.

---

## 8. Metadata

**Why.** Tokens are read by hovers, docs, audits, and agents; the definition site is where intent lives.

**Usage.**

```TS
brand: oklch(0.58, 0.2, 285).live().describe('Primary brand hue. Marketing owns this.'),
legacyBlue: oklch(0.6, 0.15, 250).deprecated('use color.brand'),
```

**Contract details.** `describe` surfaces in editor hover and the manifest; `deprecated` rides the standard `@deprecated` machinery — strikethrough at every usage, no custom tooling. Renting the TypeScript ecosystem's affordances is the whole trick.

---

## 9. Emitted names

**Why.** The emitted variables are a public, consumer-facing API (themes, devtools, third-party CSS reading our tokens); their names must be predictable and collision-safe.

**Contract details.**

- Path-derived kebab names under the system prefix: `t.color.brandSoft` → `--vane-color-brand-soft`; prefix configurable (`createSystem({ prefix: 'prism' })` → `--prism-*`).
- Names are stable across builds (no content hashing for tokens — they are the *intended* public surface, unlike style classes).
- The full name map ships in the manifest ([dux-spec-introspection.md §2](./dux-spec-introspection.md#2-the-manifest)).
