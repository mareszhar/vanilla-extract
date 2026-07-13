# vane-dux — ideation notes

Running record of API/pattern ideas for vane-dux.

**Purpose:** not a spec, not a commitment. A record of proposals and the reasoning behind them, so each can be verified, refuted, or extended on its merits. Reasoning trails are kept only where they rule out an otherwise-reasonable design or justify a non-obvious choice — not for their own sake.

**Markers:**

| | |
|---|---|
| 🟢 | settled — decided, low risk |
| 🔵 | proposed — a new idea, not yet stress-tested |
| 🟡 | needs refinement — a real open question still live |
| 🔴 | big lift — multi-part, likely its own design pass |

---

## TL;DR

| § | Topic | Status |
|---|---|---|
| **A. Orientation** | | |
| 1 | CSS/W3C alignment as a core principle | 🔵 |
| 2 | The mental model — two setup stages (`createEngine` → `createSystem`), then usage | 🔵 framing |
| 3 | Modularity & typing locality — one engine, one system, many token modules | 🟡 module navigability open |
| 4 | Terminology to revise (`theme`/`applyTheme`, `kind:'parse'`); error-code prefixes | 🟢 |
| **B. The value language & emission** | | |
| 5 | Data-type branding utils (`angle()`, `length()`, `percentage()`, …) | 🔵 |
| 6 | Token metadata config — `{ val, is: [...] }` | 🟢 `is` key + `'var'` label settled |
| 7 | `createEngine()` — configurable engine, chain links for extensions | 🔴 |
| 8 | `bem` + `elevation` built *on* the engine's extension points | 🔵 |
| 9 | Full-power color composition (token refs, channel ops, `.in()`) | 🔴 |
| 10 | Scales — step-indexed accessor + `fluid()` | 🔵 |
| 11 | Axes — flat, multi-axis, `$expose`/`$require`/`$derive`, `token.axes` | 🔴 |
| 12 | Emission control — scope & order (layers everywhere, custom token scope) | 🔵 |
| 13 | Platform levers — `@property`, `:where()`, `@scope`, view transitions | 🔵 |
| 14 | Null tokens (`val: null`) + the integration surface | 🔵 |
| **C. Runtime / consumption** | | |
| 15 | `updateTokenCCPVal(s)` / `setCCPVal` + factory typing | 🟢 both method & function forms |
| 16 | Runtime stylesheet ownership | 🔴 |
| 17 | Port schema validation | 🔵 |
| **D. Authoring ergonomics** | | |
| 18 | CCP relationship modeling (`--base` pattern) | 🟢 covered by existing primitives |
| 19 | `rawVar` escape hatch | 🔵 |
| 20 | Property shorthands (`pb` → `paddingBlock`) | 🟡 |
| 21 | `fromGroup()` recipe sugar | 🔵 |
| 22 | `propsOf` object-namespacing | 🟢 |
| 23 | Mixins — `definePatterns` + expand the set | 🔵 |
| 24 | Documented custom-util authoring recipe | 🔵 |
| **E. Integration** | | |
| 25 | W3C Design Tokens two-way sync | 🔵 |
| **F. Confirmed behaviors worth documenting** | | |
| 26 | `&` in selector keys | 🟢 |
| 27 | Dev-only port type check | 🟢 |
| **G. Workspace requests** | | |
| 28 | Pug templates in all demos | 🟢 |

---

## A. Orientation

### 1. 🔵 CSS/W3C alignment as a core principle

vane-dux should stay as close as possible to the CSS Specification (W3C) and to the component-architecture conventions the ecosystem already uses. That's how it stays alive as the web evolves, rather than accumulating a parallel vocabulary for things the platform already names. Where CSS has a precise word, use it; where CSS has no concept, coining a term is fine — there's nothing to misalign with.

Concretely: CSS defines a closed set of [data types](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/Data_types) — `<color>`, `<length>`, `<percentage>`, `<angle>`, `<number>`, etc. vane-dux should treat *branding a value as one of these* as a first-class, explicit need (§5), not something implicit in which builder happened to be called.

**Corollary — a util that borrows a CSS function's name owes at least that function's power.** `oklch`, `calc`, `clamp`, `min`, `max`, and every other CSS-counterpart util must be able to express anything its native counterpart can (and more, since ours also accept tokens) — just more ergonomically in TS. Never *less*. Falling short of the platform primitive turns the wrapper from an upgrade into a downgrade. `calc`/`clamp`/`min`/`max` already meet this (they nest and stay dimension-safe); color is the surface that doesn't yet (§9).

This principle drives §4 (rename non-CSS terms), §9 (`oklch()` should do everything native `oklch()` can), §17 (validation via the existing Standard Schema standard, not a bespoke one), and §25 (interoperate through the W3C token format). Worth adding to `dux-vision.md` as a named principle.

### 2. 🔵 The mental model — two setup stages, then usage

Naming the stages makes the "tune your own design system" story legible instead of scattered. There are **two setup calls**, not three — `defineTokens` is not its own stage, it's just a value passed to `createSystem`'s `tokens` key (same as `conditions`, `prefix`, etc.):

```TS
// STAGE 1 — get an engine: the configurable rules every value-defining util follows
const { color, oklch, length, angle } = createEngine({ /* §7 */ })

// STAGE 2 — define a system WITH that engine, and get system-aware utils back in one call
export const { t, css, recipe, port, updateTokenCCPVals } = createSystem({
  tokens: defineTokens({ color: { brand: oklch(0.58, 0.2, 285) } }).compose(/* … */),
  conditions: { /* … */ },
})

// STAGE 3 — use the system-aware utils to style things (css, recipe, t, …)
```

`createSystem` **already returns `t`** (confirmed, `createSystem.ts:186`), so defining tokens inline and getting `t` back from the same call is the intended shape — `defineTokens` looking like a separate stage is only an artifact of examples that extract `t` first, which shouldn't be necessary. Config has two obvious homes: **language-level** (ranges, colorspaces, units, what a bare number means) → `createEngine`; **system-level** (tokens, conditions, prefix, shorthand style, validation defaults) → `createSystem`.

