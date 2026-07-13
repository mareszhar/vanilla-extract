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
| 3 | Terminology to revise (`theme`/`applyTheme`, `kind:'parse'`) | 🟢 |
| **B. The value language** | | |
| 4 | Data-type branding utils (`angle()`, `length()`, `percentage()`, …) | 🔵 |
| 5 | Token metadata config — `{ val, is: [...] }` | 🟢 `is` key + `'var'` label settled |
| 6 | `createEngine()` — configurable value engine | 🔴 |
| 7 | `bem` + `elevation` built *on* the engine's extension points | 🔵 |
| 8 | Full-power color composition (token refs, channel ops, `.in()`) | 🔴 |
| 9 | Scales — step-indexed accessor + `fluid()` | 🔵 |
| 10 | Modes — flat axes, `$expose`/`$require`/`$derive`, `.vals` | 🔴 |
| 11 | Null tokens (`val: null`) + the integration surface | 🔵 |
| **C. Runtime / consumption** | | |
| 12 | `updateTokenCCPVal(s)` / `setCCPVal` + factory typing | 🟢 both method & function forms |
| 13 | Runtime stylesheet ownership | 🔴 |
| 14 | Port schema validation | 🔵 |
| **D. Authoring ergonomics** | | |
| 15 | CCP relationship modeling (`--base` pattern) | 🟢 covered by existing primitives |
| 16 | `rawVar` escape hatch | 🔵 |
| 17 | Property shorthands (`pb` → `paddingBlock`) | 🟡 |
| 18 | `fromGroup()` recipe sugar | 🔵 |
| 19 | `propsOf` object-namespacing | 🟢 |
| 20 | Mixins — `definePatterns` + expand the set | 🔵 |
| 21 | Documented custom-util authoring recipe | 🔵 |
| **E. Integration** | | |
| 22 | W3C Design Tokens two-way sync | 🔵 |
| **F. Confirmed behaviors worth documenting** | | |
| 23 | `&` in selector keys | 🟢 |
| 24 | Dev-only port type check | 🟢 |

---

## A. Orientation

### 1. 🔵 CSS/W3C alignment as a core principle

vane-dux should stay as close as possible to the CSS Specification (W3C) and to the component-architecture conventions the ecosystem already uses. That's how it stays alive as the web evolves, rather than accumulating a parallel vocabulary for things the platform already names. Where CSS has a precise word, use it; where CSS has no concept, coining a term is fine — there's nothing to misalign with.

Concretely: CSS defines a closed set of [data types](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/Data_types) — `<color>`, `<length>`, `<percentage>`, `<angle>`, `<number>`, etc. vane-dux should treat *branding a value as one of these* as a first-class, explicit need (§4), not something implicit in which builder happened to be called.

**Corollary — a util that borrows a CSS function's name owes at least that function's power.** `oklch`, `calc`, `clamp`, `min`, `max`, and every other CSS-counterpart util must be able to express anything its native counterpart can (and more, since ours also accept tokens) — just more ergonomically in TS. Never *less*. Falling short of the platform primitive turns the wrapper from an upgrade into a downgrade. `calc`/`clamp`/`min`/`max` already meet this (they nest and stay dimension-safe); color is the surface that doesn't yet (§8).

This principle drives §3 (rename non-CSS terms), §8 (`oklch()` should do everything native `oklch()` can), §14 (validation via the existing Standard Schema standard, not a bespoke one), and §22 (interoperate through the W3C token format). Worth adding to `dux-vision.md` as a named principle.

### 2. 🔵 The mental model — two setup stages, then usage

Naming the stages makes the "tune your own design system" story legible instead of scattered. There are **two setup calls**, not three — `defineTokens` is not its own stage, it's just a value passed to `createSystem`'s `tokens` key (same as `conditions`, `prefix`, etc.):

```TS
// STAGE 1 — get an engine: the configurable rules every value-defining util follows
const { color, oklch, length, angle } = createEngine({ /* §6 */ })

// STAGE 2 — define a system WITH that engine, and get system-aware utils back in one call
export const { t, css, recipe, port, updateTokenCCPVals } = createSystem({
  tokens: defineTokens({ color: { brand: oklch(0.58, 0.2, 285) } }).compose(/* … */),
  conditions: { /* … */ },
})

// STAGE 3 — use the system-aware utils to style things (css, recipe, t, …)
```

