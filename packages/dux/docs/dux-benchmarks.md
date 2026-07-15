updated: 2026-07-14
status: accepted historical and current performance baselines

# vane-dux — benchmark baselines

This document records the implementation immediately before the semantic-foundation refactor. It is a preservation aid, not a target API specification.

## 1. Baseline identity

| Field | Value |
| --- | --- |
| Source commit | `85cbfc3d` |
| Platform used for this run | Darwin 25.4.0, arm64 |
| Node | 24.18.0 |
| pnpm | 11.8.0 |
| TypeScript | 6.0.3 |
| Date | 2026-07-14 |

Documentation changes in the working tree do not alter the implementation represented by the source commit.

## 2. Verification results

| Gate | Result | Observed wall time |
| --- | --- | --- |
| `pnpm run lint` | Passed after the next-doc additions | 7.6s |
| `pnpm run sdk:typecheck` | Passed | 5.43s |
| `pnpm run sdk:test` | 44 files, 397 tests, no type errors | 36.89s Vitest duration |
| `pnpm run sdk:build` | Passed; obuild reported 3.84s | 5.40s command wall time |
| `pnpm run bench:baseline` | Three generated scales passed; machine artifact written | 28.95s command wall time |
| `pnpm run fresh:smoke` | Packed strict Vite and Nuxt types, builds, dev HTTP, and HMR passed | ~38s command wall time |
| `pnpm run demo:e2e` | 4 production + 1 dev/HMR browser tests and 2 lifecycle repetitions passed | ~48s command wall time |

