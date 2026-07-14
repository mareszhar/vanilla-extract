updated: 2026-07-14
status: recorded implementation baseline — compare refactor phases against this evidence, not its API spellings

# vane-dux next — current baseline

This document records the implementation immediately before the semantic-foundation refactor. It is a preservation aid, not a target API specification.

## 1. Baseline identity

| Field | Value |
| --- | --- |
| Source commit | `b5c32c24` |
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

These are orientation numbers from one local run, not yet the stable small/medium/large performance baseline required by [testing](./dux-testing.md#6-performance-benchmarks).

## 3. Current package output

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

## 4. Characterization evidence already present

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

## 5. Preserve versus replace

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

## 6. Remaining pre-semantic-code baseline work

Before the first value/type refactor commit:

- add generated small/medium/large benchmark fixtures;
- record numeric editor completion/diagnostic/rename and declaration-size baselines;
- run and record the packed fresh-app smoke and current browser/dev matrix on the baseline commit;
- mark which exact snapshots are semantic preservation locks and which encode intentionally replaced spellings/structure.

These tasks remain phase 0 because the current test suite proves correctness well but does not yet provide durable type-performance comparison data.