**Flag — double `prefix`.** Both `defineTokens().build({ prefix })` and `createSystem({ prefix })` accept a prefix, and which wins depends on whether the tokens were pre-built (`createSystem.ts:126` uses its own prefix only when the graph isn't already built). Two places to set one thing, with order-dependent precedence — worth collapsing to one clear owner (the system) rather than leaving a silent-conflict surface.

### 3. 🟡 Modularity & typing locality

**The blessed shape: one engine, one system, many token modules.** Twin full systems (two `createEngine`+`createSystem` pairs) are always *possible* but answer a different need — genuinely independent design systems. For TS performance at scale, composition is the answer, because what actually grows in a big system is tokens, nothing else:

```TS
// palette.tokens.ts, spacing.tokens.ts — modules from ONE engine's defineTokens
export const palette = defineTokens({ … }).derive(…)

// ds.ts — composed once
export const ds = createSystem({ tokens: defineTokens().compose(palette).compose(spacing) })
```

**Verified invariant — typing locality.** `VaneSystem`'s members are typed `VaneCssFunction<C, L>`, `VaneRecipeFactory<C, L>`, `VaneAnatomyFactory<C, L>`, `VaneAtomsFactory<C, L>` (`createSystem.ts:94`) — conditions and layers only, **never the token graph type**; token values enter rules structurally. So `css`/`recipe`/`anatomy`/`keyframes`/`globalCss`/`port` IntelliSense cost is independent of graph size, however huge `t` gets. Only `t` itself and the whole-tree utils (`theme` overrides, the batch tree form of `updateTokenCCPVals`) type against `T` — and mapped types are lazy, so that cost lands at their own call sites, with composition cost concentrated in the one file that composes. **Worth stating as a design rule** so future utils keep it: *a util types against what it consumes.*

**Real gap found — token modules aren't navigable.** `defineTokens({…})` returns a *builder* (`compose`/`derive`/`build`) — `palette.color.brand` doesn't exist pre-build, so the "use the small module for fast local IntelliSense" story doesn't actually work today; everything routes through the composed `ds.t`. Mitigations to weigh: value-level slices (`export const tColor = ds.t.color` — lazy typing keeps a slice cheap), or exposing module-local typed handles (the `.derive()` stage machinery already constructs typed handle views internally; the open question is names, which don't finalize until build assigns the prefix). Open.

**Measure, don't vibe.** Add TS-performance benchmarks to the dx test plane (a generated large-graph fixture, completion-latency budgets) so "fast at scale" is a regression-tested claim, not folklore.

### 4. 🟢 Terminology to revise

Aligning owned vocabulary with CSS/web standards. Most existing terms are fine because CSS has no competing word (`port`, `recipe`, `variants`, `anatomy`, `elevation`) or are already aligned (`scheme` ↔ `prefers-color-scheme`, `layer` ↔ `@layer`). Two genuine offenders:

- **`theme` / `applyTheme`** → revise. CSS's actual vocabulary for this mechanism is custom property / declaration / value; "theme" is a product-level word for the outcome, not the mechanism. Gets worse once liveness generalizes past color (a live radius "applied" via something named *theme* reads wrong). The §15 `updateTokenCCPVal` naming is the intended replacement — revisit both together.
- **`kind: 'parse'`** (internal) → rename to `'literal'` or `'raw'`. It means "authored as a raw CSS string, not built by a structured constructor" — the current name doesn't say that.

**Error-code prefixes — confirmed compliant, recorded as convention.** Diagnostic codes are `VANE_*` (`VANE_TOKENS_CYCLE`, `VANE_CSS_INVALID_VALUE`, …) and shipped types are `Vane*` — package-qualified, per the family naming law (h3-dux uses `H3Dux*` for the same reason: a bare `Dux*`/`DUXERR_*` name is ambiguous the moment two dux forks share a project). Stays that way; never bare `DUX*`.

---

## B. The value language & emission

### 5. 🔵 Data-type branding utils

**Gap:** a value's CSS data type is currently inferred only from which builder was called (`oklch()` ⇒ `<color>`), with no equivalent for `<angle>`, `<length>`, `<percentage>`, etc. A bare `45` is just `number`.

```TS
hue: 45           // generic number
hue: angle(45)    // branded <angle> — unlocks angle methods, accepted where an angle is expected
```

These branding utils are the natural home for engine config (§7): a branded `percentage` can be told to accept factor-style vs. percent-style input, a branded `angle` needs no range (CSS `<angle>` has none — `hsl(400 …)` wraps mod 360, valid CSS), a branded `length` decides what a bare number means (§7, `unitless`).

### 6. 🟢 Token metadata config — `{ val, is: [...] }`

How to attach metadata (liveness, description, validation) to a token. The object-syntax landing point came from ruling out two more obvious designs — worth preserving, because the ruled-out ones look reasonable at first:

**Ruled out — method syntax (`oklch(...).live()`):** breaks on tokens defined without a branding util (`12.live()` can't extend `Number.prototype`), and — more decisively — `oklch()` must behave *identically* inside `defineTokens()` and inside `css()` styling. A config method on `oklch()`'s return type is a no-op in the `css()` context, or forces two separate `oklch` functions. Either way it violates "one thing works everywhere," which `calc`/`min`/`max`/`clamp` already honor.

**Landing point — config lives in a sibling wrapper, never on the value:**

```TS
brand: oklch(...)                          // un-configured stays this simple
brand: { val: oklch(...), is: 'var' }      // config when needed
```

- `oklch()` and every data-type util stay method-free — identical in both contexts.
- `is` takes a string or array, so future flags append (`is: ['var', 'checked']`) with no new top-level keys.
- No `dataType` key — always derived from whatever produced `val`.
- Key is **`val`**, matching the `.val` accessor every handle gets (below). `.value` was avoided — it collides with Vue's `ref.value`.

**Consumption-side accessors — `.val` / `.var`, a property pair on every resolved handle:**

```TS
color.brand.val   // the resolved/frozen value
color.brand.var   // the var() reference (already exists today)
color.brand       // whichever the token's `is` config implies by default
```

Used at composition time (§9), not a pair of free functions. Tokens with axes (§11) extend the family: `.axes` is the per-axis record (`accent.axes.scheme.dark`), `.val` is typed `undefined` there — generic code handles both with `token.axes ?? token.val`.

**Settled — the label is `'var'`.** It's semantically exact (this token won't fold; anything referencing it emits a ccp-`var()`) and adds no new term to learn, unlike `'overridable'`/`'live'`/`'mayChange'`. **The key is `is`** (accepting a string or array): it reads as natural language (`is: ['var', 'checked']` = "this token is var, is checked"), and avoids the `var: true` ceremony a boolean-key shape would impose. No better candidate found — both the `is` key and the `'var'` value are decided; the object-syntax shape was already settled.

