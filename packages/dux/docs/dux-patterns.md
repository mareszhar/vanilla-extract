updated: 2026-07-09
status: settled law — the cross-cutting behavioral rules every spec builds on

# vane-dux — patterns

The cross-cutting law: the few behavioral rules that make every vane-dux surface work the same way, regardless of which file or plane you're reading. [dux-vision.md](./dux-vision.md) principles 2, 3, 5, 6, and 7 are the *why*; this doc is the *what*. The words these patterns are described in live in [dux-language.md](./dux-language.md).

Each pattern is a contract every domain honors identically. The specs are where each pattern's home surface is detailed; this doc is where the settled rule lives once, so a spec references it instead of re-deriving it.

- [1. Evaluate, don't extract; compile, don't run](#1-evaluate-dont-extract-compile-dont-run)
- [2. Type the names, parse the values](#2-type-the-names-parse-the-values)
- [3. Liveness](#3-liveness)
- [4. The runtime boundary is a port](#4-the-runtime-boundary-is-a-port)
- [5. Conditions](#5-conditions)
- [6. Layer discipline](#6-layer-discipline)
- [7. Variants compress state](#7-variants-compress-state)
- [8. Escape-hatch grace](#8-escape-hatch-grace)
- [9. Boring CSS out the back](#9-boring-css-out-the-back)
- [10. Diagnostics are a contract](#10-diagnostics-are-a-contract)
- [11. Agent legibility](#11-agent-legibility)

---

## 1. Evaluate, don't extract; compile, don't run

Style modules (`*.style.ts`) are ordinary TypeScript **executed at build time** in the vanilla-extract child compiler. They are not scanned for statically-analyzable call sites, and they are not executed in the browser.

This is the only model where the full language is available with zero asterisks: a `map` over tokens, a helper imported from another package, a generated scale — all just functions, never a gamble on an analyzer's cleverness. The signature TS-styling horror ("cannot statically evaluate this expression") is not mitigated by this choice; it is structurally impossible.

The cost, honestly stated: styles live in dedicated modules rather than inline in component code. The sibling `.style.ts` file is the contract; SFC-inline authoring is a deferred intention with a trigger ([dux-vision.md §8](./dux-vision.md#8-deferred-intentions)), and the preset's `atoms` lane keeps genuinely small one-off styling short meanwhile.

Two corollaries every surface obeys:

- **Anything a style module exports is inert data** — class strings, port handles, recipe functions. Importing a style module from app code never executes styling work at runtime.
- **Runtime code never constructs CSS rules.** The `/runtime` helpers write custom-property values and toggle classes; they never inject stylesheets.

---

## 2. Type the names, parse the values

The validation work is split between the two tools that are each best at it:

- **The type system owns names and structure:** token paths, condition names, variant names and values, part names, port references, property names (csstype), selector *placement*. A typo in any of these is a red squiggle at the offending key, while you type.
- **A real CSS parser owns value grammar** at build time: `"4pxx"`, an invalid `grid-template`, an unknown function — each is a build diagnostic naming the file, line, property, and what's wrong. Never silently passed through; never a 400-line template-literal type error.

The split is what keeps the language server fast (nobody encodes the `<length>` grammar in template-literal types) while achieving near-total mistake coverage. Editor-channel value squiggles are a deferred nicety; the floor is that **no mistake survives past `vite dev` reload**, and every diagnostic points at a `.style.ts` line, not generated output.

```TS
export const card = css({
  paddin: { md: 8 },        // ← type error at `paddin`: unknown property
  gap: t.space.mid,          // ← type error at `mid`: not in t.space (did you mean `md`?)
  borderRadius: '8pxx',      // ← build diagnostic: invalid <length> at Card.style.ts:4
})
```

---

## 3. Liveness

Every token is classified by the compiler:

- **Static:** all inputs known at build → derivations fold into plain values in the emitted CSS.
- **Live:** the token is marked `.live()` or scheme-dependent → the token *and every derivation downstream of it* compile to live CSS expressions — relative color syntax, `color-mix()`, `light-dark()`, `calc()` — so the browser's cascade does the recomputation, not JavaScript.

```TS
const t = defineTokens({
  color: {
    brand: oklch(0.58, 0.2, 285).live(),                     // runtime input
    brandSoft: ({ color }) => alpha(color.brand, 0.12),       // → oklch(from var(--vane-color-brand) l c h / 0.12)
    surface: ({ color }) => elevation(color.brand, 0.03),     // explicit edge; → color-mix(… light-dark(…), var(--brand))
  },
})
```

Rules of liveness:

- **Liveness propagates, never leaks backwards.** A static derivation of static inputs stays a constant; making one input `.live()` later changes only the emitted CSS, never the authoring surface.
- **The types are honest about it.** `applyTheme` accepts only the graph's declared runtime *inputs* — tokens marked `.live()`. A compile-folded token could not work; a scheme pair without `.live()` is not runtime data; a derived token would be half-clobbered by a direct write when theming its input re-derives it wholly. Each is a type error at the key.
- **Checks degrade honestly.** A contrast check over static endpoints is a `CheckedContrast` guarantee; over a live input it becomes a `LiveContrast` — enforced by emitted `contrast-color()`/fallback rather than proven at build ([dux-spec-tokens.md §5](./dux-spec-tokens.md#5-contrast-and-checks)).
- **Schemes are liveness, not palettes.** `scheme({ light, dark })` compiles to `light-dark()`; the preset composes its explicit-base `elevation()` from that primitive. Switching schemes is `color-scheme`, no JS, no second palette.

This is the hail-styl elevation trick generalized: one set of definitions, alive in the browser, with modern CSS doing the math natively.

---

## 4. The runtime boundary is a port

Build-time styling and runtime values live on opposite sides of a wall. In vane-dux the wall has exactly one doorway: a **port** — a declared, typed, defaulted CSS custom property that a style exposes as its public runtime interface.

```TS
// Progress.style.ts
export const fraction = port(0) // typed by its default; named by its export

export const fill = css({
  inlineSize: `calc(${fraction} * 100%)`, // ports interpolate as var(--…)
})
```

```TS
fraction.set(0.62) // → { '--vane-fraction-h4x': '0.62' } — a style-object fragment
```

One primitive unifies four mechanisms that are elsewhere four separate features:

1. **Reactive component styling** — Vue's `v-bind()` in CSS, typed ([dux-spec-vue.md §1](./dux-spec-vue.md#1-useports)).
2. **Parent→child theming** — the child declares what's themable; the parent sets it through the cascade. This replaces `:deep()`: inversion of control instead of selector archaeology.
3. **Consumer theming of a shipped library** — same mechanism, because ports inherit like any custom property.
4. **Dynamic utility values** — `atoms` arbitrary values ride through ports, so CSS output scales with conditions, never with values ([dux-spec-preset.md §3](./dux-spec-preset.md#3-atoms)).

Rules of the boundary:

- **Ports are exports.** Findable, renameable, deprecable — the module graph sees every crossing, and the emitted debug label follows the export name, so rename-symbol renames everything.
- **Setting a port writes a value, never a rule.** No new CSS exists at runtime; SSR serializes port values as inline style and hydration stays boring.
- **Every port has a default**, so a style is complete without its runtime half — and the default is also what types the port.
- **Components publish their ports on their recipe** (`button.ports.gap`) so classes and style API travel as one import ([dux-spec-recipes.md §2](./dux-spec-recipes.md#2-published-ports-the-ports-key)).
- **Nothing else crosses.** A "dynamic style" that isn't a finite variant choice and isn't a port is a design smell the diagnostics name: *use a variant for finite choices, a port for live values.*

---

## 5. Conditions

A condition is a named circumstance — pseudo (`hover`), media (`md`, `motionOk`), container (`cardWide`), scheme (`dark`), element state (`open`, via `data-state`) — defined once in the system and usable as a **bare key** in every style object, recipe, anatomy, and atom.

```TS
export const card = css({
  padding: t.space.md,
  hover: { background: t.color.surface },          // selector-first: a state's declarations together
  color: { base: t.color.ink, hover: t.color.brand }, // property-first: one property across states
  md: { padding: t.space.lg },
})
```

- **Both nesting directions, because both are how people think.** Selector-first groups a state; property-first tracks one property across states. They compile identically.
- **No underscore dialect.** Conditions are bare keys; the factory refuses a condition name that collides with a CSS property at *definition* time, so the two key namespaces can never blur.
- **Real selectors remain real selectors.** `'&:has(> img)': { … }` is always available beside named conditions — conditions are sugar over the platform, not a cage ([§8](#8-escape-hatch-grace)).
- **One definition, every surface** (principle 5): a condition added to the system is immediately typed in `css`, `recipe`, `anatomy`, and `atoms`.

---

## 6. Layer discipline

Every rule vane-dux emits belongs to a named CSS `@layer`, in the order the system declares (`reset → tokens → recipes → utilities → overrides` by preset default). App overrides land in a later layer and win **because layers say so**, not because someone out-specificitied someone else.

- Each authoring function has a default layer (recipes → `recipes`, atoms → `utilities`); any style can say `layer: 'overrides'`.
- A one-off override of anything — including third-party CSS — is an ordinary `css()` or `globalCss()` in the `overrides` layer. `!important` never appears in emitted output.
- Within a layer, source order applies, exactly like CSS — non-atomic output keeps merge semantics trivially platform-native ([dux-vision.md §4.4](./dux-vision.md#44-output-stance)).
- **Emitted layers nest under the system prefix** (`@layer vane.recipes`): layer order is a *global* first-declaration-wins namespace, so a system claims exactly one global name — its own — and never reorders a coexisting framework's layers ([dux-spec-css.md §5](./dux-spec-css.md#5-layers)). Authoring keeps the short names.

---

## 7. Variants compress state

Most class names were never ideas — just addresses. Recipes keep the industry's settled answer (Stitches' variants model) and vane-dux does not re-invent it: `base` + `variants` + `toggles` + `compound` + `defaults`, resolved to precompiled classes by a plain function whose props are inferred.

The three rules that keep the model honest at scale:

- **Finite runtime choice only.** A recipe call site chooses among precompiled classes; it never synthesizes CSS. A value that isn't finite belongs to a port ([§4](#4-the-runtime-boundary-is-a-port)).
- **Anatomy is the recipe pattern applied to parts.** Multi-part components (dialog, select, tabs) are styled as one unit with named parts; variants apply across parts; the call returns a typed record of part classes. One mental model from a Button to a DataTable ([dux-spec-recipes.md §3](./dux-spec-recipes.md#3-anatomy--parts-styled-as-one-unit)).
- **The call site is strict on literals, permissive on props.** `button({ intnet: 'brand' })` dies at the cursor; `button(props)` with a component's wider props object just works, unknown keys ignored. The most-executed line in the SDK carries zero ceremony ([dux-spec-recipes.md §4](./dux-spec-recipes.md#4-the-call-site-props-in-classes-out)).

Headless-library states (`data-state="open"`) are plain typed conditions, so styling Reka UI / Ark anatomy is the happy path, not an adapter.

---

## 8. Escape-hatch grace

When you step off the happy path, ergonomics degrade gracefully — never off a cliff into a different, worse language:

- **Any selector, any at-rule, anywhere.** Unknown-to-the-DSL CSS is still just CSS: plain selector keys and at-rule keys are parsed, validated, scoped, and emitted. A new platform feature is never blocked on the library (principle 6).
- **`css.raw` for blob CSS.** A validated template literal — markdown prose styling, third-party widget overrides — scoped under the generated class, tokens interpolating as typed values, deliberately allowed to target descendants.
- **Cross-file relationships are imports.** Selector references to other styles are typed interpolations (`` [`${button} ~ &`] ``) — in the module graph, visible to rename and find-references, and honest on their face about crossing a boundary.
- **Escapes carry intent.** `unsafe.value('37ch', 'editorial measure')` and `overrides`-layer rules are enumerated by the audit ([dux-spec-introspection.md §3](./dux-spec-introspection.md#3-audits)): exceptional CSS is sometimes correct, and it should be findable, reviewable, and removable.

---

## 9. Boring CSS out the back

The emitted artifact is the same shape every mature design system converged on: static CSS, tokens as custom properties, state via `data-*` attributes, plain classes, named layers.

- **Inspectable:** dev builds carry stable debug class names and source maps; a devtools rule leads back to its `.style.ts` line and the token that decided each value ([dux-spec-introspection.md](./dux-spec-introspection.md)).
- **Portable:** consumers of a shipped design system get prebuilt CSS + a typed API; they don't need our build pipeline.
- **Survivable:** if vane-dux disappeared tomorrow, an app is left holding ordinary CSS custom properties and classes — not a hostage situation.

---

## 10. Diagnostics are a contract

A diagnostic that merely *exists* proves nothing; the message a human (or agent) reads is the product. Locked by the editor-DX test plane ([dux-workspace.md §5](./dux-workspace.md#5-testing)):

- **exactly one** diagnostic per mistake — never an overload wall. Authoring functions with optional shapes take **one signature with union parameters**, never sibling overloads, so a malformed object reports a single error at the offending property;
- it **names the offending key** and, where the fix is enumerable, suggests it (`did you mean 'md'?`);
- it **lands on** the offending property, not the call;
- hovers stay **readable public types** — `VaneProps<typeof button>` collapses to `{ intent?: 'brand' | 'ghost'; size?: 'sm' | 'md' }`, never an internals wall;
- build diagnostics carry the **`VANE_*` code**, the file:line, and a fix-it — including the lane redirect: *"this value is runtime data — use a variant for finite choices, or a port for live values."*

---

## 11. Agent legibility

Two audiences read styles that never used to: language models writing code, and future-you at 11pm. They want the same thing — the system explaining itself:

- **Types are the first interface.** An agent with `tsc` in its loop converges on correct tokens, variants, and conditions in one or two iterations, because every wrong guess dies at the cursor ([§2](#2-type-the-names-parse-the-values), [§10](#10-diagnostics-are-a-contract)).
- **The manifest is the second.** Tokens with values and descriptions, recipes with their variant spaces, ports with types and defaults — emitted at build, queryable without grep ([dux-spec-introspection.md §2](./dux-spec-introspection.md#2-the-manifest)).
- **Self-linting closes the loop.** Unused tokens, near-duplicate raw values, contrast failures, unaudited escapes — each a warning with a fix-it, so both audiences get corrected *before* pixels are inspected.

Typed styling is the styling agents can be trusted with; the feedback loop is exactly what agent self-correction consumes. This is a design goal, not a feature.