`createSystem` **already returns `t`** (confirmed, `createSystem.ts:186`), so defining tokens inline and getting `t` back from the same call is the intended shape — `defineTokens` looking like a separate stage is only an artifact of examples that extract `t` first, which shouldn't be necessary. Config has two obvious homes: **language-level** (ranges, colorspaces, units, what a bare number means) → `createEngine`; **system-level** (tokens, conditions, prefix, shorthand style, validation defaults) → `createSystem`.

**Flag — double `prefix`.** Both `defineTokens().build({ prefix })` and `createSystem({ prefix })` accept a prefix, and which wins depends on whether the tokens were pre-built (`createSystem.ts:126` uses its own prefix only when the graph isn't already built). Two places to set one thing, with order-dependent precedence — worth collapsing to one clear owner (the system) rather than leaving a silent-conflict surface.

### 3. 🟢 Terminology to revise

Aligning owned vocabulary with CSS/web standards. Most existing terms are fine because CSS has no competing word (`port`, `recipe`, `variants`, `anatomy`, `elevation`) or are already aligned (`scheme` ↔ `prefers-color-scheme`, `layer` ↔ `@layer`). Two genuine offenders:

- **`theme` / `applyTheme`** → revise. CSS's actual vocabulary for this mechanism is custom property / declaration / value; "theme" is a product-level word for the outcome, not the mechanism. Gets worse once liveness generalizes past color (a live radius "applied" via something named *theme* reads wrong). The §12 `updateTokenCCPVal` naming is the intended replacement — revisit both together.
- **`kind: 'parse'`** (internal) → rename to `'literal'` or `'raw'`. It means "authored as a raw CSS string, not built by a structured constructor" — the current name doesn't say that.

**Error-code prefixes — confirmed compliant, recorded as convention.** Diagnostic codes are `VANE_*` (`VANE_TOKENS_CYCLE`, `VANE_CSS_INVALID_VALUE`, …) and shipped types are `Vane*` — package-qualified, per the family naming law (h3-dux uses `H3Dux*` for the same reason: a bare `Dux*`/`DUXERR_*` name is ambiguous the moment two dux forks share a project). Stays that way; never bare `DUX*`.

---

## B. The value language

### 4. 🔵 Data-type branding utils

**Gap:** a value's CSS data type is currently inferred only from which builder was called (`oklch()` ⇒ `<color>`), with no equivalent for `<angle>`, `<length>`, `<percentage>`, etc. A bare `45` is just `number`.

```TS
hue: 45           // generic number
hue: angle(45)    // branded <angle> — unlocks angle methods, accepted where an angle is expected
```

These branding utils are the natural home for engine config (§6): a branded `percentage` can be told to accept factor-style vs. percent-style input, a branded `angle` needs no range (CSS `<angle>` has none — `hsl(400 …)` wraps mod 360, valid CSS), a branded `length` decides what a bare number means (§6, `unitless`).

### 5. 🟢 Token metadata config — `{ val, is: [...] }`

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

Used at composition time (§8), not a pair of free functions. Moded tokens (§10) extend the family: `.vals` is the per-mode record (`accent.vals.dark`), `.val` is typed `undefined` there, and `token.modes` is the runtime discriminant — generic code handles both kinds with `token.vals ?? token.val`.

**Settled — the label is `'var'`.** It's semantically exact (this token won't fold; anything referencing it emits a ccp-`var()`) and adds no new term to learn, unlike `'overridable'`/`'live'`/`'mayChange'`. **The key is `is`** (accepting a string or array): it reads as natural language (`is: ['var', 'checked']` = "this token is var, is checked"), and avoids the `var: true` ceremony a boolean-key shape would impose. No better candidate found — both the `is` key and the `'var'` value are decided; the object-syntax shape was already settled.

### 6. 🔴 `createEngine()` — configurable value engine

Stage 1 of §2. Returns branded, pre-configured value-defining utils.

