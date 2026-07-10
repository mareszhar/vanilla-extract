updated: 2026-07-09
status: living hub — the philosophy, the architecture, and the index over every dux doc

# vane-dux — vision

> vane-dux is a DX/UX-first design-system engine for TypeScript. You author design intent — tokens, styles, variants, anatomy — as ordinary typed TypeScript; the compiler projects it into boring, inspectable CSS; anything that must stay alive at runtime crosses through a typed port. One question drives every decision: *what would feel most delightful to use?*

This is the hub: the philosophy, the principles, the architecture, the scope, and the model that keeps the fork alive. Everything operational lives in the docs it indexes ([§11](#11-the-docs)).

- [1. What vane-dux is](#1-what-vane-dux-is)
- [2. Why inside the vanilla-extract fork](#2-why-inside-the-vanilla-extract-fork)
- [3. Design principles](#3-design-principles)
- [4. Architecture](#4-architecture)
- [5. The domains](#5-the-domains)
- [6. The delight gauntlet](#6-the-delight-gauntlet)
- [7. The scope edge](#7-the-scope-edge)
- [8. Deferred intentions](#8-deferred-intentions)
- [9. Implementation roadmap](#9-implementation-roadmap)
- [10. How vane-dux stays alive](#10-how-vane-dux-stays-alive)
- [11. The docs](#11-the-docs)

---

## 1. What vane-dux is

`@mszr/vane-dux` is one package: a framework-agnostic authoring core at the root, a tiny `/runtime`, the build plane `/vite`, the framework overlays `/vue` and `/nuxt`, and an opinionated `/preset`. It replaces the CSS-preprocessor stack (Sass, Stylus, and their descendants) with TypeScript — not by imitating CSS syntax in objects, but by giving design decisions the tooling code has had for a decade: autocomplete, types, rename-symbol, find-references, instant diagnostics.

### 1.1 The organizing insight: three planes

A styling system is really three planes with different lifetimes:

- **The contract plane** — the design decisions: tokens and their relationships, schemes, conditions, layers. This is data with structure, and TypeScript models data superbly. It is defined once, in plain TS, with no config file and no codegen.
- **The compiled plane** — styles, recipes, anatomies. Authored as typed TypeScript, **evaluated** at build time (real execution, not static analysis), and emitted as static CSS. At runtime this plane costs nothing: it is classes in a stylesheet.
- **The live plane** — the small fraction of styling that genuinely changes in the browser: reactive component values, user theming, scheme switching. Everything here crosses the build/runtime wall through **CSS custom properties**, and every crossing is a declared, typed **port** or a typed **theme** ([dux-patterns.md §4](./dux-patterns.md#4-the-runtime-boundary-is-a-port)).

Most tools blur these planes (runtime CSS-in-JS made everything live and died of it; utility-class DSLs make everything compiled and go blind at the boundary). vane-dux keeps them distinct, names the boundary, and types it.

### 1.2 The one hard contract

> **vane-dux owes the browser boring CSS, not API compatibility to any SDK.**

Everything vane-dux emits is plain, standards-track CSS: classes, custom properties, `@layer`s, `data-*` selectors. That is the artifact every mature design system converged on regardless of authoring language, and it is the shape that stays debuggable, cacheable, consumer-themeable, and alive even if the authoring tool dies. Inside that envelope the authoring surface is entirely ours — including renaming vanilla-extract concepts wherever a better word exists ([dux-language.md](./dux-language.md)).

### 1.3 Vue and Nuxt are the first clients, not the definition

The core genuinely contains no framework: tokens, styles, recipes, and ports compile to CSS, class strings, and style-object fragments — three currencies every framework speaks. `/vue` and `/nuxt` are thin overlays where the delight investment goes, because no typed build-time styling system has ever treated Vue as a first-class citizen. A `/react` or `/solid` overlay could be added later without touching the core; we will not build them now (YAGNI), but the plane boundary that keeps them possible is lint-enforced from day one ([§4.3](#43-boundaries-are-lint-rules)).

### 1.4 Primary user

vane-dux is built first for its maintainer: opinionated, deliberate, optimized for delight over the widest API. Its lineage is hail-styl — a Stylus design-system engine whose registry, validation, and semantic-elevation ideas were right, imprisoned in a host language with no editor services. vane-dux ports the architecture and upgrades the substrate.

---

## 2. Why inside the vanilla-extract fork

vane-dux's load-bearing dependency is the model vanilla-extract proved: style modules are **executed** at build time in a child compiler, and whatever CSS calls they make are emitted as static CSS. Loops, functions, imports, generated scales — all just work, because it is real execution. The competing models each carry a signature horror we refuse: runtime CSS-in-JS pays style computation per render; static-extraction analyzers turn ordinary TypeScript into a minefield of "cannot statically evaluate"; codegen pipelines put a stale-artifact step between "I defined a token" and "autocomplete knows it."

So we build **on** vanilla-extract's compiler and integration pipeline — the hard, boring, five-years-hardened 20% (bundler plugins, HMR, SSR asset wiring, child-process evaluation, identifier scoping) — and we develop **inside** its fork so that source sits adjacent to ours: reading it, testing against it, and porting from it stays trivial for maintainers and agents alike.

What we reuse and what we build:

| Layer | Verdict |
| --- | --- |
| Compiler, bundler integration, HMR, SSR wiring | **reuse** — `@vanilla-extract/css` + integration/vite-plugin, behind a seam |
| Scoped identifiers, theme-contract var machinery, keyframes | **reuse internally** — never re-exported |
| Token graph: derivations, liveness, schemes, elevation, contrast checks | **build** — the most novel bet, specced first |
| Authoring surface: `createSystem`, `css`, conditions, layers, value parsing | **build** — thin transforms down to vanilla-extract calls |
| Recipes + anatomy | **build** — `@vanilla-extract/recipes` is prior art, not a dependency |
| Ports and the `/runtime` helpers | **build** — `createVar` underneath, ~nothing at runtime |
| Vue/Nuxt overlays, manifest, provenance, audits | **build** — this is the moat |

**The seam rule:** the public API never re-exports a vanilla-extract type or accepts one as input. The "IR" between vane-dux and its emitter is small — evaluated modules making CSS-emitting calls — so if vanilla-extract ever stagnates, the backend is swappable without a public break. That insurance is deliberately cheap and deliberately deferred.

---

## 3. Design principles

The canon. When two pull against each other, the earlier one wins.

1. **Delightful.** Every decision answers "what would feel most delightful to use?" The best API disappears — you think about your interface, not the library. When several designs work, pick the one that fits the mental model of the person reading and writing the code. Empathy is part of delight: design for the moment of use, not the moment of implementation.

2. **Boilerplate is an active harm.** Every repeated shape the engine could erase and doesn't is a failure — parallel light/dark palettes maintained by hand, `createVar` + `assignInlineVars` plumbing rewritten per component, a variant's prop types restated beside its styles. DRY runs both ways: erase repetition in userland *and* keep one source of truth per concept inside vane-dux, so a fix lands once and every surface inherits it.

3. **Errors at the cursor, not the browser.** CSS's defining failure mode is silence — a typo'd property does nothing and you find out by squinting at pixels. In vane-dux, no mistake survives past the editor or the build: token names, variant values, condition names, and structure fail as type errors at the offending key; value grammar fails as a build diagnostic pointing at the `.style.ts` line ([dux-patterns.md §2](./dux-patterns.md#2-type-the-names-parse-the-values)). And the types must not lie about runtime: a value that can change in the browser is typed as live; one that can't, isn't.

4. **Self-documenting.** Names match mental models; types are as narrow as they can be without becoming hard to use. Clear, consistent vocabulary is the backbone of the implementation — one term, one meaning, learn once, use everywhere ([dux-language.md](./dux-language.md)). Comments explain *why*; the code explains the *what*.

5. **Predictable contracts.** Learn one surface, know the rest. Conditions work identically in `css`, recipes, anatomy, and atoms. One variant model everywhere. One way to cross the runtime boundary. No surprises between siblings.

6. **Emit boring CSS; the browser is the runtime.** Zero runtime by default: static styles compile away entirely, and any runtime cost is opt-in, visible, and tiny. Never reimplement what the browser does natively — the cascade, custom-property inheritance, `light-dark()`, relative color, container queries, `:has()`, keyframes. Nothing platform-native is ever out of reach of the authoring surface, and a new CSS feature is never blocked on the library.

7. **Guarantees, not guidelines.** When the compiler knows enough to check a design rule, checking is a feature: contrast pairings validated at build, focus removal without replacement flagged, motion gated behind reduced-motion preferences by preset default. Accessibility moves into the same feedback loop as type errors — diagnostics with fix-its, never moralizing.

8. **Plane separation is a lint rule.** The core never imports a framework; only `/vue` imports `vue`, only `/nuxt` imports Nuxt machinery, and the seam keeps vanilla-extract types out of the public surface. Enforced by lint, not discipline — "a Vue concept leaked into the token graph" is a build error.

9. **Independent, ecosystem-aligned.** vane-dux owns its surface but does not invent against the platform or the ecosystem. Where CSS, vanilla-extract, or the wider field already has a precise convention, we keep it; where a better one exists, we adopt it deliberately and record the mapping ([dux-language.md §4](./dux-language.md#4-the-naming-map)).

10. **Power is opt-in; the simple path never pays for it.** A one-token file, a style with no conditions, a component with no variants: each stays exactly as small as it can be. Ports, themes, checks, anatomy, atoms — every capability arrives as something you reach for, never as a tax levied by default. "*Now supported*" must not make "*not needed*" any harder.

11. **Elegance is a requirement.** The implementation reads with the clarity the API projects. If a piece can't be explained simply, it isn't done.

---

## 4. Architecture

### 4.1 One package, layered entrypoints

```
@mszr/vane-dux           the contract + compiled planes: defineTokens, createSystem
                         (→ t, css, recipe, anatomy, keyframes, globalCss, port, theme),
                         checks, the Vane* types
@mszr/vane-dux/runtime   the live plane's ~300-byte helpers: applyTheme, port glue
@mszr/vane-dux/vite      the build plane: Vite plugin wiring the vanilla-extract
                         compiler to *.style.ts, debug names, manifest emission
@mszr/vane-dux/vue       the Vue overlay: usePorts, useAnatomy         (peer vue)
@mszr/vane-dux/nuxt      the Nuxt module: auto-imports, /vite wiring, SSR polish,
                         DevTools                                      (peer nuxt)
@mszr/vane-dux/preset    the opinionated layer: default tokens/conditions, atoms,
                         a11y + motion helpers, layout patterns
```

The root is where authoring happens. Keep the entrypoint count minimal — every subpath is a maintenance and docs surface. **The peer rule, stated once:** needed by every user → dependency; needed only by a subpath → optional peer (`vue`, `nuxt`, `vite`).

### 4.2 The dependency graph

Everything flows outward from tokens. Inner layers never import outer layers.

```
                    tokens  ← defineTokens: the graph, liveness, schemes, checks
                       │
                       ▼
                    system  ← createSystem: conditions + layers bound to tokens
              ┌────────┼────────────┐
              ▼        ▼            ▼
             css    recipe ·     ports  ← the typed runtime boundary
        (+ keyframes, anatomy       │
         globalCss, raw)            │
              │        │            │
              └────┬───┘        runtime  ← applyTheme, port setters
                   ▼                │
                 vite  ← evaluate *.style.ts, emit CSS + manifest
                   │                │
                   ▼                ▼
                 nuxt ──────────── vue  ← usePorts; the only layers importing a framework
                   
                 preset  ← tokens/conditions presets, atoms, patterns — consumes
                           the same public surface users do
```

The DRY wins come from the graph being shared, not re-derived per surface: one token definition feeds emitted variables, style typing, checks, hovers, the manifest, and `applyTheme`'s accepted shape. One condition definition types `css`, recipes, anatomy, and atoms alike. The test: if a fix to token resolution or condition compilation requires editing more than one module outside its home, the layering has a leak.

### 4.3 Boundaries are lint rules

The workspace ESLint config restricts imports per layer — the matrix lives in [dux-workspace.md](./dux-workspace.md). The highest-leverage rules: the core imports no framework and no vanilla-extract *types* into public signatures; `/preset` consumes only the public surface; `/runtime` imports nothing build-time.

### 4.4 Output stance

- **Non-atomic by default.** Rules are emitted per style, in declared `@layer`s; within a layer, ordinary CSS order applies. Atomic output is an optimization, not an authoring model — deferred behind a measured need ([§8](#8-deferred-intentions)).
- **Provenance in dev.** Dev builds emit stable debug class names (`Button_root__h4x`) and source-mapped CSS; production emits minified boring CSS ([dux-spec-introspection.md](./dux-spec-introspection.md)).
- **`sideEffects` honesty and disjoint module graphs** keep a Vue-only app paying zero bytes for `/nuxt` or `/preset`.

---

## 5. The domains

The work, one spec per domain. This is the status view; each domain's contracts live in its spec.

| Domain | The bet | Spec | Status |
| --- | --- | --- | --- |
| **Tokens** | the token graph: derivations as functions, liveness compiled to live CSS, schemes via `light-dark()`, elevation, contrast as build diagnostics, `theme()`/`applyTheme` | [dux-spec-tokens.md](./dux-spec-tokens.md) | ☑ |
| **CSS authoring** | `createSystem` → typed `css`, bare condition keys, both nesting directions, layers by default, parsed values, `css.raw`, `globalCss`, keyframes | [dux-spec-css.md](./dux-spec-css.md) | ☑ |
| **Ports** | the typed runtime boundary: one primitive for reactive styles, parent→child theming, consumer theming, and dynamic utility values | [dux-spec-ports.md](./dux-spec-ports.md) | ☑ |
| **Recipes** | variants that compress state: `recipe`, toggles, compound variants, and `anatomy` for multi-part components (parts, not "slots") | [dux-spec-recipes.md](./dux-spec-recipes.md) | ☑ |
| **Vue + Nuxt** | `usePorts`, the Nuxt module, SSR/HMR polish, the SFC-feature mapping made typed | [dux-spec-vue.md](./dux-spec-vue.md) | ☑ |
| **Preset** | the hospitable start: default tokens/conditions, `atoms`, a11y and motion helpers, layout patterns — all deletable | [dux-spec-preset.md](./dux-spec-preset.md) | ☑ |
| **Introspection** | the system explains itself: debug names, the manifest, audits, agent context | [dux-spec-introspection.md](./dux-spec-introspection.md) | ☑ |

---

## 6. The delight gauntlet

Principles are for ranking; moments are for feeling. Every surface is walked through these before it ships, and the test suites reference them by number:

1. **Rename a token used in 40 files.** F2, not grep.
2. **Add dark mode to a system that didn't have it.** Token definitions only — zero component edits.
3. **Let a user pick a brand color at runtime** and have surfaces, hovers, and text pairings follow — in both schemes, with no JS recomputation.
4. **Override a library component's padding once.** No `!important`, no `:deep()`, no reading its DOM — a port or the `overrides` layer.
5. **Style a headless component by its states.** Typed `data-state` conditions, one line each.
6. **Bind a style to reactive component state** (a progress bar). One port, one `usePorts`.
7. **Animate open/close respecting reduced motion.** One declaration under a `motionOk` condition.
8. **Use a CSS feature the library has never heard of.** Plain selector or `css.raw` — still validated, still scoped.
9. **Delete styles that are no longer used.** Dead exports, flagged by the language server; unused tokens, flagged by the audit.
10. **Trace why an element is 12px.** From devtools class → `.style.ts` line → token → scale decision.
11. **Point an agent at the repo and ask for a new card variant in house style.** It reads the manifest and the types; its wrong guesses die in `tsc`, not in review.
12. **Copy-paste the quickstart into a fresh Nuxt app.** One system file, one component — a button that looks good in *both* schemes, inside five minutes, with every import line real ([dux-spec-css.md §1.1](./dux-spec-css.md#11-the-happy-path-one-file)).

---

## 7. The scope edge

A garden's wall is a promise: opting into vane-dux never locks you out of something CSS can do.

- **In scope:** the token graph and theming, typed style authoring, variants and anatomy, the port boundary, Vue/Nuxt integration, the preset, introspection, and the escape hatches that keep 100% of CSS reachable.
- **Pass-through, not a concept: components.** vane-dux styles anatomies; it ships no Button. Headless libraries (Reka UI, Ark) are the intended partners — their `data-state` contract is a plain typed condition here — and are **compatibility targets** locked by demo fixtures, not wrapped surfaces.
- **Coexistence, not competition:** Tailwind/UnoCSS classes, SFC `<style>` blocks, and plain CSS files coexist freely — vane-dux output is just classes. Nothing requires a big-bang migration; one component can adopt it inside an existing Nuxt app.
- **Out of scope:** a runtime styling engine (dead model), a component library, another framework's overlay (until a forcing function), design-tool sync beyond the manifest ([§8](#8-deferred-intentions)).

---

## 8. Deferred intentions

No open questions — deferred items are decided intentions with explicit triggers:

| Intention | Decision | Trigger |
| --- | --- | --- |
| `<style lang="ts">` SFC block | sidecar `*.style.ts` is the contract; the block compiles to a virtual style module later — same evaluation model, zero new semantics | Volar-plugin cost justified by real adoption |
| `within()` selector sugar | typed class interpolation is the structural boundary-crossing form — visibly a selector, honest on its face; a comfy wrapper would hand `:deep()` refugees a crutch that delays learning ports | interpolated parent→child selectors proving genuinely noisy in real apps |
| Agent-context prose generator (manifest → oriented markdown) | the manifest *is* the agent interface; diagnostics are the correction loop | a real agent consumer whose needs the raw manifest demonstrably doesn't meet |
| Metadata-aware deterministic `cx` merging (StyleX-style write keys) | non-atomic + layers keeps conflicts trivially CSS-ordered for v1 | measured conflict pain in the demo/real apps |
| Editor plugin channeling parser diagnostics into squiggles | build-time diagnostics at HMR speed are the floor | post-1.0; TS language-service plugins are fragile territory |
| Atomic output mode | non-atomic, layered output is the semantics | measured CSS-size pain at scale |
| `explain` CLI (`vane explain Button --property background`) | provenance + manifest ship first; explain reads them | manifest shipped |
| MCP server over the manifest | the manifest file is the v1 agent interface | agent workflows that need live queries |
| React/Solid overlays | core stays framework-free by lint | an external adopter |
| W3C token / Figma IO | the manifest is the interchange artifact until a real design loop demands more | a concrete design-team loop |
| Swappable emitter backend (replace vanilla-extract) | the seam is the insurance; no second backend is built speculatively | vanilla-extract maintenance decay |

---

## 9. Implementation roadmap

Sequenced so each phase is independently useful and nothing depends on a surface that doesn't exist yet — the anti-mincho constraint: no phase may block on the whole. Each phase's deliverables live in its spec's roadmap; this table is the global status view.

| Phase | Deliverable | Spec | Status |
| --- | --- | --- | --- |
| 0. Scaffold | orchestrator workspace, package skeleton, `/vite` wiring, boundary lint, docs | [workspace](./dux-workspace.md) | ☑ |
| 1. Tokens | the graph, liveness, schemes, elevation, `legibleOn` checks, `theme()`/`applyTheme` — usable with plain vanilla-extract on day one | [tokens](./dux-spec-tokens.md) | ☑ |
| 2. Authoring core | `createSystem` (inline tokens, default layers, base conditions), `css`, conditions, keyframes, `globalCss`, `css.raw`, value parsing | [css](./dux-spec-css.md) | ☑ |
| 3. Ports | `port`, setters, `/runtime` | [ports](./dux-spec-ports.md) | ☑ |
| 4. Recipes | `recipe`, toggles, compound variants, published ports, `anatomy` | [recipes](./dux-spec-recipes.md) | ☑ |
| 5. Preset foundations | `presetTokens`, `presetConditions` — the quickstart becomes real | [preset](./dux-spec-preset.md) | ☑ |
| 6. Vue + Nuxt | `usePorts`, `useAnatomy`, the Nuxt module, SSR/HMR polish, `demo-minimal` + the Prism demo app | [vue](./dux-spec-vue.md) | ☑ |
| 7. Preset conveniences | `atoms`, a11y/motion helpers, patterns | [preset](./dux-spec-preset.md) | ☑ |
| 8. Introspection | manifest, audits | [introspection](./dux-spec-introspection.md) | ☑ |
| 9. Demo + lock | comparison sandbox complete, publish pipeline, gauntlet green | [workspace](./dux-workspace.md) | ☑ |

Phase 1 validates the most novel bet first; phase 5 sits before the framework overlays because the on-ramp *is* a deliverable — gauntlet moment 12 must be real the day anyone can install this. The flagship demo for phase 6 is gauntlet moment 3 live: a user picks a brand color and the whole scheme follows, both modes, zero runtime JS beyond `applyTheme`.

---

## 10. How vane-dux stays alive

The goal: ecosystem alignment stays deliberate forever.

- **`master` mirrors upstream; `dux` is home.** The fork tracks `vanilla-extract-css/vanilla-extract`; our work lives under `packages/dux/`, and files outside it change only when unavoidable ([dux-workspace.md §6](./dux-workspace.md#6-changes-outside-dux)). Rebasing stays trivial because the edit surface outside `packages/dux/` stays tiny.
- **The substrate is adjacent, not entangled.** vane-dux depends on *published* vanilla-extract packages, never `workspace:*` links — the fork adjacency is for reading, testing, and porting, not runtime coupling. On each upstream sync, review the compiler/integration diff for changes worth absorbing; the seam localizes any breakage.
- **Port intentionally.** When upstream or the wider field lands a better convention, we port the idea into the owned module that owns the concept, preserving dux vocabulary.
- **Share back when useful.** Generalizable fixes can become upstream PRs; vane-dux does not wait on them to improve.

---

## 11. The docs

One hub (this), one language doc, one patterns doc, one spec per domain, one maintainer manual. When a domain changes, exactly one spec changes with it.

| Doc | Role |
| --- | --- |
| [dux-vision.md](./dux-vision.md) | **the hub** — philosophy, principles, architecture, scope, roadmap, sustainability |
| [dux-language.md](./dux-language.md) | the words: vocabulary, naming rules, doc style, the naming map |
| [dux-patterns.md](./dux-patterns.md) | the cross-cutting law: the planes, liveness, ports, conditions, layers, escape-hatch grace, agent legibility |
| [dux-spec-tokens.md](./dux-spec-tokens.md) | the token graph, schemes, checks, theming |
| [dux-spec-css.md](./dux-spec-css.md) | the authoring surface: system, `css`, conditions, layers, keyframes, global, raw |
| [dux-spec-ports.md](./dux-spec-ports.md) | the typed runtime boundary |
| [dux-spec-recipes.md](./dux-spec-recipes.md) | variants, toggles, compound variants, anatomy |
| [dux-spec-vue.md](./dux-spec-vue.md) | the Vue overlay and the Nuxt module |
| [dux-spec-preset.md](./dux-spec-preset.md) | the opinionated layer: preset tokens/conditions, atoms, helpers, patterns |
| [dux-spec-introspection.md](./dux-spec-introspection.md) | provenance, the manifest, audits, agent context |
| [dux-workspace.md](./dux-workspace.md) | maintainer manual: layout, tooling, testing, fork-rebase, publishing |

Specs are **contract-driven**: each entry headlines the desired behavior and why it matters, then proposes an implementation. If reality teaches a better implementation, the proposal moves; the contract above it stays.
