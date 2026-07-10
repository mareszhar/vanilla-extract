updated: 2026-07-10
status: implementation review — release blockers and recommended sequence

# vane-dux implementation review — July 2026

## Verdict

vane-dux has a genuinely differentiated foundation: the three-plane model is coherent, executing ordinary TypeScript is the right compiler model, ports make the live boundary unusually legible, and recipes/anatomy build on one predictable condition system. It is not yet the best styling DX in the industry, and it is not ready to publish. Before this review the docs substantially overstated maturity: a happy-path unit suite coexisted with broken Nuxt stylesheet URLs, FOUC, non-functional demos, no browser regression suite, and an opinionated palette rule hidden in core token resolution.

The right response is not a ground-up rewrite. Keep the plane model, evaluator, CSS surface, ports, recipes, and manifest. Rework the token authoring types and harden the compiler integration before expanding the feature set.

## What hail-styl got right

The important lesson in hail-styl is architectural, not the particular monochromatic preset:

- `src/system` owns registries, setup primitives, validation, helpers, and the flush pipeline.
- `src/design` composes those primitives into controls and presets.
- the system and design have separate entrypoints; users may consume the engine without its furnished design.
- dependencies remain visible in the authored definitions: `color:tinted` names `color:accent`, and semantic roles name the palette token they derive from.

vane-dux should preserve the same boundary as `@mszr/vane-dux` versus `@mszr/vane-dux/preset`. Compiler semantics such as liveness propagation belong in core. A particular neutral curve, base tint, density family, or one-seed palette does not.

## Corrections made in this review

### Compiler and integration

- Fixed virtual stylesheet resolution for Nuxt/Vite root-relative requests. The CSS store used absolute IDs while browser requests arrived as `/_nuxt/...style.ts.vane.css`; those requests now normalize to the stored ID instead of returning 404 and causing FOUC.
- Added the root-relative ID as a unit regression, plus production Playwright coverage that fails on stylesheet/request/console/page errors.
- Fixed `/preset` declaration identity. It previously rebundled core recursive types, making a value imported from `/preset` incompatible with the same apparent type imported from the package root. The preset now consumes and declares its dependency on the public root entry.
- Restored contextual token typing for inline `createSystem({ tokens: ... })` graphs while keeping a pre-defined `defineTokens()` graph recognizable as already resolved.
- Made color/contrast builders immutable and preserved `.live()` through subsequent color composition; aliases no longer gain metadata or liveness at a distance.

### System/preset boundary

- Removed hidden `elevation` configuration and expression handling from the core token resolver and `createSystem`.
- Reintroduced `elevation(base, position, options)` only in `/preset`, implemented from public `scheme()`, `oklch()`, and `mix()` primitives.
- Made every preset edge explicit, for example `surface: ({ color }) => elevation(color.brand, 0.03)`. Replacing the preset helper no longer requires changing the graph engine.

### Demos and verification

- Removed the redundant minimal demo.
- Rebuilt the Nuxt flagship as an ergonomic interaction lab; every visible control changes real state.
- Rebuilt the five-lane comparison, made every action functional, fixed Panda's invalid progress height, and made vane's live brand update its dependent hover/surface graph.
- Added a README to both remaining demos and documented why one uses Nuxt/3000 while the other uses Vite/5173.
- Added demo typechecks, production builds, and Playwright tests. The browser suite verifies interactions, real progress geometry, live computed-color changes, and a clean browser/network console.

## Release blockers

### P0 — derivation references are not graph-typed

`defineTokens({ brandSoft: ({ color }) => ... })` currently contextually types `color` through an open string index. A misspelled reference is caught when the graph executes, with a useful `did you mean`, but not by rename-symbol or at the cursor. With `noUncheckedIndexedAccess`, every reference also becomes possibly undefined; the Nuxt demo currently has to disable that compiler option.

This directly misses principles 1–3 and delight-gauntlet moment 1. Do not solve it with non-null assertions or a hard-coded set of token domains. Prototype a two-stage or builder form that lets TypeScript know the graph shape before derivations are authored, then compare its ceremony against the current one-call form. The release criterion is a strict type fixture proving exact path completions, rename-symbol viability, typo locality, and no `undefined` pollution.

### P0 — dev-mode integration needs its own real matrix