### 7. 🔴 `createEngine()` — configurable value engine

Stage 1 of §2. Returns branded, pre-configured value-defining utils.

**Motivation (this is the point, not "replicate hail-styl"):** because vane-dux lives in TS, anyone *can* hand-write a wrapper around `oklch` that forbids hues over some value, or an `alpha` that works in sRGB instead of oklch. But that's ceremony, repeated in every project. `createEngine` gives the *common* design-system tweaks a happy path — ranges, normalization, scales, colorspace defaults, unit meaning — so users rarely need to write their own engine utils. It also lets vane-dux ship *un-opinionated* defaults with per-call escape valves, instead of the too-opinionated model where (e.g.) `alpha()` only ever computed in oklch. Full CSS power (see §9), configurable defaults, per-call overrides (`alpha(token, 0.3).in('srgb')`) — no wrapper needed for the vast majority of cases.

```TS
const { color, oklch, alpha, length, percentage } = createEngine({
  color: {
    space: 'oklch',                                  // default working space for space-agnostic ops (§9 `.in()` overrides per call)
    oklch: {
      l: { min: 0.04, max: 0.96, normalize: true },
      c: { min: 0, max: 0.3 },
    },
    allowedInputs: 'tokens',                         // 'explicit' | 'tokens' | 'raw' — how permissive channel/amount args are
  },
  length: { unitless: 'px' },                        // what a bare number means where a <length> is expected
})
```

Config axes gathered so far:

- **`space`** — default working colorspace for space-agnostic ops (`alpha`, `mix`, `lighten`), overridable per-call via `.in()` (§9). `oklch()` itself is space-specific by name and ignores this.
- **Per-channel `min`/`max`** — the range a channel accepts.
- **`normalize`** — a real, explicit flag, *not* auto-derived from range presence. A 0–180 hue range where you still reason in raw degrees (0 = red, 125 = green) is a genuine case where normalizing to 0–1 hurts readability. Default `true` when a range exists; set `false` when the absolute value matters more than its position.
- **`allowedInputs`** — whether channel/amount arguments accept only explicit literals, also tokens, or also raw external `var()` refs (§19). Lets a strict system forbid raw refs it can't reason about.
- **`length.unitless`** — `'px'` (default) | `'raw'` | `'rem'`: what a bare number means in a length context. Today a bare number is passed straight through (`serializeStyleValue` returns it as-is) and downstream behavior decides — which is implicit and undocumented. Make it explicit and configurable.

**String emission rule (worth speccing, since there's no stated convention today):** strings emit verbatim/unquoted — `small: '16'` → `--vane-small: 16`. To force a quoted CSS string literal, include inner quotes — `content: '"hi"'` → `content: "hi"`. State this so it's predictable rather than discovered.

**`createEngine` also returns the axis-aware `defineTokens`** (§11) and the branding utils (§5), alongside `color`/`oklch`/`length`/etc. — everything whose behavior the engine configures. The simple path stays simple: a default engine backs the bare importable versions, so a project that never calls `createEngine` still gets working `oklch`/`defineTokens` with default rules (same pattern as the importable-defaults-plus-configured-versions split throughout).

**Extensibility — chain links, because extensions must see the engine being built.** A single options object can't let one custom util reference another defined beside it (object values evaluate eagerly), can't hand `$derive` callbacks the *configured* utils, and can't type sibling references. The chain form fixes all three with the mental model the family already uses — `defineTokens().derive()`, idb-dux's perms chains: **the staged builder is the dux composition primitive.** Seed = static config; links = anything that references the accumulated engine:

```TS
export const de = createEngine({ color: { … }, length: { unitless: 'px' } })   // seed: static config only
  .utils(({ oklch, alpha }) => ({ okech: …, tint: … }))    // custom utils, built on the CONFIGURED built-ins
  .utils(({ tint }) => ({ softTint: … }))                  // later links see earlier custom utils
  .channels(({ oklch }) => ({ e: … }))                     // the elevation channel, using engine math
  .units(() => ({ bem: … }))
  .axes(({ darken }) => ({ … }))                           // §11 — $derive closes over the chain's utils
```

The payoff stands: `bem` and `elevation` ship as the first consumers of the same links every user gets (§8) — "configure the engine" (§7), the shipped conveniences (§8), and "author custom utils" (§24) collapse into one story. Nothing is a hardcoded exception.

### 8. 🔵 `bem` + `elevation` — built *on* the engine's extension points

Two hail-styl concepts general enough to ship as defaults — and, per §7's extensibility, implemented *through* the public `channels`/`units` registration rather than as hardcoded internals. They're demonstrations that the base layer is powerful enough that even vane-dux's own conveniences ride on the same API users get. Users can still define their own scales/units/ranges/channels instead.

**`elevation`** — the semantic-elevation channel: a neutral surface tinted toward a base color at a position `0..1`, scheme-aware (light scheme darkens with position, dark scheme inverts). Already exists as `elevation()` in `preset/tokens.ts`; promote it from a bespoke preset helper into a first-class engine channel where `e` substitutes for `l`:

```TS
okech(0.03, 0.02, 264)   // positional constructor, parallel to oklch(l, c, h) — 'e' replaces 'l', never has 'l'
```

**Naming — `okech` vs `okelch`, settled by dsColor's actual shape** (`setup-color.styl:37`). dsColor is a *from-base* builder whose lightness slot accepts **either** `e` (elevation) **or** `l`, each in explicit / normalized / relative modes. So:

- **`okech(e, c, h)`** — the simple positional constructor, elevation-only (the name literally omits `l`). Parallel to `oklch(l, c, h)`. This is what the example above needs.
- **`okelch`** (the name carries both `e` and `l`) — the dsColor-equivalent: a from-base builder where you pick `e` *or* `l` per call, with the explicit/normalized/relative channel modes of §9. In practice this is §9's extended `oklch.from(base, {...})` plus elevation support, so `okelch.from(base, { e: 0.03 })` may be the cleaner spelling than a separate top-level constructor. Exact surface tracks §9; the naming distinction (`okech` = elevation-only, `okelch`/`.from` = elevation-or-lightness) is the settled part.

**`bem`** ("base-scale em") — a unit that's rem-derived (so it respects the user's browser font-size accessibility setting) *and* expressed in the design's base scale. hail-styl needed it because raw `rem` respects a11y but sits outside the scale, while raw scaled-px sits in the scale but ignores a11y — `bem` gets both. Worth `createEngine({ units: { bem: … } })` as the general mechanism (declarable derived units), with `bem` and `elevation` as the two shipped examples.