**Motivation (this is the point, not "replicate hail-styl"):** because vane-dux lives in TS, anyone *can* hand-write a wrapper around `oklch` that forbids hues over some value, or an `alpha` that works in sRGB instead of oklch. But that's ceremony, repeated in every project. `createEngine` gives the *common* design-system tweaks a happy path — ranges, normalization, scales, colorspace defaults, unit meaning — so users rarely need to write their own engine utils. It also lets vane-dux ship *un-opinionated* defaults with per-call escape valves, instead of the too-opinionated model where (e.g.) `alpha()` only ever computed in oklch. Full CSS power (see §8), configurable defaults, per-call overrides (`alpha(token, 0.3).in('srgb')`) — no wrapper needed for the vast majority of cases.

```TS
const { color, oklch, alpha, length, percentage } = createEngine({
  color: {
    space: 'oklch',                                  // default working space for space-agnostic ops (§8 `.in()` overrides per call)
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

- **`space`** — default working colorspace for space-agnostic ops (`alpha`, `mix`, `lighten`), overridable per-call via `.in()` (§8). `oklch()` itself is space-specific by name and ignores this.
- **Per-channel `min`/`max`** — the range a channel accepts.
- **`normalize`** — a real, explicit flag, *not* auto-derived from range presence. A 0–180 hue range where you still reason in raw degrees (0 = red, 125 = green) is a genuine case where normalizing to 0–1 hurts readability. Default `true` when a range exists; set `false` when the absolute value matters more than its position.
- **`allowedInputs`** — whether channel/amount arguments accept only explicit literals, also tokens, or also raw external `var()` refs (§16). Lets a strict system forbid raw refs it can't reason about.
- **`length.unitless`** — `'px'` (default) | `'raw'` | `'rem'`: what a bare number means in a length context. Today a bare number is passed straight through (`serializeStyleValue` returns it as-is) and downstream behavior decides — which is implicit and undocumented. Make it explicit and configurable.

**String emission rule (worth speccing, since there's no stated convention today):** strings emit verbatim/unquoted — `small: '16'` → `--vane-small: 16`. To force a quoted CSS string literal, include inner quotes — `content: '"hi"'` → `content: "hi"`. State this so it's predictable rather than discovered.

**`createEngine` also returns the mode-aware `defineTokens`** (§10) and the branding utils (§4), alongside `color`/`oklch`/`length`/etc. — everything whose behavior the engine configures. The simple path stays simple: a default engine backs the bare importable versions, so a project that never calls `createEngine` still gets working `oklch`/`defineTokens` with default rules (same pattern as the importable-defaults-plus-configured-versions split throughout).

**Extensibility — the engine registers custom primitives, not just configures built-in ones.** This is the meta-pattern `bem` and `elevation` revealed (§7): users don't only want to *tune* existing axes, they want to *add* new ones. So `createEngine` takes registrations alongside config:

```TS
createEngine({
  channels:  { e: elevationChannel },   // a new color channel (elevation)
  units:     { bem: bemUnit },          // a new derived unit
  dataTypes: { spring: springTiming },  // a whole new data-type util
})
```

The payoff: **`bem` and `elevation` stop being privileged library special-cases** — they ship as the *first consumers* of the exact same extension API every user has (§7). That collapses "configure the engine" (§6), "the bem/elevation conveniences" (§7), and "author custom utils" (§21) into one story: the engine is extensible, and its own defaults are built on the extension points you get. Nothing is a hardcoded exception — the mark of a foundation that gives rather than fights.

### 7. 🔵 `bem` + `elevation` — built *on* the engine's extension points

Two hail-styl concepts general enough to ship as defaults — and, per §6's extensibility, implemented *through* the public `channels`/`units` registration rather than as hardcoded internals. They're demonstrations that the base layer is powerful enough that even vane-dux's own conveniences ride on the same API users get. Users can still define their own scales/units/ranges/channels instead.

**`elevation`** — the semantic-elevation channel: a neutral surface tinted toward a base color at a position `0..1`, scheme-aware (light scheme darkens with position, dark scheme inverts). Already exists as `elevation()` in `preset/tokens.ts`; promote it from a bespoke preset helper into a first-class engine channel where `e` substitutes for `l`:

```TS
okech(0.03, 0.02, 264)   // positional constructor, parallel to oklch(l, c, h) — 'e' replaces 'l', never has 'l'
```

**Naming — `okech` vs `okelch`, settled by dsColor's actual shape** (`setup-color.styl:37`). dsColor is a *from-base* builder whose lightness slot accepts **either** `e` (elevation) **or** `l`, each in explicit / normalized / relative modes. So:

- **`okech(e, c, h)`** — the simple positional constructor, elevation-only (the name literally omits `l`). Parallel to `oklch(l, c, h)`. This is what the example above needs.
- **`okelch`** (the name carries both `e` and `l`) — the dsColor-equivalent: a from-base builder where you pick `e` *or* `l` per call, with the explicit/normalized/relative channel modes of §8. In practice this is §8's extended `oklch.from(base, {...})` plus elevation support, so `okelch.from(base, { e: 0.03 })` may be the cleaner spelling than a separate top-level constructor. Exact surface tracks §8; the naming distinction (`okech` = elevation-only, `okelch`/`.from` = elevation-or-lightness) is the settled part.

**`bem`** ("base-scale em") — a unit that's rem-derived (so it respects the user's browser font-size accessibility setting) *and* expressed in the design's base scale. hail-styl needed it because raw `rem` respects a11y but sits outside the scale, while raw scaled-px sits in the scale but ignores a11y — `bem` gets both. Worth `createEngine({ units: { bem: … } })` as the general mechanism (declarable derived units), with `bem` and `elevation` as the two shipped examples.

### 8. 🔴 Full-power color composition

**Gap:** `oklch()` and the color ops accept literal numbers only. Native CSS `oklch()` accepts `var()` in any channel (`oklch(var(--l) var(--c) var(--h))` is legal CSS today), and relative-color syntax derives a new color from a base with per-channel overrides. Per §1, the TS wrapper shouldn't do *less* than the platform primitive it wraps. This is the concrete driver behind `hail-styl`'s `dsColor` — itself just a configurable wrapper over `oklch` with explicit / relative / normalized channel modes.

What full parity needs:

```TS
oklch(0.58, 0.2, 285)                          // explicit literals — today

