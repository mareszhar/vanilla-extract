updated: 2026-07-10
status: spec — contracts settled, implemented (phase 1)

# vane-dux — spec: tokens

The token graph: how design decisions are defined, related, compiled, checked, and themed. This is the product's foundation — components are downstream of tokens — and phase 1 of the roadmap, deliberately shippable against plain vanilla-extract before any other domain exists.

Each entry is **contract-driven**: the desired behavior and why it matters, the intended usage, then a proposed implementation. Vocabulary: [dux-language.md §1](./dux-language.md#1-vocabulary). Cross-cutting law: [dux-patterns.md §3](./dux-patterns.md#3-liveness).

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | `defineTokens` — the graph in plain TS | ☑ |
| 1a | Token modules and composition | ☑ |
| 2 | Liveness compilation | ☑ |
| 3 | Schemes | ☑ |
| 4 | Elevation | ☑ |
| 5 | Contrast and checks | ☑ |
| 6 | Composite tokens | ☑ |
| 7 | Themes: `theme()` and `applyTheme` | ☑ |
| 8 | Metadata | ☑ (hover/manifest surfacing lands with the manifest) |
| 9 | Emitted names | ☑ |

Snippets use the Prism fixture design system ([dux-workspace.md §2](./dux-workspace.md#2-sandbox)).

---

## 1. `defineTokens` — the graph in plain TS

**Why.** Tokens elsewhere are flat bags of strings, relationships frozen into literals by a preprocessor, maintained per scheme by hand. Making tokens a typed *graph* — values, pairs, and derivations — is what turns the TypeScript language server into the design system's tooling: autocomplete knows a token the instant it's typed, find-references lists every consumer, deleting one turns every usage red. No YAML, no config file, no codegen step, no CLI to keep in sync.

**Usage.**

```TS
// design/tokens.style.ts
import { alpha, defineTokens, legibleOn, oklch, scale, scheme } from '@mszr/vane-dux'
import { elevation } from '@mszr/vane-dux/preset'

export const t = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285).live(),                  // runtime input — user-themeable
    canvas: scheme({ light: oklch(0.99, 0.005, 285), dark: oklch(0.14, 0.006, 285) }),
  },
  space: scale.linear({ unit: 4, steps: { xs: 1, sm: 2, md: 4, lg: 6, xl: 10 } }),
  radius: { sm: '4px', md: '8px', pill: '999px' },
  duration: { fast: '120ms', normal: '200ms' },
})
  .derive(({ color }) => ({
    color: {
      surface: elevation(color.brand, 0.03), // explicit base + plane position
      ink: elevation(color.brand, 0.94),
      brandSoft: alpha(color.brand, 0.12),   // derivation — a graph edge
      brandHover: color.brand.lighten(0.06),
      onBrand: legibleOn(color.brand),       // guaranteed-legible pairing
    },
  }))
  .build()
```

**Contract details.**

- `t` is an ordinary typed export; token references are property accesses, never string paths. Hovering a token reads as facts — its mode and emitted variable name are literal types (`VaneColorToken<'live', 'vane-color-brand'>`), and plain value leaves carry their resolved literal (`VaneValueToken<'4px', …>`).
- **Derivations are explicit topological stages.** Each `.derive()` callback receives the exact graph accumulated by earlier stages: property completions are exhaustive, a typo errors at that property access, `noUncheckedIndexedAccess` adds no `undefined`, and a stage's own output becomes visible only to the next stage. Forward references and cycles are unrepresentable instead of runtime-detected.
- **Definitions are modules without a second abstraction.** Every `defineTokens()` builder is independently buildable and composable. `defineTokens().compose(colors).compose(metrics)` preserves each module's internal stage order, exact type graph, and rename identity; integration `.derive()` stages see the combined graph. Overlapping groups merge, while a repeated leaf fails at the `.compose(module)` argument and names its dot path. Composition is immutable, so a shared module can branch into multiple designs safely.
- `.build({ prefix, checks })` resolves and emits the finished graph once. `createSystem({ tokens: builder })` accepts an unfinished builder and finalizes it automatically, so the one-file app path pays no extra ceremony.
- TypeScript's native language service does not connect object-literal keys through an inferred mapped handle type for rename-symbol. `@mszr/vane-dux/typescript` supplies the missing graph-aware locations, scoped by graph origin and literal token path; Nuxt enables it automatically. Plain TypeScript projects opt in with one `compilerOptions.plugins` entry. Completions, diagnostics, hovers, and every non-rename operation remain TypeScript's own.
- Plain strings/numbers are valid leaves — the graph machinery is opt-in per token (principle 10).
- `scale.*` generators (`linear`, `modular`, …) are ordinary functions producing token subtrees; nothing about them is special-cased.
- The dedicated tokens file is the *library-authoring* form. An app that wants one design file passes the same graph to `createSystem({ tokens: { … } })` and receives `t` back bound ([dux-spec-css.md §1](./dux-spec-css.md#1-createsystem--bind-once-typed-everywhere)) — the split is available, never required.

**Implementation.** `defineTokens` stores an immutable ordered contribution list—seed modules and derivation stages—without emitting. `.compose()` concatenates definitions without executing them; `.build()` walks each seed, executes each stage against the current exact handle tree, then classifies liveness and registers one global-theme emission through the vanilla-extract substrate (`createGlobalThemeContract` + `createGlobalTheme` internally; never re-exported). Duplicate leaves fail both at the returned value or compose argument and as a runtime diagnostic if types were escaped. Each handle carries its literal path, `var(--…)` reference, mode, folded value where one exists, and metadata; handles serialize across the build/app boundary through `/runtime`'s `restoreToken`.

### Token modules

```TS
// design/palette.tokens.ts
export const palette = defineTokens({
  color: { brand: oklch(0.58, 0.2, 285).live() },
}).derive(({ color }) => ({
  color: { brandSoft: alpha(color.brand, 0.12) },
}))

// design/foundations.tokens.ts
export const foundations = defineTokens({
  space: scale.linear({ unit: 4, steps: { sm: 2, md: 4 } }),
  radius: { sm: '6px' },
})

// design/tokens.style.ts — integration + one emission
export const t = defineTokens()
  .compose(palette)
  .compose(foundations)
  .derive(({ color, space }) => ({
    control: { quiet: { color: color.brandSoft.var, gap: space.sm.var } },
  }))
  .build()
```

`palette.build()` remains valid on its own. Composing it does not mutate it or eagerly emit CSS; the final graph owns one prefix, one check pass, one manifest projection, and one deterministic emission order.

---

## 2. Liveness compilation

**Why.** hail-styl's most valuable idea — a color's lightness as a *formula* over semantic elevation, alive in the browser — died in every TS token system because tokens were static value maps. Liveness generalizes it: derivations survive to runtime **as CSS**, so one variable write re-derives the world with zero JS recomputation.

**Usage → emitted.**

```TS
const t = defineTokens({ color: { brand: oklch(0.58, 0.2, 285).live() } })
  .derive(({ color }) => ({
    color: {
      brandSoft: alpha(color.brand, 0.12),
      brandHover: color.brand.lighten(0.06),
    },
  }))
  .build()
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
- **The color-handle surface is finite and documented.** Color handles carry: `alpha`, `lighten`, `darken`, `saturate`, `desaturate`, `rotate` (hue), and `mix(other, amount)`; each exists both as a method (`color.brand.lighten(0.06)`) and a standalone helper (`alpha(color.brand, 0.12)`). `oklch.from(base, channels)` is the general relative-color form; typed `channel.set/add/subtract/multiply/divide` operations fold over static inputs and serialize to relative OKLCH over live inputs. Constructors cover OKLCH, OKLab, LCH, Lab, HSL, sRGB, and Display-P3; `color(css)` remains the universal CSS-color escape.
- Build-time color math and emitted CSS color math must agree to the rounding digit, or static and live ramps diverge subtly. This is a locked test fixture, not a hope.
- A derivation the compiler cannot express as CSS is a build diagnostic at the derivation. The closed helper set makes this structurally absent today — every helper serializes — and it stays the law for any future addition. String-template derivations need no special case: an embedded token interpolates as its `var()` reference, which is live by construction.

**Implementation.** Color helpers (`oklch`, `alpha`, `lighten`, `mix`, …) build a tiny expression tree rather than computing eagerly. The compiler either evaluates the tree (culori for parsing/conversion, the operations themselves defined *as* their CSS formulas) or serializes it to CSS, choosing per liveness; anonymous static subtrees inside a live expression fold, graph edges stay `var()` references, so the emitted CSS is as boring as it can be.

---

## 3. Schemes

**Why.** "Add dark mode" must touch token definitions only (gauntlet moment 2). A scheme is a value pair inside one token — never a parallel palette — and switching is native: `color-scheme` + `light-dark()`, no JS, no flash-prone class swap for the preference-following default.

**Usage.**

```TS
canvas: scheme({ light: oklch(0.99, 0.005, 285), dark: oklch(0.14, 0.006, 285) }),
surface: ({ color }) => elevation(color.brand, 0.03), // preset composition; explicit graph edge
```

```css
:root { color-scheme: light dark; }
:root { --vane-color-canvas: light-dark(oklch(0.99 0.005 285), oklch(0.14 0.006 285)); }
```

**Contract details.**

- Scheme-dependent tokens compile live by definition (§2 applies downstream). They are not runtime *inputs*: both values are build-known, so `legibleOn` over them stays a checked guarantee, and `applyTheme` rejects them — chain `.live()` (`scheme({ … }).live()`) to make one user-themeable.
- Forcing a scheme (user toggle) is standard CSS: the system emits `[data-scheme='light']`/`[data-scheme='dark']` scopes that pin `color-scheme`; `/runtime` ships a two-line `setScheme(el, scheme)` and the Nuxt module documents the SSR cookie dance ([dux-spec-vue.md §5](./dux-spec-vue.md#5-ssr-and-hmr)) — no zero-runtime system escapes it, so we ship the recipe instead of pretending.
- Custom scheme axes beyond light/dark (high-contrast brand modes) are themes ([§7](#7-themes-theme-and-applytheme)), not schemes — the scheme axis is the one the platform natively pairs.

---

## 4. Elevation

**Why.** The single strongest idea in hail-styl: express surfaces, borders, and inks as *positions between the background and foreground planes* (0–1), and derive per-scheme lightness from position. Light/dark falls out automatically; a new elevation token is one number, not two colors.

**Usage.**

```TS
surface: ({ color }) => elevation(color.brand, 0.03),
surfaceRaised: ({ color }) => elevation(color.brand, 0.08),
border: ({ color }) => elevation(color.brand, 0.20),
inkMuted: ({ color }) => elevation(color.brand, 0.62),
ink: ({ color }) => elevation(color.brand, 0.94),
```

**Contract details.**

- `elevation(base, n)` maps `n` to lightness per scheme (rising = lighter in dark, darker in light), then tints that neutral plane from the explicit `base`. A live base keeps the result live.
- Elevation is a **preset composition, not a core axiom**: its implementation uses the public `scheme()` and `mix()` helpers. The core has no hidden hue, chroma, or elevation controls; replacing the helper costs nothing (principle 10).
- The curve (how positions map to lightness) is a system option with a perceptually-tuned default.

---

## 5. Contrast and checks

**Why.** Accessibility pairings are usually an audit nobody re-runs. The graph knows both endpoints of every pairing — including both scheme values — so legibility becomes a build diagnostic with a fix-it (principle 7). The derivation is named for what it *produces* — a color legible on its target — not for the check it happens to carry; `onBrand: legibleOn(…brand)` reads as the relationship it is.

**Usage.**

```TS
onBrand: ({ color }) => legibleOn(color.brand),
```

```text
✖ VANE_TOKENS_CONTRAST  color.onBrand / color.brand fails APCA Lc 60 in scheme "dark"
    target (dark) → oklch(0.68 0.2 285); best pairing white = Lc 47.2
    at design/tokens.style.ts
  fix: adjust the target color, or accept explicitly: legibleOn(…, { minLc: 47 })
```

**Contract details.**

- `legibleOn(target)` yields the legible pairing for a target color, checked at build against both schemes (APCA by default; WCAG2 selectable per system, once one exists). It takes the color itself, so inside a derivation it reads like every other graph reference — one way to reference the graph, everywhere.
- Over a **live** target the guarantee cannot be total: the emitted value uses `contrast-color()` where supported plus a computed fallback, and the handle types as `VaneContrastToken<'live'>`, never `'checked'` — honest limits, stated in types ([dux-patterns.md §3](./dux-patterns.md#3-liveness)). Scheme and elevation targets stay checked — both values are build-known.
- Standalone assertions cover pairings the graph doesn't own, as a thunk over the same refs derivations receive: `checks: ({ color }) => [check.textContrast(color.ink, color.canvas).aa()]` in `defineTokens` options.
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

// runtime — live tokens only, from /runtime; `t` is inert data, importable anywhere
applyTheme(document.documentElement, t, { color: { brand: userPicked } })
```

Both standalone forms take the graph — that is what types the overrides (`applyTheme` rejecting a static key needs to know which keys are live) and what carries custom prefixes to the runtime. Once a system exists, `createSystem` binds the tokens and the bound forms drop the argument: `theme({ color: { brand } })` ([dux-spec-css.md §1](./dux-spec-css.md#1-createsystem--bind-once-typed-everywhere)).

**Contract details.**

- `theme()` accepts overrides for any token and emits a class scoping the re-declared variables; derivations downstream re-derive automatically (live ones via CSS; static ones re-folded at build within the theme scope, legibility re-checked — a `legibleOn` pick may flip). An override changes a token's *value*, never its liveness.
- `applyTheme()` accepts **live tokens only** — the graph's declared runtime inputs. A static, scheme, or derived key is a type error at that key ([dux-patterns.md §3](./dux-patterns.md#3-liveness)): writing a derived variable would half-clobber its derivation, so the honest API is to theme the input and let the cascade re-derive every downstream surface, hover, and pairing — gauntlet moment 3.
- Themes nest by DOM scoping, exactly like the custom properties they are.

---

## 8. Metadata

**Why.** Tokens are read by hovers, docs, audits, and agents; the definition site is where intent lives.

**Usage.**

```TS
brand: oklch(0.58, 0.2, 285).live().describe('Primary brand hue. Marketing owns this.'),
legacyBlue: oklch(0.6, 0.15, 250).deprecated('use color.brand'),
```

**Contract details.** `describe` and `deprecated` ride the handle (`t.color.brand.description`) — readable by tools today, projected into the manifest when it ships ([dux-spec-introspection.md §2](./dux-spec-introspection.md#2-the-manifest)). Editor strikethrough for `deprecated` waits on the manifest-driven tooling: TypeScript's `@deprecated` machinery attaches to declarations, and mapped-type properties cannot carry it — a limit we state rather than paper over.

---

## 9. Emitted names

**Why.** The emitted variables are a public, consumer-facing API (themes, devtools, third-party CSS reading our tokens); their names must be predictable and collision-safe.

**Contract details.**

- Path-derived kebab names under the system prefix: `t.color.brandSoft` → `--vane-color-brand-soft`; prefix configurable (`defineTokens(graph, { prefix: 'prism' })` — later `createSystem({ prefix: 'prism' })` — → `--prism-*`), and literal in the types: the emitted name is readable in the hover.
- Names are stable across builds (no content hashing for tokens — they are the *intended* public surface, unlike style classes).
- The full name map ships in the manifest ([dux-spec-introspection.md §2](./dux-spec-introspection.md#2-the-manifest)).