### 9. 🔴 Full-power color composition

**Gap:** `oklch()` and the color ops accept literal numbers only. Native CSS `oklch()` accepts `var()` in any channel (`oklch(var(--l) var(--c) var(--h))` is legal CSS today), and relative-color syntax derives a new color from a base with per-channel overrides. Per §1, the TS wrapper shouldn't do *less* than the platform primitive it wraps. This is the concrete driver behind `hail-styl`'s `dsColor` — itself just a configurable wrapper over `oklch` with explicit / relative / normalized channel modes.

What full parity needs:

```TS
oklch(0.58, 0.2, 285)                          // explicit literals — today

oklch(lightness.val, chroma.val, hue.var)       // token refs per channel — mix frozen + live (NOT possible today)

oklch.from(brand, { l: 0.9 })                    // relative-from-base, override a subset — oklch.from EXISTS today
oklch.from(brand, { c: channel.multiply(0.5) })  // channel ops (add/subtract/multiply/divide) — EXIST today
oklch.from(brand, { l: norm(0.5) })              // normalized-within-configured-range — NEW, ties to §7 ranges
```

So the gap is narrower than "build it all": per-channel token refs in the base constructor, and a `norm()` mode that reads the engine's configured range. `oklch.from` + channel ops already cover the relative case. The same "accept a token where a literal is expected" gap likely spans other value utilities too, but `calc`/`clamp`/`min`/`max` already nest well, so color is the lagging surface.

**`.in()` colorspace override** — per-call, reusing CSS's own `color-mix(in <space>, …)` vocabulary rather than coining `.colorSpace()`:

```TS
alpha(brand, 0.2)              // engine default space
alpha(brand, 0.2).in('srgb')   // this call overrides — chains like calc().multiply()
```

**One honest platform ceiling:** most ops fold at build time and degrade to a live CSS form (`color-mix()`, relative color) when an input is live — so a single function adapts automatically. The exception is `legibleOn()`/contrast: real APCA contrast has no mature native CSS primitive (`contrast-color()` is experimental), so over a *live* target it degrades to `contrast-color()` + a computed fallback rather than a fully-live guarantee. A capability ceiling, not a design gap — worth documenting so it isn't mistaken for one.

### 10. 🔵 Scales — step-indexed accessor + `fluid()`

`scale.linear` and `scale.modular` already exist (`{ unit: 4, steps: {...} }` → px; `{ ratio: 1.25, ... }` → modular), but both bake a fixed steps object. Two additions:

**Step-indexed accessor** — so `size(2)` means "step 2 on the configured scale" everywhere, keeping the curve in one place instead of each token pre-computing off a frozen steps object. This is what hail-styl's `dsSize(step, base?)` did.

**`fluid()`** — Utopia-style `clamp()` between viewport bounds. `clamp()` already exists; this is a thin, high-value wrapper:

```TS
fluid({ min: 16, max: 24, minVw: 320, maxVw: 1280 })   // → clamp(...) that scales type/space with the viewport
```

### 11. 🔴 Axes — a token's values across the environment