oklch(lightness.val, chroma.val, hue.var)       // token refs per channel — mix frozen + live (NOT possible today)

oklch.from(brand, { l: 0.9 })                    // relative-from-base, override a subset — oklch.from EXISTS today
oklch.from(brand, { c: channel.multiply(0.5) })  // channel ops (add/subtract/multiply/divide) — EXIST today
oklch.from(brand, { l: norm(0.5) })              // normalized-within-configured-range — NEW, ties to §6 ranges
```

So the gap is narrower than "build it all": per-channel token refs in the base constructor, and a `norm()` mode that reads the engine's configured range. `oklch.from` + channel ops already cover the relative case. The same "accept a token where a literal is expected" gap likely spans other value utilities too, but `calc`/`clamp`/`min`/`max` already nest well, so color is the lagging surface.

**`.in()` colorspace override** — per-call, reusing CSS's own `color-mix(in <space>, …)` vocabulary rather than coining `.colorSpace()`:

```TS
alpha(brand, 0.2)              // engine default space
alpha(brand, 0.2).in('srgb')   // this call overrides — chains like calc().multiply()
```

**One honest platform ceiling:** most ops fold at build time and degrade to a live CSS form (`color-mix()`, relative color) when an input is live — so a single function adapts automatically. The exception is `legibleOn()`/contrast: real APCA contrast has no mature native CSS primitive (`contrast-color()` is experimental), so over a *live* target it degrades to `contrast-color()` + a computed fallback rather than a fully-live guarantee. A capability ceiling, not a design gap — worth documenting so it isn't mistaken for one.

### 9. 🔵 Scales — step-indexed accessor + `fluid()`

`scale.linear` and `scale.modular` already exist (`{ unit: 4, steps: {...} }` → px; `{ ratio: 1.25, ... }` → modular), but both bake a fixed steps object. Two additions:

**Step-indexed accessor** — so `size(2)` means "step 2 on the configured scale" everywhere, keeping the curve in one place instead of each token pre-computing off a frozen steps object. This is what hail-styl's `dsSize(step, base?)` did.

**`fluid()`** — Utopia-style `clamp()` between viewport bounds. `clamp()` already exists; this is a thin, high-value wrapper:

```TS
fluid({ min: 16, max: 24, minVw: 320, maxVw: 1280 })   // → clamp(...) that scales type/space with the viewport
```

### 10. 🔴 Modes — a token's value across mutually-exclusive axes

**Gap.** The only multi-value token switch today is `scheme({ light, dark })` (`color.ts:252`) — color-only, hardcoded to two values, welded to `light-dark()`. It's one special case of an unabstracted general pattern: a token taking different values under different ambient states (scheme, density, brand, breakpoint, …).

**Modes ≠ conditions.** A condition is an *independent* circumstance — `hover`, `md`, `dark` can all apply at once. A mode is a value of a *mutually-exclusive axis* — exactly one active per axis — which is what makes a per-mode token value unambiguous. The name aligns with Figma's "variable modes" (→ §22 interop, near-1:1).

**Axes are flat, declared in `createEngine`.** An earlier draft nested axes under token groups (`$global` + per-group trees) with path-prefixed keys (`globalSchemeLight`). Flattening dissolved every problem that structure created: axis names are keys of one object — unique by construction, so no prefixes, no collision policing, no `$global`/`$shared` wrapper at all. Scoping and enforcement are per-axis `$`-config keys (which can never collide with mode-value names):

```TS
export const { defineTokens } = createEngine({
  modes: {
    scheme:  { light: '$defaultScope', dark: schemeIs('dark'), $require: ['color'] },
    density: ['compact', 'cozy'],          // shorthand → [data-density=compact] / [data-density=cozy]
    brand:   { acme: data('brand', 'acme'), globex: data('brand', 'globex'), $expose: ['color', 'marketing.expA'] },
  },
})
```

- **`$expose: [paths]`** — narrows which groups/subgroups see the axis (dot-notation; exposure to a group includes its subgroups). Absent = exposed everywhere.
- **`$require: [paths] | true`** — tokens in those groups *must* vary along this axis. **`$require` implies `$expose`** (you can't require what isn't visible), so no third `$exposeAndRequire` key is needed: `$require` alone narrows *and* enforces; combine with a wider `$expose` when some groups get it optionally and others mandatorily. `true` = required everywhere exposed.
- **Triggers are `VaneConditionInput`** — the exact type conditions already use: a selector string, an at-rule string, or the typed helpers (`media()`, `data()`, `schemeIs()`). `schemeIs('dark')` already compiles to **two arms** (pinned `[data-scheme=dark]` subtree + the media-preference arm excluding opposite-pinned subtrees — hail-styl's exact dark-scheme-overrides dance), so multi-selector emission falls out of multi-arm conditions for free. `'$defaultScope'` is the sentinel for "emit at the token's own scope."

**Authoring — axis-nested `val` map, one axis per token, totality by type:**

```TS
const t = defineTokens({
  color: { accent: { val: { scheme: { light: color('red'), dark: color('darkred') } } } },
  space: { gap:    { val: { density: { compact: 4, cozy: 8 } } } },   // any token type, not just color
})
```

- **One axis per token.** A token varying along two axes simultaneously (dark×compact) is genuinely ambiguous in the cascade — two selectors setting the same var, order silently decides. So a `val` map uses exactly one axis; multi-axis needs are expressed by deriving from single-axis tokens (§8). This rule is also what makes `.vals` unambiguous without naming the axis.
- **Totality is type-enforced.** The map is `Record<AxisValues, V>` — omitting `dark` is an error at the cursor, not an undefined var discovered at night. `$require` then only carries the stronger meaning ("must vary along this axis"); coverage is the type's job.
- **Intellisense mechanics:** `const` type parameters on `createEngine` preserve literals (no `as const` needed at the call site), and `$expose` dot-paths are matched against the current definition path with template-literal types — the same mechanism idb-dux's `where` dot-path completions already prove out. Flag: TS-server performance on very large trees is an engineering risk to measure, not a design blocker.

**No default value — a mode is a per-value emission scope, period.** Every mode value emits under its trigger; `'$defaultScope'` is the explicit opt-in to the token's own scope (`:root` by default, §13). No "first-declared wins" magic. Consequences:

- **Moded ⇒ `is: 'var'` automatically.** A token whose value varies by ambient state can never fold, nor can anything downstream of it. Writing `is: 'var'` explicitly is allowed but redundant.
- If no value maps to `$defaultScope`, the token has no base declaration — outside any matching mode context, `var(--token)` resolves to nothing (or a per-use fallback). Correct, and deliberate (see §11 for the fully-unemitted cousin).
- The built-in scheme axis may still emit native `light-dark()` as an optimization; arbitrary axes use selector overrides. Authors never see the difference.

**Reading values — `.vals` record, not a call.** An earlier draft had `token.val(modeKey)`; a record is strictly better — shorter, autocompletes its keys, no string-argument API:

```TS
t.color.accent.vals.dark    // one mode's value — keys autocomplete from the axis
t.color.accent.val          // typed undefined on moded tokens (an error to use where a value is expected)
t.space.gap.modes           // runtime discriminant: { axis: 'density', values: ['compact', 'cozy'] } | undefined