The original FOUC bug survived because tests asked the plugin for its internal absolute virtual ID, not the URL a browser asks Nuxt for. Production Playwright tests are now present, but a CI test must also boot Nuxt dev, reload repeatedly, mutate a token/style dependency, and assert:

- every virtual stylesheet returns 200;
- the first styled paint does not regress to unstyled HTML;
- CSS HMR replaces in place;
- changing an export shape performs exactly one full reload;
- server shutdown releases HTTP and HMR listeners.

The `24678` message is Vite's separate Nuxt HMR socket. In this review it was reproduced only after Nuxt entered an `EMFILE` restart loop in the desktop sandbox; overlapping restarts raced for the same checked port. A previously orphaned demo process was also found holding it. That is not evidence of a vane-owned socket, but process cleanup and repeated-start/stop behavior must be locked in the dev matrix before the Nuxt integration can be called polished.

### P0 — live color syntax must survive common CSS toolchains cleanly

Live `lighten`/`darken`/channel adjustment correctly serializes to relative-color `calc()` syntax, but Nuxt's production CSS pipeline currently routes it through `postcss-calc`, which warns because that parser does not understand relative channel identifiers. The demo now uses live `mix()` for its hover and builds cleanly; the core compatibility problem remains.

Decide and test a policy: preserve standards-native syntax without noisy transforms, configure/guard incompatible optimizers, or document a sharply scoped compatibility requirement. A valid browser value that produces warnings in a default supported stack is not delightful enough to ship.

## High-priority craftsmanship gaps

### Replace source regexes with syntax-aware transforms

`styleExportNames` and debug-name injection recognize source through regular expressions. This is fragile around aliases, destructuring, re-exports, comments, and future syntax. Use the TypeScript/Oxc AST already available in the toolchain. The output should be boring; the transform that produces it should be equally predictable.

### Make diagnostic promises match implementation

The specs promise cursor-local names and file:line value diagnostics more broadly than the implementation currently guarantees. Keep the promises, but mark them as acceptance criteria until editor-DX and integration fixtures prove them. A `VANE_*` code without trustworthy source locality is not the finished product.

### Reduce optional magic in the Nuxt on-ramp

System auto-imports are convenient but currently depend on export detection and a generated inject shim. Explicit imports are more searchable and mechanically reliable. Keep auto-imports optional, make explicit imports the canonical documentation path until the AST transform is complete, and measure whether the saved line is worth this compiler surface.

## Recommended sequence

1. Design and user-test graph-typed derivations; lock the chosen API with strict editor-DX fixtures.
2. Add the Nuxt dev/reload/HMR Playwright matrix and solve listener cleanup under repeated starts.
3. Resolve relative-color/postcss compatibility and add a supported-toolchain matrix.
4. Replace regex transforms with AST transforms and add adversarial syntax fixtures.
5. Walk all twelve delight-gauntlet moments in fresh copy-paste apps, not only repository fixtures.
6. Publish an alpha only after those gates are green; use alpha feedback to simplify names and defaults, not to add domains.

## Current scorecard

| Principle | Current state |
| --- | --- |
| Delightful | Strong conceptual model; demos are now credible; token derivation typing still breaks the spell. |
| Boilerplate is harm | Ports, recipes, and preset composition erase real repetition. Auto-import machinery may cost more complexity than the line it removes. |
| Errors at the cursor | Strong for CSS properties, conditions, variants, and returned token handles; insufficient inside token derivations. |
| Self-documenting | Vocabulary and docs are unusually strong; prior completion claims were not evidence-based. |
| Predictable contracts | Conditions/layers/recipe surfaces are coherent. Multi-entry declaration identity was a serious exception and is fixed. |
| Boring CSS | Fundamentally strong; relative-color optimizer compatibility and dev asset wiring needed hardening. |
| Guarantees | Contrast and audit direction is compelling; integration guarantees need real-browser locks. |
| Plane separation | Strong, now including the corrected root/preset boundary. |
| Ecosystem aligned | Strong vanilla-extract/CSS posture; Nuxt/PostCSS compatibility must be tested as a matrix. |
| Power is opt-in | Mostly strong. Optional auto-import and preset conveniences should stay visibly separable. |
| Elegant implementation | Clear domain modules and immutable value builders; regex source transforms still fall short of the bar. |