**Terminology, fixed first.** An **axis** is a named dimension of the styling environment (`scheme`, `density`, `brand`); a **mode** is one value of an axis (`dark`, `compact`). An earlier draft named the engine key `modes:` while its entries were axes — corrected throughout: the engine key is `axes:`, the token-level key is `axes`, "mode" always means one axis value. And the deeper unification: **a condition is a named scope; a mode is a condition that belongs to an axis.** Same species — the axis contributes the mutual-exclusivity guarantee (exactly one mode active per axis) that makes per-mode token *values* coherent. "Scope" is the owned umbrella term for where-declarations-apply (selector arms and conditional at-rules alike — CSS has no single official umbrella word, and the platform's new `@scope` at-rule makes this the aligned choice, §13).

**Gap.** The only multi-value token switch today is `scheme({ light, dark })` (`color.ts:252`) — color-only, two hardcoded values, welded to `light-dark()`. One special case of an unabstracted pattern. The name "modes" aligns with Figma's variable modes (→ §25 interop).

**Axes are flat, declared on the engine chain** (§7) — so `$derive` callbacks close over the *configured* utils via the link's parameter, and sibling-mode typing comes from the axis object itself:

```TS
export const de = createEngine({ color: { … } })
  .axes(({ darken }) => ({
    scheme:  { light: '$defaultScope', dark: schemeIs('dark'), $require: ['color'],
               $derive: { dark: ({ light }) => darken(light, 0.4) } },
    density: ['compact', 'cozy'],            // shorthand → [data-density=compact] / [data-density=cozy]
    brand:   { acme: data('brand', 'acme'), globex: data('brand', 'globex'), $expose: ['color', 'marketing.expA'] },
  }))
```

- **`$expose: [paths]`** narrows which groups/subgroups see an axis (exposure to a group includes its subgroups); absent = everywhere. **`$require` implies `$expose`** — alone it narrows *and* enforces; combine with a wider `$expose` when some groups get the axis optionally. `true` = required everywhere exposed.
- **Triggers are `VaneConditionInput`** — the type conditions already use (selector strings, at-rule strings, `media()`/`data()`/`schemeIs()`); multi-arm helpers give multi-selector emission for free. `'$defaultScope'` = emit at the token's own scope.
- **`$derive`** is declared at engine time, invoked at token-resolve time — no chicken-and-egg, no intermediate factory. With `$require` + `$derive` together, plain `brand: hsl(…)` in an exposed group *is* the light value and dark derives automatically — **one-line dark mode** (gauntlet moment 2, amplified). Explicit values override the derivation.

**Multi-axis tokens — the one-axis rule is dropped.** A token may vary along several axes when they jointly affect the same design decision — `card.shadow`: scheme picks the shadow's color treatment, density its geometry; resolving each independently can be simply wrong (likewise `focus-ring` × contrast, `control.minHeight` × platform). Replacement rules:

- **Per-axis maps stay independent and sparse** — never an auto-generated cartesian matrix. Each mode's declaration emits under its own scope.
- **Sparse combo overrides** cover the cases where single-axis adjustments don't compose — an explicit intersection entry, emitted *after* all single-axis declarations (API shape open).
- **Resolution is ordered, not accidental:** default → single-axis → combo, guaranteed by emission order (§12). The earlier draft rejected multi-axis because two selectors setting one var "silently compete" — that wasn't an argument against multi-axis; it was the missing order-control gap (§12) wearing a costume.
- Guidance stays: most tokens are axis-free; primitives mostly single-axis; multi-axis belongs to semantic/component tokens where axes genuinely intersect. Independent properties are separate tokens (`button.background` ← scheme, `button.padding` ← density), never one multi-axis blob.

**Authoring — the `axes` key; `val` stays strictly single-value.** Definition and reading are two ends of one tunnel, so they use the same word at both ends:

```TS
brand:  { val: color('red'), is: 'var' },                       // plain token — val is always ONE value
accent: { axes: { scheme: { light: color('red'), dark: color('darkred') } } },
shadow: { axes: {                                                // multi-axis: per-axis, sparse, independent
  scheme:  { light: '0 1px 2px rgb(0 0 0 / .2)', dark: '0 1px 2px rgb(0 0 0 / .6)' },
  density: { compact: '0 1px 2px', cozy: '0 4px 12px' },
} },
```

- `axes` replaces the earlier `val`-as-object form, and the `.vals` record is dropped with it — under multi-axis a bare mode key (`.vals.dark`) is ambiguous; `token.axes.scheme.dark` never is.
- **Reserved keys:** `val` and `axes` cannot be group or token names — they're the disambiguation anchor (an object is token config iff it has `val` or `axes`; other metadata keys stay unreserved).
- **Totality per used axis is type-enforced** (`Record<AxisModes, V>`); `$derive` satisfies it implicitly. Intellisense: `const` type parameters preserve literals (no `as const`), `$expose` dot-paths match the current definition path via template-literal types (idb-dux dot-path precedent); TS-server perf at scale is a benchmark item (§3), not a design blocker.
- Axed ⇒ `is: 'var'` automatically (varying by ambient state can never fold); explicit `is: 'var'` allowed, redundant. A token's axes map is **atomic** — reopening it in a later `.derive()` stage is an error; deriving one mode from another uses a plain `const` (TS is vane's `.stage()`).

**Reading — `token.axes`, the same word as the definition:**

```TS
t.color.shadow.axes.scheme.dark     // keys autocomplete per axis
t.color.accent.val                  // typed undefined on axed tokens — an error to use where a value is expected
const log = token => console.log(token.axes ?? token.val)   // generic code: no crash, no sentinel
```