const log = (token) => console.log(token.vals ?? token.val)   // generic code handles both, no crash, no sentinel
```

Runtime returns `undefined` rather than a `'$hasModes'` sentinel — a sentinel string can leak into CSS/logs as a plausible value; `undefined` can't, and the `token.modes` discriminant covers the "which kind is this?" question for untyped contexts.

**Naming flag:** the internal `VaneTokenMode` (`'static' | 'scheme' | 'live' | 'derived'`) collides with this vocabulary — its `'scheme'` literally becomes one axis instance. Rename the internal field when modes land.

**Cross-stage rules.** A token's mode map is **atomic** — authored whole in whichever stage defines the token. Adding a *different token* whose mode values derive from existing handles is normal `.derive()` usage; reopening an existing token's map in a later stage to add a mode is an error by design (the existing leaf-redefinition rejection). Deriving one mode from another *within* one token uses a plain `const` — TS itself is the staging mechanism (the reason idb-dux needs `.stage()` is that CEL is a compiled-away string language whose intermediates must be named inside the builder; TS consts already do that job here with real rename/find-refs):

```TS
const accentLight = color('red')
accent: { val: { scheme: { light: accentLight, dark: accentLight.darken(0.4) } } }
```

**`$derive` — rule-based modes, and one-line dark mode.** When one mode is systematically derivable from another ("dark is always light, darkened"), declare it once on the axis. No chicken-and-egg with `createEngine` (the callback is *declared* at engine time but *invoked* at defineTokens/resolve time, receiving the engine's own finished utils) — so no intermediate `createDefiner` stage is needed:

```TS
modes: {
  scheme: {
    light: '$defaultScope',
    dark: schemeIs('dark'),
    $require: ['color'],
    $derive: { dark: ({ light }, u) => u.darken(light, 0.4) },   // u = this engine's configured utils
  },
}
```

- A token that provides `light` but omits `dark` gets the derived value; explicitly providing `dark` overrides. Totality is satisfied either way.
- **The compounding payoff:** with `$require` + `$derive` together, plain tokens in the exposed groups need no mode map at all — `brand: hsl(…)` *is* the light value, dark derives automatically. "Add dark mode to a system that didn't have it" collapses from "edit every token" to **one axis declaration**. Gauntlet moment 2, amplified.

**Bulk authoring — the transposed helper.** For hand-tuned palettes where `$derive` doesn't apply, per-token maps get ceremonious at scale. A transposed form matches how designers actually think (whole light palette, then whole dark palette — exactly a Figma variables table, rows×mode-columns):

```TS
color: modes('scheme', {
  light: { a: hsl(…), b: hsl(…), c: hsl(…) },
  dark:  { a: hsl(…), b: hsl(…), c: hsl(…) },   // key sets must match — totality stays type-enforced
})
```

Compiles to the same per-token maps. Tokens needing per-token metadata use the ordinary form alongside (the two mix freely in one group). Positional-array sugar (`brand: [hsl(…), hsl(…)]`) was considered and dropped: it trades away self-documentation (which slot is dark?) for marginal terseness, and degrades fast past two values.

**Axes auto-derive conditions.** Declaring the `density` axis should also make `compact:`/`cozy:` available as conditions in `css()` — one trigger declaration powering both token values *and* rule styling, so the existing `dark` base condition and the scheme axis can never drift apart. `createSystem` wires this (it owns conditions).

**Runtime.** `setMode(el, 'density', 'compact')` generalizes `setScheme` (which stays as an alias for the built-in axis), writing the matching `data-*` for shorthand-generated triggers.

**Open:** the transposed helper's name (`modes(…)` doubles the config key's name — fine or confusing?); whether `$derive` can also be declared per-group rather than per-axis; `token.modes` vs a name that avoids the `VaneTokenMode` clash entirely.

---

### 11. 🔵 Null tokens + the integration surface

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

## C. Runtime / consumption

### 12. 🟢 `updateTokenCCPVal(s)` / `setCCPVal` — runtime value updates

Replaces the runtime side of `theme`/`applyTheme` (§3). Named on the agreed CCP anatomy: `--name: val` → ccp-name `--name`, ccp-val `val`; `var(--name)` → ccp-var. "Update" because a declaration already exists; "Token" because it targets a vane-dux token specifically, which is what makes stylesheet ownership (§13) possible — vane-dux knows where a token's declaration lives.

**Signature — target optional and last:**

```TS
updateTokenCCPVal(t.color.brandHue, 42)                    // patches where the token was emitted (§11)
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

