updated: 2026-07-09
status: settled law — referenced by every spec; changes here ripple everywhere

# vane-dux — language

The words: vocabulary, naming rules, and doc style that make every vane-dux surface read like one library. [dux-vision.md](./dux-vision.md) principles 4 and 5 are the *why* — self-documenting, predictable, learn one and know the rest; this doc is the *what*. The behavioral patterns this vocabulary describes live in [dux-patterns.md](./dux-patterns.md).

Every name we add answers three questions: does it say what the thing **is** (not what an ancestor called it), is it **technically accurate**, and is it used **consistently** everywhere the concept appears? Where CSS, the web platform, or the ecosystem already has a precise word, we keep it — renaming for sport is its own kind of boilerplate. Where the inherited word is wrong for our context (vanilla-extract's "theme contract", the ecosystem's "slot recipe"), we rename and record the mapping ([§4](#4-the-naming-map)).

- [0. House style](#0-house-style)
- [1. Vocabulary](#1-vocabulary)
- [2. Values vs types](#2-values-vs-types)
- [3. Naming collisions we refuse](#3-naming-collisions-we-refuse)
- [4. The naming map](#4-the-naming-map)

---

## 0. House style

The style for every vane-dux doc — specs, vision, and READMEs alike.

- **Precise, not padded.** One concept, one term; synonyms signal different things. Use the technical word when the domain calls for it. Write to lower the reader's effort, not to sound thorough.
- **Decisions, not deliberations.** State the current answer, not the path to it. Imperative or declarative ("use X", "X is Y"), never "you might consider X". Dropped alternatives and exploratory reasoning are omitted.
- **Rationale earns its place.** Explain a choice when the reason is non-obvious, frames intent, or guards a known trap — otherwise let the rule stand clean. The test isn't "is this interesting?" but "does this help someone apply the rule correctly, or understand why it matters?" The two failure modes are equal: commentary that buries the rule, and terseness that makes it feel arbitrary. Directness is the default; rationale is the deliberate exception.
- **No hedging.** Drop *generally*, *usually*, *try to* unless a real exception needs surfacing — then state it.
- **DRY.** A fact lives in one doc; the others link to it instead of restating it.
- **Tone is audience-scoped.** Specs are technical and authoritative. The vision is deliberate and aspirational. READMEs are warmer — a new reader's first contact — but still precise: friendly without filler.
- **Specs are contract-driven.** Each entry headlines the desired behavior and why it matters, then proposes an implementation. If reality teaches a better implementation, the proposal moves; the contract above it stays. Micro snippets are collocated with the contract they illustrate — show the usage, not just the abstraction.
- **Code fences: `TS`, not `ts`.** Markdown TypeScript blocks open with <code>```TS</code>. Doc snippets are illustrations — often partial, teaching-ordered, deliberately incomplete — and the uppercase tag keeps the markdown-lint/ESLint pipeline from treating them as compilable source while editors still highlight them.

### Name your token graphs and recipes at export

A house convention for userland, modeled by every demo and doc: export the system's bound functions once (`export const { css, recipe, anatomy, port } = createSystem(…)`) and export styles as named `const`s. Named exports are what make gauntlet moments 1 and 9 free — rename-symbol and dead-export detection only work on names the module graph can see.

---

## 1. Vocabulary

These words carry exactly these meanings across every entrypoint, doc, diagnostic, and test.

| Term | Means |
| --- | --- |
| **token** | one named design decision in the graph (`t.color.brand`, `t.space.md`) — a typed export, never a string key |
| **derivation** | a token defined as a function of other tokens (`({ color }) => alpha(color.brand, 0.12)`) — a real dependency edge in the graph |
| **stage** | one topological `.derive()` step in a token definition — it sees every earlier token; its output becomes visible to the next stage |
| **token module** | an independently buildable token definition composed into a larger graph with `.compose()` — internal stages and source identity stay intact |
| **live token** | a token whose value can change in the browser — marked `.live()` or scheme-dependent. Liveness propagates: any derivation of a live token compiles to a live CSS expression instead of a build-time constant ([dux-patterns.md §3](./dux-patterns.md#3-liveness)) |
| **scheme** | the light/dark (or custom) rendering mode axis. A scheme is a *value pair inside one token* (`scheme({ light, dark })` → `light-dark()`), never a parallel palette |
| **elevation** | a preset derivation mapping a 0–1 foreground/background plane position to scheme-aware lightness — the hail-styl model, generalized ([dux-spec-tokens.md §4](./dux-spec-tokens.md#4-elevation)) |
| **theme** | a scoped set of token overrides: build-time `theme(overrides)` → a class; runtime `applyTheme(el, overrides)` → live-variable writes. A theme overrides tokens; a scheme switches modes — the two are orthogonal |
| **check** | a build-time design guarantee (contrast pairing, focus replacement) that fails as a diagnostic, not an audit finding |
| **system** | the bound design contract: `createSystem({ tokens, conditions, layers })`. Source of every typed authoring function; one per app or design system |
| **condition** | a named, typed circumstance under which declarations apply — pseudo, media, container, scheme, data/ARIA state. Bare keys in style objects (`hover:`, `md:`), one definition in the system |
| **layer** | a CSS `@layer`, declared once in the system; every emitted rule belongs to one |
| **style** | the unit `css()` returns — a scoped class whose rules compiled away |
| **recipe** | a variant-compressed component style: `base` + `variants` + `toggles` + `compound`; calling it resolves variant props to classes |
| **variant** | one named visual axis of a recipe (`intent`, `size`) with enumerated values |
| **toggle** | a boolean variant (`pill: { … }` under `toggles:`) — on or off, no value enum |
| **anatomy** | a multi-part recipe: named **parts** styled as one unit, variants applying across parts ([dux-spec-recipes.md §3](./dux-spec-recipes.md#3-anatomy--parts-styled-as-one-unit)) |
| **part** | one named element of an anatomy (`root`, `trigger`, `content`) — *never* "slot" ([§3](#3-naming-collisions-we-refuse)) |
| **port** | a declared, typed, defaulted CSS custom property that a style exposes as its public runtime interface — the only way values cross the build/runtime wall ([dux-patterns.md §4](./dux-patterns.md#4-the-runtime-boundary-is-a-port)) |
| **atoms** | the preset's strict utility lane: token-bound property→value styling at call sites, dynamic values riding through ports ([dux-spec-preset.md §3](./dux-spec-preset.md#3-atoms)) |
| **escape** | a deliberate step off the typed path — a raw selector key, `css.raw`, an `unsafe` value with a reason. Always validated, always scoped, always auditable |
| **manifest** | the machine-readable projection of a system — tokens, recipes, ports, conditions with metadata — emitted at build for tools and agents |
| **provenance** | the trail from a rendered rule back to its source: debug class names, source maps, token attribution |
| **style module** | a `*.style.ts` file — evaluated at build time, emitting CSS; its exports are classes, ports, and recipes |

The words of CSS itself keep their platform meanings: property names are csstype's camelCase, selectors are CSS selector syntax, at-rules are their CSS spellings. vane-dux never invents a parallel spelling for something CSS already names.

---

## 2. Values vs types

- **Values are unprefixed:** `defineTokens`, `createSystem`, `css`, `recipe`, `anatomy`, `port`, `keyframes`, `globalCss`, `theme`, `defineAtoms`, `applyTheme`, `setScheme`, `propsOf`, `usePorts`, `useAnatomy`. The package specifier already namespaces them; a userland clash is one `import { css as vaneCss }` away.
- **Types are `Vane`-prefixed and domain-scoped.** Root nouns may stand alone (`VaneSystem`, `VaneTokens`); supporting types read `Vane<Domain><Thing>` (`VaneStyleRule`, `VaneRecipeProps`, `VanePortValue`). The everyday utility is `VaneProps<typeof button>` — the inferred variant props of a recipe or anatomy.
- **A standard name stays standard; a name we coin is chosen for precision.** csstype property names, CSS at-rule spellings, and platform terms pass through untouched.

**The shipped namespace is `Vane`.** `dux` is the workspace, branch, and doc-set word only. Shipped types, classes, and interfaces use `Vane*` (`VaneError`, `VaneDiagnostic`, `VaneDiagnosticCode`). Stable machine identifiers use `VANE_*`. No shipped API, diagnostic code, environment variable, class, or type uses `Dux*`, `*Dux*`, or `DUX*` unless it is literally naming the workspace/docs.

**Why `Vane*` and not `VaneDux*`.** The maintainer's forks brand coined types `<Brand>Dux*` when the bare brand belongs to an upstream (`H3Dux*` beside h3's own `H3*`, `IdbDux*` beside Instant's). Here *vane* is itself the coined brand — no official `Vane*` namespace exists to collide with — so the shorter prefix is unambiguous and the `Dux` tier is unnecessary.

**Generated names.** vane-owned CSS custom properties use `--vane-*` by default (`--vane-color-brand`), configurable via the system's `prefix`; user-authored custom properties pass through unchanged. Diagnostic codes are `VANE_<DOMAIN>_<DETAIL>` — stable identifiers the editor-DX suites assert on; renaming one is a breaking change.

---

## 3. Naming collisions we refuse

Three ecosystem words are banned from the vane-dux surface because they already mean something else to our primary audience:

- **"slot".** In Vue, a slot is content projection (`<slot />`). The ecosystem's "slot recipe" (Panda's `sva`, Ark's slots) styles a component's *elements*, which is a different concept — so a Dialog's styled backdrop is a **part** of its **anatomy**, matching the headless libraries' own anatomy/parts vocabulary. A "slot" in vane-dux docs always means the Vue kind.
- **"theme" for the light/dark axis.** Light/dark is a **scheme** (matching CSS `color-scheme` and `prefers-color-scheme`); a **theme** is a scoped token-override set. Conflating them is how "add dark mode" becomes "maintain two palettes".
- **"variable" for the runtime boundary.** Every custom property is a variable; only a declared, typed, defaulted one is a **port**. The distinct word is the point: it names the doorway, not the mechanism.

---

## 4. The naming map

Every name vane-dux coins or adopts, with the ecosystem/substrate term it maps to and why. New names are settled here once; the specs reference this table rather than re-justifying each.

| vane-dux | Ecosystem / substrate | Why |
| --- | --- | --- |
| `defineTokens(graph)` | VE `createGlobalThemeContract` + `createGlobalTheme` | one call defines names *and* values *and* relationships; "contract" vocabulary retired — the system is the contract |
| derivation (`({ color }) => …`) | — (new; hail-styl formulas) | tokens as a dependency graph, not a value bag |
| `.compose(tokenModule)` | hand-merged token objects | independently buildable graphs accumulate with exact inference, duplicate-path diagnostics, and graph-aware rename identity |
| `.live()` | — (new) | marks a runtime-changeable token; names the consequence (derivations stay live) at the definition site |
| `scheme({ light, dark })` | "dark mode", `createTheme` pairs | one token, two scheme values, compiled to `light-dark()` — never a parallel palette |
| preset `elevation(base, n)` | — (hail-styl, generalized) | an explicit base + plane position → scheme-aware color; composed from public `scheme()` + `mix()`, never a core axiom |
| `legibleOn(fn)` / `check.*` | manual audits; "contrast" APIs | named for what it *produces* — a color legible on its target — not the check it carries; validated at build (APCA), live via `contrast-color()` where supported |
| `theme(overrides)` / `applyTheme(el, overrides)` | VE `createTheme` / `assignInlineVars` | the same concept at build time and runtime, named as the pair it is |
| `setScheme(el, scheme)` | manual `data-scheme` writes | the tiny runtime helper for pinning the platform color-scheme axis; themes still mean token overrides |
| `createSystem({ tokens, conditions?, layers? })` | Panda config + codegen; sprinkles `defineProperties` | a plain typed factory — inference instead of a generated artifact directory; accepts inline tokens and returns `t`, defaults layers, ships base conditions — the happy path is one file |
| `css(rule)` | VE `style()` | the author thinks "I'm writing CSS", and the emitted thing *is* CSS; `style` collides with the HTML attribute and Vue's `:style` |
| condition (bare key: `hover:`, `md:`, `dark:`) | Panda/mincho `_hover`; Tailwind `hover:` | the beloved prefix, typed, with no underscore dialect — the factory refuses condition names that collide with CSS properties |
| `layers: [...]` + per-style `layer:` | CSS `@layer` | platform term kept; the system declares the order once |
| `keyframes(steps)` | VE `keyframes` (kept) | already precise: a value, not a global name |
| `globalCss(selector, rule)` | VE `globalStyle` | consistent with `css` as the authoring verb |
| `css.raw\`…\`` | — (new) | the escape hatch is CSS itself: parsed, validated, scoped under the generated class |
| `recipe({ base, variants, toggles, compound, defaults })` | Stitches variants; VE recipes; CVA | the settled industry shape, kept deliberately |
| `toggles:` | `variants: { x: { true: … } }` | a boolean variant is a distinct authoring idea; `pill: true` at the call site, no `'true'` key ceremony |
| `anatomy({ parts, base, variants })` | Panda `sva`, "slot recipes" | multi-part styling named for what it styles — the component's anatomy; avoids Vue's `slot` ([§3](#3-naming-collisions-we-refuse)) |
| `recipe({ ports: { … } })` | sidecar `*Ports` exports | publication: a component's runtime style API travels on the recipe (`button.ports.gap`), one import for classes + API |
| `port(default, options?)` | VE `createVar` + `assignInlineVars`; Vue `v-bind()` in CSS; rainbow-sprinkles' inline vars | one typed primitive unifying four mechanisms; typed by its default, named by its export — never a repeated string |
| `fraction.set(v)` / `ports(…)` | `assignInlineVars({ [x]: v })` | a typed setter returning a style fragment — no string-keyed object literals |
| `usePorts(fn)` | Vue `useCssVars` (internal) | the reactive binding for ports; a `computed()` around a style object, SSR-safe |
| `useAnatomy(anatomy, props)` | — (new) | the one composable the no-wrapper rule bends for: a reactive, typed record of part classes ([dux-spec-vue.md §2](./dux-spec-vue.md#2-useanatomy-and-propsof)) |
| `propsOf(recipe)` | CVA `VariantProps` + hand-restated `defineProps` | the variant space *is* the props declaration — Vue's SFC compiler can't infer a call's types, so the runtime handle supplies them ([dux-spec-vue.md §2](./dux-spec-vue.md#2-useanatomy-and-propsof)) |
| `defineAtoms({ properties, … })` | sprinkles `defineProperties`/`createSprinkles` | one call, system-bound like `recipe`; conditions declared per map keep output bounded |
| `presetTokens` / `presetConditions` / `presetAtoms` | Tailwind's default theme; Panda presets | the furnished room with receipts: plain data you spread, override, or delete |
| `'root:open'` part-scoped condition | raw `'[data-state="open"] &'` | a part styled by another part's state, typed over parts × conditions |
| `hover` / `active` / `hoverFocus` conditions | Panda `_hover` (secretly `:hover, [data-hover]`) | a condition never claims less than it does: `hover` is `:hover`, `active` is `:active`; the affordance pair is named `hoverFocus` |
| `` [`${button} + &`] `` interpolation | Vue `:deep(.child)` | boundary-crossing as typed class references in the module graph, not string incantations — and visibly a selector, because it is one |
| `atoms(props)` | VE sprinkles; Tailwind call-site authoring | the strict utility lane; "sprinkles" is whimsy, "atoms" says small single-purpose declarations |
| `unsafe.value(v, reason)` | silent arbitrary values | escapes carry intent and surface in the audit |
| part `data-part` attributes | Zag/Ark `data-part` | headless-ecosystem convention kept verbatim |
| the manifest | Panda studio metadata, hail-styl AI templates | a first-class build artifact, not a docs-site byproduct |
| `*.style.ts` | VE `*.css.ts` | the module exports *styles* (classes, recipes, ports) — `.css.ts` misreads as "a CSS file in TS clothing" |

Everything not in this table follows CSS, csstype, or web-platform vocabulary unless vane-dux has a clearer project-specific term ([dux-vision.md §3](./dux-vision.md#3-design-principles), principle 9).