The ordinary gate timings are orientation numbers from one local run. The generated-scale metrics below are the accepted same-machine comparison baseline required by [testing](./dux-testing.md#6-performance-benchmarks), not universal marketing claims.

## 3. Generated scale baseline

The source-controlled generator and fixtures live under `benchmarks/`; `pnpm run bench:fixtures:check` detects drift. `pnpm run bench:baseline` builds the SDK and writes the full protocol-1 result to ignored `.dux/benchmarks/current.json`. This document commits the accepted human summary only.

Fixture shapes:

| Scale | Tokens | Modules | Style/recipe consumers |
| --- | ---: | ---: | ---: |
| Small | 50 | 2 | 5 |
| Medium | 500 | 10 | 30 |
| Large | 5,000 | 50 | 150 |

### 3.1 Compiler

TypeScript's reported total time excludes process startup; wall time includes it. Incremental runs make no source edit and measure the unchanged-project fast path.

| Scale | Cold TS / wall | Cold instantiations | Cold memory | Incremental TS / wall |
| --- | ---: | ---: | ---: | ---: |
| Small | 0.44s / 0.96s | 5,389 | 135,133 kB | 0.33s / 0.87s |
| Medium | 0.51s / 1.12s | 31,402 | 159,017 kB | 0.33s / 0.91s |
| Large | 2.15s / 2.71s | 2,163,934 | 442,321 kB | 0.37s / 0.90s |

The large fixture's instantiation and memory jump is the primary Phase 1 warning signal. Resolution-context and axis encodings are compared against this figure before becoming dependencies of later public types.

### 3.2 Warm editor operations

Numbers are local median language-service latency after program warmup. Completion entry counts are 2/10/50 at the root, 25/50/100 in the probed group, and 870 for CSS at small/medium/large respectively. Rename resolves four graph-aware locations at every scale; the diagnostic probe produces one local error.

| Scale | Root completion | Deep completion | CSS completion | Typo diagnostic | Graph rename |
| --- | ---: | ---: | ---: | ---: | ---: |
| Small | 0.122ms | 0.234ms | 3.282ms | 0.178ms | 2.006ms |
| Medium | 0.121ms | 0.178ms | 3.236ms | 0.107ms | 4.009ms |
| Large | 0.141ms | 0.265ms | 2.764ms | 0.105ms | 25.517ms |

These microtimings are comparative signals, not promises of sub-millisecond behavior on every machine. The permanent 20% regression policy and explicit-decision escape apply on the same CI/machine class.

### 3.3 Declarations and build artifacts

| Scale | Declaration emit / bytes | Vite build | CSS raw / gzip | Manifest |
| --- | ---: | ---: | ---: | ---: |
| Small | 0.93s / 8,618 B | 0.99s | 3,037 B / 571 B | 18,426 B |
| Medium | 1.13s / 48,367 B | 0.91s | 23,725 B / 2,702 B | 171,624 B |
| Large | 2.94s / 396,933 B | 3.13s | 205,924 B / 19,842 B | 1,663,780 B |

The Vite measurement includes manifest generation; the current plugin does not expose a trustworthy isolated manifest-timing hook. Generic axes/cases, mutable-slot overhead, and snapshot serialize/hydrate are recorded as **not representable in the current architecture**, not zero. Their owning phases extend these same fixture identities and begin their own before/after series.

## 4. Current package output

The successful build reported:

| Entrypoint | Unminified | Minified | Minified + gzip |
| --- | ---: | ---: | ---: |
| Root | 108 kB | 62.3 kB | 19.7 kB |
| Runtime | 10.2 kB | 5.64 kB | 2.14 kB |
| Vite | 47.4 kB | 30 kB | 11 kB |
| Vue | 731 B | 444 B | 282 B |
| Nuxt | 39.8 kB | 25.5 kB | 9.52 kB |
| Preset | 10.7 kB | 6.91 kB | 3.04 kB |

Total `dist` size reported by obuild: 317 kB across 12 files.

The current root exports are:

```text
VANE_DEFAULT_LAYERS, VaneError, alpha, aria, calc, channel, check,
clamp, color, container, createSystem, darken, data, defineTokens,
desaturate, didYouMean, displayP3, grid, hsl, lab, lch, legibleOn,
lighten, max, media, min, mix, oklab, oklch, ports, rgb, rotate,
saturate, scale, scheme, schemeIs, supports, theme, unsafe
```

The target intentionally changes this surface toward `createEngine()` and engine-derived helpers. The list is recorded to prevent accidental loss of capabilities, not to preserve names.

## 5. Characterization evidence already present

### Values

- `src/values/values.test.ts`: runtime value/math/grid behavior.
- `src/values/values.test-d.ts`: dimension/type compatibility.
- `src/values/values.dx.test.ts`: completion and operand diagnostics.
- token/color output fixtures in `src/tokens/tokens.out.test.ts` characterize static/live color serialization.

### Token graph and modules

- `src/tokens/tokens.test.ts`: graph resolution, checks, themes, failures.
- `src/tokens/tokens.test-d.ts`: resolved token/mode/override shapes.
- `src/tokens/tokens.out.test.ts`: custom-property, scheme, live, derived, and theme CSS.
- `src/tokens/tokens.dx.test.ts`: completion, diagnostics, hover.
- `src/tokens/tokens.modules.*`: composition, duplicate paths, staged typing, output.
- `src/tokens/tokens.rename.test.ts`: definition/consumer/module rename and graph isolation.

### CSS/system/emission

- `src/css/css.test.ts`: style evaluation, conditions, selectors, raw CSS.
- `src/css/css.test-d.ts`: bound property/condition/layer types.
- `src/css/css.dx.test.ts`: completion, diagnostics, hover.
- `src/css/css.out.test.ts`: selectors, layers, globals, values, emitted CSS.
- `src/vite.test.ts`: style-module compilation, debug names, module serialization, manifest inputs.

### Ports/runtime

- `src/ports/port.test.ts`: setters and fragments.
- `src/ports/port.test-d.ts`: port values and widening.
- `src/ports/port.dx.test.ts`: completion, diagnostics, hover.
- `src/ports/port.out.test.ts`: custom-property contracts/fallback output.
- token runtime behavior is characterized by `applyTheme` tests in the token/runtime suites.

### Introspection/integration

- `src/introspect/introspect.*`: manifest runtime/type/editor/output behavior.
- `src/introspect/audit.test.ts`: audit findings and fixes.
- `src/nuxt/postcss.test.ts`: modern syntax/toolchain policy fixture.
- `tests/demos.spec.ts`: production browser behavior.
- `tests/dev/nuxt-dev.spec.ts`: Nuxt development/HMR behavior.
- `scripts/dev-lifecycle.ts`: repeated process/port lifecycle.
- `scripts/fresh-smoke.ts`: packed strict Vite/Nuxt consumer path.

The implementation phase should extend these suites rather than create a parallel unnamed test taxonomy.

### 5.1 Snapshot interpretation

| Evidence kind | Preservation rule |
| --- | --- |
| Browser, computed-value, cascade, optimizer, SSR/HMR, port, and process assertions | Semantic locks. Preserve the observed capability unless a target decision explicitly replaces it. |
| Type/editor completion, useful diagnostic locality, graph rename, and module isolation | DX locks. Preserve the user moment; target member names and hover spellings may intentionally change. |
| CSS output fixtures | Preserve valid value/cascade/layer/selector behavior and intelligibility. Exact custom-property names, old mode labels, and declarations deliberately changed by the target specs are transition evidence. |
| Manifest/introspection snapshots | Preserve provenance and traceability coverage. The hardcoded light/dark shape and old field vocabulary are intentionally replaced. |
| Export and package snapshots | Capability inventory and packaging locks, not an obligation to retain root helper names. |

When an exact snapshot mixes both categories, the migration updates the intentionally replaced spelling and adds a semantic assertion for the behavior that survives. It must not blindly re-record the whole fixture.

## 6. Preserve versus replace

### Preserve as behavior

- ordinary TypeScript evaluation in style modules;
- static CSS and no core runtime rule construction;
- staged graph inference, module composition, exact diagnostics, and graph-aware rename;
- CSS property/condition/layer typing and raw-selector/raw-CSS reach;
- recipes, anatomy, ports, atoms, Vue/Nuxt boundaries;
- emitted layer/debug/provenance behavior unless the target spec deliberately improves it;
- real browser, HMR, optimizer, process, and packaging gates;
- public CSS/custom-property output remaining understandable without vane.

### Replace as architecture/API

- color-specific rich IR plus minimal general `VaneCssValue` split;
- root free-function authoring surface;
- standalone canonical `createSystem` setup;
- `.live()` and `static | scheme | live | derived` as conflated semantic modes;
- implicit static/folded graph-edge classification for ordinary shorthand; the target default is an emitted var reference, while explicit `reference: 'val'` preserves the build-folded path;
- color-only scheme handling;
- unlayered hardcoded `:root` token emission;
- double prefix ownership;
- `theme`/`applyTheme` mechanism terminology;
- unprefixed token handle metadata;
- hardcoded light/dark manifest value shape;
- proposed CSSOM stylesheet mutation path.

## 7. Phase 0 baseline closure

Completed before the first value/type refactor:

- generated small/medium/large benchmark fixtures and stable drift check;
- compiler, declaration, editor, build, CSS, manifest, and package-size baselines;
- packed Vite/Nuxt fresh-app smoke;
- production browser, development/HMR, and repeated process/port lifecycle matrix; and
- explicit snapshot interpretation separating semantic/DX locks from replaced API/structure.

Phase 0 is complete. This file remains the immutable pre-refactor comparison point; Phase 1 acceptance and all later phase evidence are recorded in the [implementation plan](./dux-implementation-plan.md).