### 13. 🔴 Runtime stylesheet ownership

**Gap:** no way to update a token by selector without holding a DOM element, and no runtime record of which stylesheet/rule backs a token — that mapping exists at build time and is discarded after compilation. Enables the happy path of §12: no target → patch the token's existing declaration in place.

**Mechanism sketch (not prescriptive):**

- Tag every vane-dux-generated stylesheet (`data-vane-owner="tokens"`) so the runtime finds "its own" sheets via `querySelector`, touching nothing an app or other library added.
- Emit a small runtime lookup table (alongside the manifest) mapping token path → `{ sheet, rule index or selector, property }`, so updates are a direct lookup + CSSOM write (`sheet.cssRules[i].style.setProperty(...)`), no re-parsing.
- CSSOM (`document.styleSheets`, `CSSStyleSheet`, `CSSRule`) is a live JS object graph, not text — mutating it costs about an inline-style write. No perf concern; removes the "must hold an element" requirement.
- Not comment-based anchors (comments don't survive CSSOM parsing) — the `data-*` attribute is the anchor.

### 14. 🔵 Port schema validation

Ports should use the **same object syntax as tokens** (§5) — a port is a token-like definition made per-instance, on the go — minus what doesn't apply (`is`: a port is unconditionally live). Type-level: `Omit<VaneTokenConfig<T>, 'is'>`.

```TS
const factor = port(1)                                                 // shorthand — no config
const factor = port({ val: 1, validate: { schema: FactorSchema } })    // config, same shape as a token
```

**Retire `as`.** The current unit-annotation option (`port(0, { as: 'deg' })`) bolts a unit on from outside — exactly the anti-pattern §4/§5 reject. Once branding utils exist, the default carries its own unit:

```TS
port(angle(45))   // unit lives in angle(), no `as` needed
```

Treat `as` as a stopgap to remove when §4 ships.

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

**Not for token definitions.** Hand-authored token values in your own source aren't untrusted input — type-only inference is the whole story there. `validate` stays ports-only. (The design-tool import case in §22 is unrelated: ordinary schema usage on raw JSON before it becomes tokens, not a config key on a definition.)

---

## D. Authoring ergonomics

### 15. 🟢 CCP relationship modeling (the `--base` pattern)

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

### 16. 🔵 `rawVar` escape hatch

`color('var(--x)')` fails today — `parseColor` can't resolve an external var into a real color. `rawVar` is the deliberate opt-in for "vane can't validate this, trust me," instead of a cryptic parse failure:

```TS
rawVar('--some-other-librarys-var', '12px')   // guarantees var(--name, fallback) shape — validated syntax, unvalidated meaning
```

Pairs with §6's `allowedInputs: 'raw'` — a strict engine can forbid raw refs entirely; a permissive one accepts them through this explicit door.

### 17. 🟡 Property shorthands (`pb` → `paddingBlock`)

A predictable initialism of the *actual* CSS property name is additive, not a competing vocabulary — distinct from Tailwind's full naming universe (which sometimes maps to no single property and ventures into pseudo-selector-as-prop territory, explicitly out of scope). Scope: initialisms of real property names only.

```TS
css({ paddingInline: 16, pb: 8 })   // 'pb' = paddingBlock

const { css } = createSystem({ css: { propsStyle: 'long' } })   // 'long' (default) | 'short' | 'either'
```

`propsStyle` lets a team enforce one form rather than mixing by accident. **Open:** the exact shorthand set (if any).

### 18. 🔵 `fromGroup()` — recipe sugar

Single-property, group-driven variants (badge tone, a palette swap) force a hand-nested `variants` object for a mechanical 1:1 mapping:

```TS
variants: { tone: fromGroup(t.tones, c => ({ background: c })) }
```

Iterates a token group's keys at build time, deriving the variant's possible values from the group itself — no hand-typed union to keep in sync. (Checked for other recipe-sugar candidates; nothing else has earned its place yet.)

### 19. 🟢 `propsOf` — object-based namespacing

Supersedes an earlier tuple-array form (which couldn't guard against two entries' prefixes colliding). The object key doubles as prefix and reference, so nothing drifts:

```TS
propsOf(button)                                    // second arg: 'all' (default) | 'variants' | 'ports'
{ button: propsOf(button), card: propsOf(card) }   // nested scoping
{ ...propsOf({ button, card }) }                    // top-level — keys become the prefix → 'button-size', 'card-size'
{ ...propsOf({ button: propsOf(button, 'ports'), card: propsOf(card, 'variants') }) }   // each entry picks its table
```

The prefix comes from the **key**, not the variable name — `{ btn: button }` prefixes as `btn`.

### 20. 🔵 Mixins — `definePatterns` + expand the set

`definePatterns` already exists in `/preset` — the full [Every Layout](https://every-layout.dev) set (`stack`, `inline`, `cluster`, `center`, `sidebar`, `switcher`, `frame`, `reel`), memoized, bound to the system's spacing. So layout mixins are largely solved. Two moves:

- **Expand the shipped set** with the common non-layout mixins: `circle`, `square`, `visuallyHidden`/`srOnly`, `truncate` (line-clamp).
- **Bless `definePatterns` as *the* mixin-authoring convention** — document it as the blessed shape for custom mixin bundles, so people don't reach for ad-hoc `css()` wrappers.

### 21. 🔵 Documented custom-util authoring recipe

vane-dux already exports the right type material (`VaneColor`, `VaneColorish`, `VaneCssValue`, `VaneCssInput`, `VaneMathValue`, `VaneDimensionOf`, …). What's missing is the documented pattern — a short canonical recipe for writing a util that accepts and returns vane values and composes with the rest of the surface. A docs/DX gap, not a missing primitive. Load-bearing for the whole "tune your own engine, build your own utils" vision: without it, authoring an `oklch`-caliber util is archaeology.

---

## E. Integration

### 22. 🔵 W3C Design Tokens — two-way sync

**Import** — a built-in importer reads an external design-token export (Figma's Tokens Studio, Style Dictionary, the W3C draft all converge on `$value`/`$type` per entry). Heterogeneous file (colors next to dimensions next to font stacks), so one importer walks the tree and dispatches per `$type`:

```TS
import designToolTokens from './design-tool-tokens.json'
import { processDesignTokensJSON } from '@mszr/vane-dux/standards'

const validatedTokens = await processDesignTokensJSON(designToolTokens)
export const t = defineTokens({ ...validatedTokens /* + our own */ })
```

Named as a verb — it's a real importer (dispatch each entry to the matching builder, preserve any `mszr.vane-dux` `$extensions`), not just a validator. Hand-write and bundle it (one fixed, owned shape) rather than depending on zod/valibot — the opposite call from §14's ports, where the whole point is user-chosen validators.

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

### 23. 🟢 `&` in selector keys

From `css/rule.ts`:

```TS
const selector = key.includes('&') ? key : `& ${key}`
```

A key with no `&` gets a `&` plus a space prepended, and that space changes *meaning*: `&:hover` = this element hovered, whereas `&` + space + `:hover` = a hovered descendant. Both are valid CSS — standard nesting behavior, not a quirk, and not something to guard against (self vs. descendant is a real choice authors make). Documenting it so it isn't rediscovered the hard way. The library's own `baseConditions()` always writes `hover: '&:hover'` deliberately.

### 24. 🟢 Dev-only port type check

Keep as is. The check (`typeof` + a `Set` lookup) is negligible next to per-frame layout/paint, and it catches what types can't: a string TS accepts as `string` but that isn't valid CSS (a typo'd color). Compiled out of production entirely via the `NODE_ENV` guard.