Runtime returns `undefined`, never a `'$hasModes'`-style sentinel (a sentinel string can leak into CSS/logs as a plausible value; `undefined` can't), and `token.axes` doubles as the runtime discriminant. Naming flag stays: internal `VaneTokenMode` (`'static' | 'scheme' | 'live' | 'derived'`) collides with this vocabulary — rename when axes land.

**Group-level `$axes` — the transposed bulk form.** Replaces the earlier standalone `modes()` helper: a `$`-key *inside the group* keeps contextual typing airtight (a loose function can't know which group it's called under; an in-tree key can) — which also dissolves the helper-naming question. Transposed inner shape matches how palettes are actually authored (whole light set, then whole dark set — a Figma variables table):

```TS
color: {
  $axes: { scheme: {
    light: { a: hsl(…), b: hsl(…), c: hsl(…) },
    dark:  { a: hsl(…), b: hsl(…), c: hsl(…) },    // key sets must match — totality stays type-enforced
  } },
  a: { description: 'canvas tint' },       // per-token metadata merges by key — unambiguous here,
}                                           // because $axes already established `a` is a token
```

**Emission — no default value; a mode is a per-value emission scope.** Every mode value emits under its trigger's scope; `'$defaultScope'` opts one into the token's own scope (`:root` by default — configurable, §12). If no mode maps to `$defaultScope`, the token has no base declaration — correct and deliberate (§14 is the fully-unemitted cousin). The built-in scheme axis may still emit native `light-dark()` as an optimization; authors never see the mechanism difference.

**Axis modes are conditions.** Since a mode *is* a condition-in-an-axis, every axis auto-exposes its modes to `css()` as axis-prefixed camel keys (`schemeDark:`, `densityCompact:`) — prefixed so nothing collides with loose conditions; one trigger declaration powers both token values and rule styling, so the `dark` base condition and the scheme axis can never drift.

**Group `$`-metadata (micro-proposal).** `$axes` opens the pattern: groups can carry their own `$` config — `$description` for docs/manifest prose, potentially group-local enforcement — cheap, and documentation generation gets group-level context for free.

**Runtime.** `setMode(el, 'density', 'compact')` generalizes `setScheme` (kept as the built-in axis's alias), writing the matching `data-*` for shorthand triggers.

**Open:** sparse-combo API shape; axis emission order beyond declaration order (§12); the group `$`-key set.

### 12. 🔵 Emission control — scope & order

The two orthogonal controls over every emission — **scope** (*where* a declaration applies) and **order** (*when* it wins ties) — hail-styl's exact model (`tokensScope`/`rulesScope` + ordered layers), rebuilt on the platform's own primitives.

**Order — partially exists; extend it everywhere.** Rules already have real order control: layers nest under the system prefix (`@layer vane.recipes`), authored per rule, global order pinned once for coexistence — the CSS-native mechanism (§1), stronger than manual flush ordering. The actual gaps:

- **Token declarations aren't layer-addressable** — `createGlobalTheme(':root', …)` emits outside any layer. Proposal: tokens get a default `tokens` layer, first in the system order, overridable per module.
- **Axis-override order is unspecified** — the load-bearing piece for §11 multi-axis. Proposal: single-axis overrides emit in axis-declaration order (later axis wins ties); sparse combos emit after all single-axis declarations. Default → single-axis → combo becomes a *guarantee*, not an accident of source order.

**Scope — restore the dropped proposal.** Token emission is hardcoded to `:root` today (no parameter on `createGlobalTheme(':root', …)`); an earlier draft's custom-scope proposal fell out during a restructure and is reinstated here: systems and token modules can emit under a configurable scope (`createSystem({ scope: '#widget-host' })`, per-module override) — the extension/embedded-widget mounting case hail-styl's `tokensScope` served. Scope and §11's per-mode triggers compose: base at the token's scope, mode overrides at scope + trigger.

### 13. 🔵 Platform levers not yet harnessed

An audit of CSS control points the pipeline doesn't drive yet — opportunities, not gaps:

- **`@property` — the standout.** Register token CCPs with `syntax`/`inherits`/`initial-value`. §5's data-type branding maps 1:1 onto `@property` syntax strings (`'<color>'`, `'<length>'`, `'<angle>'`) — the browser then enforces *at runtime* the same type the compiler enforced at build time (errors-at-the-cursor extended into the live cascade), and typed CCPs become **animatable**: transition `--brand-hue` natively — huge for §11 axes and live theming. `inherits: false` becomes a per-token cascade control. Ties to §14 (registration without declaration; note `initial-value` is required for non-universal syntax — detail to spec).
- **`:where()` as a deliberate specificity lever** — conditions already use it internally (`schemeIs`); make zero-specificity emission a documented, per-emission choice for override-friendly output.
- **`@scope`** — native subtree scoping (with donut holes); aligns with the owned "scope" vocabulary (§11) and is a natural future trigger/scope form.
- **`view-transition-name`** — token-backed transition names; small, cheap, worth a line in the spec.

### 14. 🔵 Null tokens + the integration surface

Two related proposals from one proven setup (hail-styl icon channels + svgo + `IconFrame.vue`).

**`val: null` — registered, never emitted.** hail-styl precedent confirmed (`setup-generation.styl`: `if value != null` skips the declaration while keeping the token known). The use-case: tokens that are pure per-instance override channels — no meaningful global default, consumed only as `var(--name, fallback)` with the fallback at the consumption site (e.g. wrapped SVG attributes):

```TS
icon: {
  fill:   { val: null, description: 'per-instance override channel — no global default' },
  stroke: { val: null },
}
// implies is:'var' (var-only consumption), emits nothing, .val typed undefined, .name/.var work everywhere
```

**Not ports, deliberately.** A port gets a *hashed* name (`--vane-fraction__h4x`) and is a component-owned reactive input. These channels need **stable public names** external build tooling can compute (an svgo plugin rewriting SVG attributes to `var(--vane-icon-fill, currentColor)` at build time), plus a place in the system's vocabulary (described, audited, in the manifest). Port = reactive input with private identity; null token = override channel with public identity and no emission.

**The integration surface.** The old setup needed a parallel hand-written TS mirror of the design system (`d.ts` with `dsTokenToVarName`, vite `define` injection into Stylus, one-level-nesting parse limits). All of that collapses into ordinary imports once tokens are TS — *if* the extraction utils exist:

- Plane-neutral helpers for common extraction/transformation needs — e.g. `namesOf(t.icon)` → record of ccp-names, `varsOf(t.icon, fallbacks?)` → record of `var()` refs — so configs and plugins (svgo, PostCSS, anything) consume the system without reimplementing naming.
- The deterministic naming contract (`--{prefix}-{kebab-path}`) documented as a public guarantee, so even contexts that can't import the graph can compute names by convention.
- **Flag to verify:** config files run outside the vane compiler — a name-only read path for token modules (importable from `nuxt.config.ts`/svgo config without triggering emission) needs confirming; the existing "system modules are importable from app code" serialization machinery suggests it's close, not free.

**Real-world context:** `packages/dux/__references__/hail-nuxt` — the Nuxt starter where this need originated: `IconFrame.vue`, the svgo `format-svg` plugin, and the hand-maintained TS↔Stylus mirror (`shared/utils/ds.ts` + vite `define` injection) this whole proposal replaces.

## C. Runtime / consumption

### 15. 🟢 `updateTokenCCPVal(s)` / `setCCPVal` — runtime value updates

Replaces the runtime side of `theme`/`applyTheme` (§4). Named on the agreed CCP anatomy: `--name: val` → ccp-name `--name`, ccp-val `val`; `var(--name)` → ccp-var. "Update" because a declaration already exists; "Token" because it targets a vane-dux token specifically, which is what makes stylesheet ownership (§16) possible — vane-dux knows where a token's declaration lives.

**Signature — target optional and last:**

```TS
updateTokenCCPVal(t.color.brandHue, 42)                    // patches where the token was emitted (§14)
updateTokenCCPVal(t.color.brandHue, 42, '#widget-root')    // scoped to a selector
updateTokenCCPVal(t.color.brandHue, 42, someElement)        // scoped to an element (inline style)
```

**Batch — list form (per-task target override) or tree form (typed against `t`):**

```TS
updateTokenCCPVals([
  [tokenA, newValueA],
  [tokenB, newValueB, '#specific-override'],
], '#widget-root')

updateTokenCCPVals({
  color: { brand: newBrand, brandSoft: newBrandSoft },
})
```

**`setCCPVal`** — sibling for *any* CCP, not just a vane-dux token. No known declaration site to patch, so it always needs an explicit target and writes into vane-dux's own ad-hoc overrides stylesheet.

**Typing — the factory, no runtime global.** `createSystem` already returns a bundle closed over the resolved tokens (`{ t, css, recipe, port, … }`, `system/createSystem.ts:185`), so `updateTokenCCPVals` simply joins it:

```TS
export const { t, css, updateTokenCCPVals } = createSystem({ tokens })
```

This matches idb-dux's boundary exactly (`register.ts`: *"Registration supplies types, not values — factories that need the schema object still receive it explicitly"*): `declare module` handles the type-only case for exported `Vane*<…>` type helpers; factories handle anything needing the real value at runtime. `updateTokenCCPVals` needs the value (to resolve where a token was emitted), so it belongs in the factory return.

**Resolved — support both the free function and the method form.**

```TS
updateTokenCCPVal(t.color.brandHue, 42)     // free function
t.color.brandHue.updateCCPVal(42)            // method — identical result, zero imports
```

The two single-token forms are near-identical in ergonomics; the method's one real edge is needing no import (though auto-imported system utils erase even that for many setups). The plural forms (`updateTokenCCPVals`, array or tree) have genuine advantages the method form can't match — one shared target across many updates, tree form for same-group discoverability in IntelliSense — so those stay free-function-only. Adding the method is low-cost (it delegates to the same logic, and every handle already carries `.var`/`.val`/color methods), so ship both: method + single free function + plural free-function batch forms.

### 16. 🔴 Runtime stylesheet ownership

**Gap:** no way to update a token by selector without holding a DOM element, and no runtime record of which stylesheet/rule backs a token — that mapping exists at build time and is discarded after compilation. Enables the happy path of §15: no target → patch the token's existing declaration in place.

**Mechanism sketch (not prescriptive):**

- Tag every vane-dux-generated stylesheet (`data-vane-owner="tokens"`) so the runtime finds "its own" sheets via `querySelector`, touching nothing an app or other library added.
- Emit a small runtime lookup table (alongside the manifest) mapping token path → `{ sheet, rule index or selector, property }`, so updates are a direct lookup + CSSOM write (`sheet.cssRules[i].style.setProperty(...)`), no re-parsing.
- CSSOM (`document.styleSheets`, `CSSStyleSheet`, `CSSRule`) is a live JS object graph, not text — mutating it costs about an inline-style write. No perf concern; removes the "must hold an element" requirement.
- Not comment-based anchors (comments don't survive CSSOM parsing) — the `data-*` attribute is the anchor.

### 17. 🔵 Port schema validation

Ports should use the **same object syntax as tokens** (§6) — a port is a token-like definition made per-instance, on the go — minus what doesn't apply (`is`: a port is unconditionally live). Type-level: `Omit<VaneTokenConfig<T>, 'is'>`.

```TS
const factor = port(1)                                                 // shorthand — no config
const factor = port({ val: 1, validate: { schema: FactorSchema } })    // config, same shape as a token
```

**Retire `as`.** The current unit-annotation option (`port(0, { as: 'deg' })`) bolts a unit on from outside — exactly the anti-pattern §5/§6 reject. Once branding utils exist, the default carries its own unit:

```TS
port(angle(45))   // unit lives in angle(), no `as` needed
```

Treat `as` as a stopgap to remove when §5 ships.

**`eager` — type-only by default, opt into runtime checking.** A schema is useful for *type inference alone* (zero runtime cost) even when you never want a runtime check. So `eager` defaults to `false` (schema types the port, no runtime validation runs); `eager: true` opts into actually validating each `.set()`:

```TS
port({ val: 1, validate: { schema: FactorSchema } })                // type-only inference, no runtime check
port({ val: 1, validate: { schema: FactorSchema, eager: true } })   // also validate at runtime on each set()
```

**`onInvalid`, split by call context** (only relevant when `eager: true`). A `.set()` inside a reactive `computed()` (via `usePorts`) has no safe catch point, but a manual imperative `.set()` is catchable with ordinary `try`/`catch`. `.set()` can't tell which context it's in, so the default is the universally-safe `'warn'`:

```TS
port({ val: 1, validate: { schema: FactorSchema, eager: true, onInvalid: 'warn' } })    // default — safe everywhere
port({ val: 1, validate: { schema: FactorSchema, eager: true, onInvalid: 'throw' } })   // opt-in — imperative-only ports
```

**System-level defaults.** `createSystem` is the natural home for a project-wide default (`{ validate: { eager: true, onInvalid: 'warn' } }`), so a team opts a whole system into runtime checking once rather than per port.

Type `schema` against [Standard Schema](https://standardschema.dev) (the shared `~standard` interface zod/valibot/arktype/effect all implement) so users bring their own validator and vane-dux depends on none — the §1 "align with an existing standard" instinct, applied to the validation ecosystem.

**Not for token definitions.** Hand-authored token values in your own source aren't untrusted input — type-only inference is the whole story there. `validate` stays ports-only. (The design-tool import case in §25 is unrelated: ordinary schema usage on raw JSON before it becomes tokens, not a config key on a definition.)

---

## D. Authoring ergonomics

### 18. 🟢 CCP relationship modeling (the `--base` pattern)

The Stylus idiom of declaring a local `--base` and deriving other values from it splits into three needs, all already covered — no new primitive:

```TS
// non-cascading DRY within one rule → a plain TS constant beats CCP indirection
const base = 8
css({ paddingBlock: base, paddingInline: base * 2 })

// cascading, shared with descendants → port() (a JS export → full type safety anywhere it's imported,
// unlike hail-styl's UseVar whose registry safety stopped at the originating component)
const base = port('8px')
css({ paddingBlock: base, paddingInline: calc(base).multiply(2) })   // calc() already chains — no times() util needed

// ad-hoc local vars, not reused → css.raw, real parsed CSS (lightningcss), still token-interpolating
css.raw`
  --base: 8px;
  padding-block: var(--base);
  padding-inline: calc(var(--base) * 2);
`
```

One narrow gap in the `css.raw` case: a freshly-invented local name like `--base` is just text, so no F2-rename ties its declaration to its uses. Low-stakes (a few lines you're looking at directly); not worth new surface without a concrete bug.

### 19. 🔵 `rawVar` escape hatch

`color('var(--x)')` fails today — `parseColor` can't resolve an external var into a real color. `rawVar` is the deliberate opt-in for "vane can't validate this, trust me," instead of a cryptic parse failure:

```TS
rawVar('--some-other-librarys-var', '12px')   // guarantees var(--name, fallback) shape — validated syntax, unvalidated meaning
```

Pairs with §7's `allowedInputs: 'raw'` — a strict engine can forbid raw refs entirely; a permissive one accepts them through this explicit door.

### 20. 🟡 Property shorthands (`pb` → `paddingBlock`)

A predictable initialism of the *actual* CSS property name is additive, not a competing vocabulary — distinct from Tailwind's full naming universe (which sometimes maps to no single property and ventures into pseudo-selector-as-prop territory, explicitly out of scope). Scope: initialisms of real property names only.

```TS
css({ paddingInline: 16, pb: 8 })   // 'pb' = paddingBlock

const { css } = createSystem({ css: { propsStyle: 'long' } })   // 'long' (default) | 'short' | 'either'
```

`propsStyle` lets a team enforce one form rather than mixing by accident. **Open:** the exact shorthand set (if any).

### 21. 🔵 `fromGroup()` — recipe sugar

Single-property, group-driven variants (badge tone, a palette swap) force a hand-nested `variants` object for a mechanical 1:1 mapping:

```TS
variants: { tone: fromGroup(t.tones, c => ({ background: c })) }
```

Iterates a token group's keys at build time, deriving the variant's possible values from the group itself — no hand-typed union to keep in sync. (Checked for other recipe-sugar candidates; nothing else has earned its place yet.)

### 22. 🟢 `propsOf` — object-based namespacing

Supersedes an earlier tuple-array form (which couldn't guard against two entries' prefixes colliding). The object key doubles as prefix and reference, so nothing drifts:

```TS
propsOf(button)                                    // second arg: 'all' (default) | 'variants' | 'ports'
{ button: propsOf(button), card: propsOf(card) }   // nested scoping
{ ...propsOf({ button, card }) }                    // top-level — keys become the prefix → 'button-size', 'card-size'
{ ...propsOf({ button: propsOf(button, 'ports'), card: propsOf(card, 'variants') }) }   // each entry picks its table
```

The prefix comes from the **key**, not the variable name — `{ btn: button }` prefixes as `btn`.

### 23. 🔵 Mixins — `definePatterns` + expand the set

`definePatterns` already exists in `/preset` — the full [Every Layout](https://every-layout.dev) set (`stack`, `inline`, `cluster`, `center`, `sidebar`, `switcher`, `frame`, `reel`), memoized, bound to the system's spacing. So layout mixins are largely solved. Two moves:

- **Expand the shipped set** with the common non-layout mixins: `circle`, `square`, `visuallyHidden`/`srOnly`, `truncate` (line-clamp).
- **Bless `definePatterns` as *the* mixin-authoring convention** — document it as the blessed shape for custom mixin bundles, so people don't reach for ad-hoc `css()` wrappers.

### 24. 🔵 Documented custom-util authoring recipe

vane-dux already exports the right type material (`VaneColor`, `VaneColorish`, `VaneCssValue`, `VaneCssInput`, `VaneMathValue`, `VaneDimensionOf`, …). What's missing is the documented pattern — a short canonical recipe for writing a util that accepts and returns vane values and composes with the rest of the surface. A docs/DX gap, not a missing primitive. Load-bearing for the whole "tune your own engine, build your own utils" vision: without it, authoring an `oklch`-caliber util is archaeology.

---

## E. Integration

### 25. 🔵 W3C Design Tokens — two-way sync

**Import** — a built-in importer reads an external design-token export (Figma's Tokens Studio, Style Dictionary, the W3C draft all converge on `$value`/`$type` per entry). Heterogeneous file (colors next to dimensions next to font stacks), so one importer walks the tree and dispatches per `$type`:

```TS
import designToolTokens from './design-tool-tokens.json'
import { processDesignTokensJSON } from '@mszr/vane-dux/standards'

const validatedTokens = await processDesignTokensJSON(designToolTokens)
export const t = defineTokens({ ...validatedTokens /* + our own */ })
```

Named as a verb — it's a real importer (dispatch each entry to the matching builder, preserve any `mszr.vane-dux` `$extensions`), not just a validator. Hand-write and bundle it (one fixed, owned shape) rather than depending on zod/valibot — the opposite call from §17's ports, where the whole point is user-chosen validators.

**Export** — vane-dux emitting its own graph in the same shape, so a compliant tool can read a vane-dux-defined system. Architecturally sound (shared standard = interoperability), and the strongest evidence of the §1 alignment commitment. What survives and what's lossy:

- Resolved *values* export losslessly.
- Engine constraints (ranges, colorspace, elevation curves) and derivation relationships have no standard equivalent — lossy on a naive export.
- The fix for derivations exists in the draft: `$extensions`, vendor metadata other tools ignore but vane-dux re-reads:

```json
{
  "$value": "oklch(96.3% 0 0 / ...)",
  "$type": "color",
  "$extensions": { "mszr.vane-dux": { "derivedFrom": "color.brand", "via": "elevation", "position": 0.03 } }
}
```

**Certainty limit:** the *shape* tools converge on is well-established; exactly which plugins round-trip a vane-dux export back into a given tool today is not asserted here — verify against current plugin docs.

---

## F. Confirmed behaviors worth documenting

### 26. 🟢 `&` in selector keys

From `css/rule.ts`:

```TS
const selector = key.includes('&') ? key : `& ${key}`
```

A key with no `&` gets a `&` plus a space prepended, and that space changes *meaning*: `&:hover` = this element hovered, whereas `&` + space + `:hover` = a hovered descendant. Both are valid CSS — standard nesting behavior, not a quirk, and not something to guard against (self vs. descendant is a real choice authors make). Documenting it so it isn't rediscovered the hard way. The library's own `baseConditions()` always writes `hover: '&:hover'` deliberately.

### 27. 🟢 Dev-only port type check

Keep as is. The check (`typeof` + a `Set` lookup) is negligible next to per-frame layout/paint, and it catches what types can't: a string TS accepts as `string` but that isn't valid CSS (a typo'd color). Compiled out of production entirely via the `NODE_ENV` guard.

---

## G. Workspace requests

### 28. 🟢 Pug templates in all demos

All vane-dux demos and sandbox apps use Pug (`<template lang="pug">`), never raw HTML — maintainer preference, and the demos read cleaner. Applies retroactively to existing demos in the eventual refactor, not just new ones.
