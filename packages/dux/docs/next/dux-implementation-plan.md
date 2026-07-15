updated: 2026-07-14
status: active migration ledger — phases 0–6 complete; phase 7 ready

# vane-dux next — implementation plan

This is the single execution ledger for the semantic-foundation refactor. It replaces the dated release initiative/review trackers. The target specs define behavior; this file defines safe order, preservation obligations, and completion evidence.

## 1. Status language

| Mark | Meaning |
| --- | --- |
| `☐` | Not started. |
| `◐` | In progress; not a completion claim. |
| `☑` | Contract, implementation, and required evidence are complete. |
| `—` | Deliberately deferred or removed, with rationale recorded. |

A phase may begin behind internal seams before its predecessor is fully promoted, but no public target API is considered complete while a dependency gate is red.

## 2. Migration rules

1. **No compatibility burden.** The package is unpublished; target API quality outranks preserving current spellings.
2. **Preserve proven behavior.** Existing graph typing, CSS reach, recipes, ports, browser integration, diagnostics, and provenance remain regression obligations unless explicitly replaced.
3. **Characterize before replacing.** Snapshot behavior worth preserving before changing its implementation.
4. **One semantic core.** Do not create parallel color/value/token runtimes that must be reconciled later.
5. **Dogfood public extensions.** Built-ins migrate through the same APIs promised to users.
6. **Keep current and target docs distinct.** Current docs remain implementation truth until promotion; target docs govern new work.
7. **No silent transitional public surface.** Internal adapters are allowed. Temporary public aliases require an explicit removal task and are avoided by default.
8. **Evidence moves with code.** A phase includes its type/editor/output/browser/introspection work.
9. **Do not rebuild the flagship demo early.** Focused fixtures validate architecture; the showcase follows stable capabilities.
10. **No publication during the transition.** Release gates reopen only after promotion.
11. **Preserve anti-mincho.** Every phase is an independently verifiable vertical slice; current tests, typecheck, build, demos, packaging, and maintained fresh-app smoke remain green at each phase boundary.
12. **Foundations use their final home.** Internal phase-1 value work is built on the engine kernel that phase 2 will expose, not on another temporary constructor architecture.

Every phase exit gate implicitly includes the permanent phase-boundary gate in `dux-testing.md`; it is not repeated in every checklist.

## 3. Phase overview

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Documentation, inventory, characterization, and performance baseline | ☑ |
| 1 | Unified typed CSS value IR and public extension contracts | ☑ |
| 2 | Canonical engine authoring environment and two-stage setup | ☑ |
| 3 | Token configuration, traits, handles, modules, and projections | ☑ |
| 4 | Axes, cases, roots, conditions, registrations, and emission order | ☑ |
| 5 | Mutable slots, runtime binding, custom-property APIs, SSR snapshots | ☑ |
| 6 | Ports, recipes, preset, aliases, scales, patterns, and framework adaptation | ☑ |
| 7 | Manifest, explain, audits, DTCG, and plugin portability | ☐ |
| 8 | Full integration matrix, packaging, documentation, and new flagship demo | ☐ |
| 9 | Canonical-doc promotion, cleanup, release rehearsal, and alpha decision | ☐ |

## 4. Phase 0 — foundation freeze and baselines

### Documentation

- [x] Establish `docs/next/` as target truth while current docs remain implementation truth.
- [x] Record the TypeScript-harness-for-CSS north star and four independent semantic dimensions.
- [x] Settle the canonical engine → system mental model.
- [x] Write target value, engine, token, runtime, language, pattern, testing, and decision documents.
- [x] Add a short pointer from current `dux-vision.md` to the next hub without making the current document nontruthful.
- [x] Mark the ideation note as historical and add the final resolution map.
- [x] Remove dated review/release/DX tracker files after every surviving requirement is represented here or in testing.
- [x] Resolve shorthand defaults, semantic engine identity, branch-handle parity, context-bound serialization, scheme/registration semantics, daily constructor access, optional axis order, slot naming, and runtime snapshot addressing.
- [x] Resolve additive snapshot reconciliation, authored/no-default runtime addresses, versioned system names, expression support/preview policy, per-arm scheme locality, plane-neutral batch entries, extension example identity, and resolution-generic performance risk.
- [x] Lock base no-default reservations, reserved-branch/native-scheme composition, canonical `ds.explain()` ownership, and the Phase 8 demo rebuild brief.

### Characterization

- [x] Record current public export/build/test snapshots for intentional comparison in `dux-current-baseline.md`.
- [x] Map existing characterization fixtures for current color IR, graph modes, theme/applyTheme, schemes, token manifest, roots/layers, ports, and system serialization.
- [x] Identify behavior to preserve versus architecture/API spellings intentionally replaced.
- [x] Capture current packed Vite/Nuxt smoke result and current production/dev/HMR/process matrix.

### Performance baseline

- [x] Add small/medium/large generated fixtures with a deterministic source-control drift check.
- [x] Record cold/incremental typecheck, declarations, completion, diagnostics, rename, build, CSS/manifest size, and runtime bundle baselines.
- [x] Add stable benchmark commands and ignored machine-readable protocol-1 artifacts.

### Exit gate

- The target documents cross-link cleanly and cover every ideation/review item.
- Current behavior worth preserving has characterization evidence.
- Performance regression budgets have real baseline numbers.
- No implementation refactor has begun under an unsettled semantic model.

Accepted 2026-07-14. The human baseline is recorded in `dux-current-baseline.md`; Phase 1 is unblocked.

## 5. Phase 1 — unified CSS value foundation

### IR

- [x] Create the internal engine kernel and its default configured instance before porting constructors.
- [x] Route existing package-root value helpers through compatibility adapters to that internal default engine.
- [x] Introduce data-type, expression, dependency, serialization, and optional fold traits.
- [x] Prototype generic and branded/erased resolution-context encodings; benchmark mixed self/system propagation before public value types depend on one.
- [x] Replace the minimal `VaneCssValue` string wrapper with the typed common interface.
- [x] Port the color expression graph into the common IR without behavior loss.
- [x] Port math/calc values and fix dimension compatibility for `min`, `max`, `clamp`, multiplication, and division.
- [x] Add literal/function/operation/var/raw/plugin/composite node support.
- [x] Preserve source/provenance through expressions.

### Data types and ergonomics

- [x] Implement the minimum data-type set from the value spec.
- [x] Add `length.px/rem/em`, angle/time/etc. unit constructors and configured bare constructors.
- [x] Preserve direct raw strings/numbers in compatible CSS contexts.
- [x] Add typed raw future-value constructors.
- [x] Add external `customProperty()` handles with `$name` and `$var(fallback?)`.

### CSS parity

- [x] Expand every color constructor to full accepted channel types.
- [x] Add per-channel token/custom-property refs.
- [x] Restrict `.in()` to operations with interpolation/working-space semantics.
- [x] Add mix hue policy and native grammar coverage.
- [x] Build capability tables and spec/WPT-derived tests.
- [x] Define stable versus experimental helper maturity policy.
- [x] Define the CI-locked default CSS support target and project override adapter.
- [x] Require every expression serializer to declare feature requirements and implement a proven fallback/enhancement or actionable folded-path diagnostic.

### Public extensions

- [x] Design `defineCssValue` and `defineCssOperation` through API fixtures.
- [x] Reimplement at least one simple and one advanced built-in through them.
- [x] Add engine/plugin identity, collision, serialization, and optional fold hooks.
- [x] Ensure extension authors do not import internal classes.

### Exit gate

- One value IR works in token, CSS, port, atom, keyframe, and runtime-input fixtures.
- Existing valid CSS remains accepted.
- Same-named helpers meet their declared capability tables.
- Build/preserved expressions are semantically locked.
- Performance stays within the accepted budget.
- Default var-reference output never silently exceeds the declared CSS support target.

Accepted 2026-07-14. Phase 1 is an internal vertical slice: the current package-root API remains available through the configured default-engine adapter, while Phase 2 will expose the canonical engine/system surface.

Acceptance evidence:

- `pnpm run sdk:test`: 49 files, 423 tests, and no type errors, including runtime, type, editor-DX, output, conformance, extension, and cross-plane value fixtures.
- `pnpm run validate`: lint, SDK/demo typecheck and builds, audit, 4 production browser tests, the development/HMR browser test, and 2 lifecycle repetitions passed.
- `pnpm run fresh:smoke`: the packed package passed strict TypeScript 5.8 Vite and Nuxt typecheck/build/dev/HTTP/HMR consumers, including the separate capabilities export.
- D62's 5,000-expression comparison rejected the propagated resolution generic: 1.25s TypeScript total time and 339,107 declaration bytes versus 0.77s and 279,177 bytes for the accepted branded/overloaded encoding.
- The final large generated fixture remained effectively level with the pre-refactor compiler baseline: 2.13s TypeScript total time, 2,163,567 instantiations, and 438,635 kB memory versus 2.15s, 2,163,934, and 442,321 kB. Editor result counts were unchanged; all medians remained under 4ms except the unchanged four-location graph rename at 25.41ms.
- Large-fixture CSS output was byte-identical to baseline. Manifest output increased from 1,663,780 B to 1,667,730 B (0.24%) for requirements/preview evidence.
- The build-only root entry grew from 108 kB to 156 kB unminified (19.7 kB to 27.9 kB gzip) for the common IR, constructors, serializers, extension APIs, and compatibility adapters. The browser runtime entry remained 10.2 kB / 2.14 kB gzip. Capability metadata is isolated in `@mszr/vane-dux/capabilities` at 4.89 kB / 1.13 kB gzip so ordinary consumers do not pay for the table. Phase 2 retains an explicit package-size watch while exposing the final engine surface.
- The common serializer now enforces the explicit D64 support target. Phase 3 owns applying that serializer to D47's new default var-reference token policy; the compatibility token surface does not pretend that migration has already happened.

Phase 2 is unblocked.

## 6. Phase 2 — canonical engine and system

### Engine

- [x] Implement `createEngine()` default authoring environment.
- [x] Expose the phase-1 engine kernel as public `createEngine()` rather than rehoming constructors a second time.
- [x] Implement deterministic semantic engine signatures from protocol, normalized policy, and stable plugin/extension identities; never use object equality for compatibility.
- [x] Define plugin configuration fingerprints and reject anonymous opaque extension semantics.
- [x] Implement immutable `.use()` and `.extend()` links.
- [x] Make built-ins/preset candidates consume public extension contracts.
- [x] Decide the minimal package-root exports: `createEngine`, public types, adapters/standards entrypoints.
- [x] Reject incompatible engine/module/value composition locally.

### System

- [x] Implement `de.createSystem()` as canonical finalization.
- [x] Remove double prefix ownership; system finalizes names once.
- [x] Preserve bound CSS/recipe/anatomy/port/atoms/global/keyframe/font APIs.
- [x] Re-expose configured value constructors/plugins directly on `ds` for one-import daily style authoring, while keeping definition/finalization methods engine-only.
- [x] Export/version the closed system-member and built-in-constructor reservation set; add namespaced extension conventions and collision diagnostics.
- [x] Add `root` and token-layer configuration without generic scope terminology.
- [x] Preserve build/app function serialization and framework boundaries.
- [x] Decide whether standalone `createSystem(de => ...)` remains deferred; do not ship both dialects by accident.

### Modules

- [x] Make engine-bound `defineTokens()` modules carry identity but no fake final names.
- [x] Preserve composition, immutable branching, checks, exact staged inference, and rename bridge.
- [x] Add module emission metadata normalization.

### Exit gate

- Canonical examples use one engine → one system dialect.
- External modules have exact engine helper and later axis typing.
- Current system styling behavior remains regression-green.
- Prefix/name identity cannot silently diverge.
- Equivalent HMR/package-duplicate engine instances compose; semantic changes fail locally.
- Style modules can use `ds.css`, `ds.t`, and configured value constructors from one import.

Accepted 2026-07-14. Phase 2 establishes the canonical public spine while D66 keeps the former package-root functions only as deprecated migration adapters until target-doc promotion.

Acceptance evidence:

- `pnpm run sdk:test`: 52 files, 441 tests, and no type errors. New runtime/type/editor/rename fixtures cover engine policy and identity, plugin fingerprints/prerequisites/collisions, immutable modules, incompatible value/module composition, system namespace separation, one-import constructor identity, root/layer output, manifest ownership, and canonical rename from both definitions and consumers.
- Generated declaration fixtures compile the ordinary `export const de = createEngine()` and `export const ds = de.createSystem(...)` forms without annotations or TS7056 expansion. The public declarations retain compact named `VaneCoreEngine`/`VaneCoreConstructors` references.
- The large 5,000-token fixture remained within compiler budgets: 2.06s TypeScript total time, 2,169,398 instantiations, and 385,618 kB memory versus the pre-refactor 2.15s, 2,163,934, and 442,321 kB. Declaration output was 396,788 B versus 396,933 B.
- The graph-aware rename bridge now prefilters impossible leaf spellings before semantic graph work. Large-fixture rename improved to 5.12ms from the pre-refactor 25.52ms while returning the same four locations; all completion/diagnostic result counts remained exact and CSS completion was 3.11ms.
- Canonical generated CSS remained effectively level at 205,932 B / 19,815 B gzip versus 205,924 B / 19,842 B. Manifest output was 1,667,819 B, a 0.24% increase over baseline for engine/root/layer/value-requirement provenance.
- The build-only root entry is 171 kB unminified / 31 kB gzip after exposing the engine, extension registry, system reservations, and transition adapters. The browser runtime entry remains 10.2 kB / 2.14 kB gzip, and the full distribution is 423 kB across 14 files.
- Packed strict TypeScript 5.8 Vite and Nuxt consumers use the canonical engine → module → system dialect, import only `ds` in style modules, and pass typecheck/build/dev/HTTP/HMR. The repository validation matrix remains green.

Phase 3 is unblocked.

## 7. Phase 3 — token traits, configuration, and handles

### Config

- [x] Implement raw shorthand plus `de.token({ ... })` branding.
- [x] Lock zero-config shorthand to `reference: 'var'`/`emit: true` and add engine-level `tokens` defaults.
- [x] Characterize the intentional shift from implicit static graph edges to CSS-reactive shorthand; prove explicit/engine-default `reference: 'val'` retains the folded path.
- [x] Implement `val`, `reference: 'val' | 'var'`, `emit`, `mutable`, `register`, `axes`, `cases`, metadata, and runtime validation fields as independent traits.
- [x] Add inference/diagnostics for implied/incompatible traits.
- [x] Implement bare `null`, typed `token.color()`/other no-default forms, and known `emit: false` values.
- [x] Remove `.live()` and old mode enum from the target public model.

### Handles

- [x] Rename public members to `$name`, `$val`, `$var(fallback?)`, `$description`, `$axes`, etc.
- [x] Make axis modes and cases branch handles on both plane-neutral and runtime-bound trees; expose `$val`/metadata without public private-slot names.
- [x] Type a mutable no-default base constructor as a runtime-addressable base handle without inventing a value sentinel.
- [x] Enumerate authored/reserved branch addresses exactly; omit unconfigured partial modes/cases from handle types.
- [x] Keep `$val` a property and `$var()` a fallback-accepting method.
- [x] Ensure the handle default serialization follows `reference`.
- [x] Preserve plane-neutral serialization across build/app boundaries.
- [x] Add readable public types/hover and no collision with user group keys.

### Projections

- [x] Implement `ds.tokensOf`, `ds.namesOf`, and `ds.varsOf` for modules, resolved subtrees, and composed tree selections.
- [x] Make name/var projection usable from configuration contexts without CSS emission.
- [x] Lock deterministic naming as a public contract.

### Exit gate

- Every token form has runtime/type/editor/output evidence.
- Current graph refactors and diagnostics remain credible.
- Name/var integration replaces the Hail/Nuxt mirrored registry use case.
- No old mode/liveness special case remains load-bearing.

Accepted 2026-07-14. Phase 3 replaces the target token language end to end while preserving the former package-root graph only as D66's internal migration adapter. Axis/case declarations are typed, recorded, projected, and restored across planes here; Phase 4 owns their condition model and CSS emission.

Acceptance evidence:

- `pnpm run sdk:test`: 56 files, 457 tests, and no type errors. Dedicated runtime, type, editor-DX, output, and rename fixtures cover shorthand/configured/no-default/nonemitted forms, local trait diagnostics, reactive versus folded graph edges, exact authored branches/cases, fallback-compatible `$var()`, default handle serialization, plane restoration, group-name collisions, support-target failures, and all three projections.
- Canonical engine/system values and token handles expose the target language only: engine color expressions no longer publish `.live()`/`.mode()`, resolved handles use `$name`/`$val`/`$var()`, and exact `$axes`/`$case()` branches preserve the same semantic address across build and app planes. Legacy aliases remain internal to the package-root regression adapter rather than load-bearing in canonical code.
- The generated benchmark corpus now exercises branded token config plus module/token/name/var projections. At 5,000 tokens, cold typecheck is 2.10s / 2,217,483 instantiations / 414,338 kB, incremental typecheck is 0.34s, declarations are 448,337 B, and four-location graph rename is 4.97ms. Against Phase 2, the added config/projection surface costs 1.9% total time, 2.2% instantiations, 7.4% memory, and 13.0% declaration bytes—inside every accepted budget.
- CSS-reactive shorthand emits platform expressions through the declared support policy; explicit or engine-default `reference: 'val'` retains inline/folded consumption. Deterministic projections reuse finalized graph identity without emitting CSS or maintaining a second name registry.
- Large-fixture CSS remains 205,932 B / 19,815 B gzip and manifest output is 1,669,859 B. The build-only root is 194 kB / 34.6 kB gzip; the richer cross-plane token/branch restoration raises the browser runtime to 15.7 kB / 3.04 kB gzip while keeping it framework-free.
- The permanent phase-boundary lint, SDK/demo typecheck/build, audit, browser/HMR/lifecycle, and packed Vite/Nuxt consumer gates remain green.

Phase 4 is unblocked.

## 8. Phase 4 — axes, roots, cases, registration, and emission

### Axes

- [x] Implement `.axes(context => record)` on the staged engine.
- [x] Use normalized declaration order by default; implement optional typed `.axisOrder(...)` with completeness/duplicate checks.
- [x] Implement axis/mode condition bindings, defaults, descriptions, and optional derivations.
- [x] Implement explicit trigger priority for overlapping conditions; built-in scheme preference loses to explicit selection.
- [x] Record native-element, root/subtree-selector, document-media, and absolute-selector locality per trigger arm; prohibit unacknowledged element-local degradation.
- [x] Decide exposure/requirement API without unchecked future dot paths: exact per-token axes ship; group `$axes` is explicitly deferred (D68).
- [x] Add built-in scheme and generic data-axis adapters.

### Token authoring

- [x] Implement complete single-axis maps, base plus partial maps, multiple axes, and sparse cases.
- [x] Accept `null` on mutable modes/cases as an explicit no-default address reservation; reject it on nonmutable branches.
- [x] Emit diagnostics for totality, duplicate cases, impossible modes, duplicate trigger/priority arms, and invalid precedence declarations.
- [x] Prototype group `$axes`; retain per-token axes after API/performance/error-locality evaluation (D68).
- [x] Add color-agnostic axes across arbitrary value data types.

### Roots/conditions

- [x] Implement system/module effective roots and composable group `$root`.
- [x] Implement root-anchored condition IR with self/ancestor/descendant/absolute placement.
- [x] Preserve bare styling conditions and selector/at-rule reach.
- [x] Reserve actual `@scope` support and terminology.
- [x] Surface resolved emission contexts in diagnostics/manifest.

### Emission

- [x] Establish token sublayers before declarations.
- [x] Guarantee base → ordered axes → cases → overrides.
- [x] Add optional color-only native `light-dark()` optimization behind support/toolchain policy.
- [x] Cover reserved light/dark branches in both native `light-dark()` and selector emission, including their slot fallback chains.
- [x] Implement `@property` registration with inferred syntax and validity checks.
- [x] Model element-local versus root-bound scheme selection; reject typed registration that would silently freeze element-local `light-dark()` behavior.
- [x] Ensure unlayered consumer CSS and system override layers behave predictably.

### Exit gate

- Full axis/root/order browser and output matrices pass.
- Import order cannot change semantics.
- Mutable-compatible binding placement is defined before runtime slot implementation.
- Scheme is no longer a hardcoded color/light/dark graph shape.

Accepted 2026-07-14. Phase 4 turns the Phase 3 branch vocabulary into a deterministic environmental compiler: axes are immutable engine stages; roots and conditions resolve before emission; exact modes/cases lower to ordered layers; registration and mutable reservations obey platform computed-value rules; and scheme is one built-in adapter over the general model.

Acceptance evidence:

- Dedicated runtime/type/editor/output fixtures cover staged identity, exact axis/mode/case completion, exhaustive `.axisOrder()`, eager self-contained defaults/derivations, totality/type/case diagnostics, duplicate trigger arms, composable group roots, all condition placements/query mechanisms, registration validity, base/branch reservations, and opaque noncyclic slot fallbacks.
- Output declares `<prefix>.tokens.base`, one sublayer per normalized axis, cases, and overrides before declarations. Nonmutable branches write the public property directly so descendant/absolute selectors retain local cascade semantics; only root-safe mutable multi-axis fallback chains use private stages. Axis priority/mode order and case placement are independent of module import order; non-color scheme values correctly use selector/media arms because CSS `light-dark()` is color-only.
- Inspection records the full ordered axis registry plus per-arm mechanism/locality/priority and every token's resolved base/native/axis/case declaration context. Canonical axis types are exported for plugins and tooling.
- The Nuxt Chromium fixture proves real computed behavior: element-local light/dark descendants diverge from one custom-property token, a group root responds to density, a sparse density/emphasis case wins after both triggers change, and `@property` registration reaches the live CSSOM.
- The generated corpus now scales from 2 to 4 axes and benchmarks axis/case completion. At 5,000 tokens: 2.23s TypeScript total time, 2,216,611 instantiations, 573,904 kB reported memory, 445,681 B declarations, 5.39ms graph rename, 204,640 B CSS (20,109 B gzip), and 2,413,399 B manifest. D70 records the sole >20% Phase 3 delta—the exact-axis/case TypeScript memory peak—while time, instantiations, declarations, and editor latency remain inside their accepted budgets.
- Permanent phase-boundary gates pass: lint and audit are clean; SDK plus both demos typecheck/build; 60 SDK files and 475 tests pass with zero type errors; five production-browser tests, the Nuxt dev/HMR test, and both lifecycle repetitions pass; generated benchmark fixtures match their generator; and packed fresh Vite/Nuxt consumers pass strict types, production build, HTTP, HMR, and lifecycle checks.

Phase 5 is unblocked.

## 9. Phase 5 — mutable runtime and custom properties

### Generic lane

- [x] Implement `setCustomProperty`/`setCustomProperties` for explicit DOM/style targets and external/vane handles.
- [x] Do not overload selectors as implicit stylesheet injection.
- [x] Reject selector query convenience on `ds.runtime()`; accept explicit targets and omitted `documentElement` only for `:root` systems (D71).

### Mutable slots

- [x] Emit uniform base slots for every `mutable: true` token (compiler half completed in Phase 4).
- [x] Emit a public binding and empty base slot for typed mutable no-default tokens; let unregistered bindings remain invalid-until-set and registered `initial-value` supply the platform default (compiler half completed in Phase 4).
- [x] Emit addressable mode/case slots and public bindings (compiler half completed in Phase 4; runtime resolution remains below).
- [x] Emit no authored slot value for reserved `null` branches and compile a noncyclic fallback to the previously effective expression.
- [x] Keep slots inheritable/unregistered and public registration separate.
- [x] Serialize slot provenance into plane-neutral runtime metadata.
- [x] Keep private slot spelling opaque/non-normative and resolve it only from semantic token/branch addresses.
- [x] Implement `$set()` and `$unset()` on runtime-bound base/mode/case handles.
- [x] Validate substitution-point/root invariants in compiler and runtime.

### Runtime binding

- [x] Implement `ds.runtime(root?)` and runtime-bound token tree.
- [x] Keep `ds.t` plane-neutral without misleading no-target setters.
- [x] Implement `applyTokenOverrides()` with an ergonomic base-tree form and explicit mutable-handle tuple entries for base/mode/case batches.
- [x] Accept same-system plane-neutral `ds.t` handles canonically in tuple entries and reject other-system/unauthored handles locally.
- [x] Implement `setMode`/clear and built-in scheme convenience.
- [x] Add Standard Schema-compatible optional setter validation with sync semantics and stable cross-plane validator IDs (D72).

### SSR/persistence/HMR

- [x] Implement snapshot v1 with deterministic system schema ID, semantic `{ token, address, val }` base/axis/case records, and runtime-managed modes.
- [x] Normalize `$set()`, both `applyTokenOverrides()` forms, `$unset()`, SSR projection, and hydration through the same record set.
- [x] Implement per-entry schema reconciliation and `ds.reconcileRuntimeSnapshot()`; preserve valid entries across additive schema changes.
- [x] Reserve wholesale rejection for unreadable/unsupported snapshot protocol versions; emit exact migration diagnostics for skipped entries/modes.
- [x] Implement server-side snapshot → inline custom-property projection.
- [x] Implement snapshot → root style/attribute projection so runtime-managed modes also paint before hydration.
- [x] Implement hydration/rebind without flash or redundant writes.
- [x] Integrate and lock the Nuxt SSR payload/root style path through the framework-neutral `runtimeProps()` contract.
- [x] Preserve compatible overrides through HMR by semantic address, reconcile additive contracts, and supersede stale controllers (D73).

### Exit gate

- No core runtime CSS rule construction exists.
- Base/mode/case changes and reset work in real browsers across document/widget/shadow policies.
- Persisted SSR overrides paint correctly before hydration.
- Runtime types/validation/metadata and bundle budgets are green.

Accepted 2026-07-14. Phase 5 completes the platform-native mutation plane: core writes only inline custom properties and runtime-selectable attributes; mutable public bindings continue to live in extracted CSS; every runtime operation addresses a semantic token branch and the browser remains responsible for cascade and recomputation. The overlooked Phase 4 tracker gap was also closed: canonical `ds.tokenOverride()` now emits into the final token sublayer, retains exact tree typing/re-resolution, and records its emitted token paths; `theme` remains only as D66's compatibility adapter.

Acceptance evidence:

- Runtime/type/editor/Vite fixtures cover explicit HTML/SVG custom-property writes, omitted `:root` binding, exact mutable base/mode/case trees, same-system plane-neutral batches, other-system rejection, runtime axis adapters, `$unset()` reset, no-default reservations, all three invalid-value policies, async-schema rejection, app-plane validator registries, semantic snapshot ordering, additive/removed/unauthored reconciliation, protocol rejection, inspection provenance, compatible rebind, and stale-controller failure.
- The production Nuxt browser fixture paints an SSR-projected dark-mode base/branch snapshot before hydration, performs zero redundant private-slot writes, proves base/dark/case reset paths, switches density, isolates sibling widgets, inherits through a shadow host, binds a `:root` document runtime, and writes an external SVG custom property. Snapshots contain semantic addresses and never private slot names.
- The Nuxt dev fixture preserves an inline mutable override through a compatible authored-default CSS HMR update without reloading the document; unit evidence covers additive-contract rebind and exact schema diagnostics. Core runtime contains no stylesheet/CSS-rule construction.
- At 5,000 tokens, TypeScript total time is 2.19s, instantiations 2,217,932, reported memory 576,569 kB, declarations 447,192 B, runtime completion 0.11ms, and graph rename 5.41ms—effectively level with Phase 4. Typical mutable coverage emits 206,918 B CSS / 20,863 B gzip and a 2,418,729 B manifest.
- D74 records the deliberate runtime capability cost: the framework-free browser entry is 41,737 B / 7.53 kB gzip, the build-only root is 267,841 B / 46.8 kB gzip, and the large built application fixture carries 12,877 B / 2,775 B gzip JavaScript. This is the new regression baseline rather than an unexamined exception.
- The permanent phase-boundary lint, type, SDK/demo build, browser/HMR/lifecycle, generated-fixture, benchmark, audit, and packed-consumer gates remain green.

Phase 6 is unblocked.

## 10. Phase 6 — adjacent surfaces and ergonomics

### Ports

- [x] Move ports to the common value/data-type serializer.
- [x] Retire `as` in favor of branded values.
- [x] Add Standard Schema options with explicit `false | 'dev' | 'always'` validation and non-write invalid policies.
- [x] Reject async schemas for synchronous setters unless a separate API is justified.
- [x] Preserve port defaults, style fragments, recipes publication, Vue reactivity, and SSR.
- [x] Document port versus mutable-token ownership.

### Recipes/Vue

- [x] Preserve recipes, toggles, compound/defaults, anatomy, headless conditions, call-site strictness, and published ports.
- [x] Add `fromTokenGroup()` only after a real recipe fixture proves repeated value.
- [x] Preserve/refine object-key `propsOf()` namespacing.
- [x] Adapt `usePorts` and runtime helpers to common serializers/validation.

### Engine plugins and conveniences

- [x] Implement property alias plugin with `both`/`aliases-only` completion policies and standards/raw escape.
- [x] Rebuild elevation and optional BEM/nonstandard conventions as public plugins/preset utilities.
- [x] Generalize scales to callable step access plus token generation; define negative/fractional behavior.
- [x] Implement `fluid()` on a general typed interpolation primitive with monotonic validation.
- [x] Separate layout patterns from style-fragment utilities; expand only through proven repeated use.
- [x] Preserve base/custom-property relationship patterns without inventing another primitive.

### Exit gate

- Existing recipe/port/Vue/preset contracts remain green.
- Plugins receive exact IntelliSense and no private privileges.
- Alias strictness never removes CSS capability.
- Convenience additions have real use fixtures, not speculative surface alone.

Accepted 2026-07-14. Ports now serialize through the finalized system, carry exact CSS data types, bind synchronous Standard Schema validators explicitly across planes, and never return an invalid write. Recipes and Vue retain their prior contracts while adding token-group generation and object-key namespaces. Optional aliases, elevation, and BEM use the public plugin protocol; scales are callable, interpolation is general, and declaration conveniences remain plain fragments rather than a second styling runtime.

Acceptance evidence:

- Runtime/type/editor/output fixtures cover branded port defaults and setters, restored validator binding, false/dev/always validation, throw/fallback/omit non-write policies, async rejection, recipe-published ports, `fromTokenGroup()`, exact object-key `propsOf()` namespaces, both/aliases-only completion, standards escape, alias collision diagnostics, callable negative/fractional scales, monotonic fluid interpolation, public elevation/BEM plugins, and fragment utilities.
- Property aliases finalize the typed engine configuration after axes/other plugins (D82). This preserves exact alias/standard completion while keeping the ordinary engine's TypeScript graph at its pre-plugin cost; runtime normalization still uses the common compiler and no plugin receives private access.
- The full SDK passes 70 files / 513 tests with zero type errors. SDK and both demos typecheck; the generated benchmark corpus matches its source-controlled generator.
- At 5,000 tokens, TypeScript total time is 2.17s, instantiations 2,217,780, reported memory 583,562 kB, declarations 447,372 B, CSS completion 2.83ms, runtime completion 0.11ms, and graph rename 5.51ms—effectively level with Phase 5. Application output remains 206,918 B CSS / 20,863 B gzip, 12,877 B JavaScript / 2,775 B gzip, and a 2,418,729 B manifest.
- The build-only root is 276,493 B and the framework-free runtime is 42,689 B; both remain within the accepted Phase 5 capability budgets while adding the Phase 6 surfaces.

Phase 7 is unblocked.

## 11. Phase 7 — introspection and interchange

### Manifest/explain

- [ ] Replace `{ light, dark }` manifest shapes with declaration provenance.
- [ ] Record data types, expressions, fold decisions, reference inference, axes/cases, roots, layers, registrations, mutable slots, and portability.
- [ ] Record emitted feature requirements, fallback/enhancement path, and resolved preview or preview-unavailable reason.
- [ ] Implement `ds.explain(token)` structured output and devtools projection.
- [ ] Add specificity/context audits and runtime override inspection.
- [ ] Preserve exact class/style-call/source/token provenance.

### DTCG

- [ ] Implement `importDesignTokens` and `exportDesignTokens`.
- [ ] Implement resolved environment snapshots.
- [ ] Define `com.mszr.vane-dux` authored extension schema/version.
- [ ] Preserve unknown extensions and aliases where representable.
- [ ] Add optional plugin codecs and strict lossless failure for nonportable nodes.
- [ ] Keep external network reference resolution opt-in.

### Agent/docs tooling

- [ ] Generate capability/manifest context suitable for agents without duplicating specs.
- [ ] Update audits for raw assertions, nonportable plugins, ambiguous axes, mutable root hazards, and alias escapes.

### Exit gate

- Every emitted/runtime value is explainable from source to context.
- Vane-authored portable systems round-trip semantically.
- Standard resolved DTCG snapshots interoperate without claiming unsupported modes.

## 12. Phase 8 — integration, packaging, docs, and demo

- [ ] Run and fix the full Vite/Nuxt dev/prod/HMR/SSR/process matrix.
- [ ] Verify modern CSS through supported optimizers.
- [ ] Run packaging/fresh-app gates from the tarball.
- [ ] Compile every next-doc example against the package.
- [ ] Update Vue/Nuxt/public README guidance to the canonical engine → system setup.
- [ ] Rebuild the flagship demo from the later maintainer prototype/brief rather than refactoring the current color-picker concept.
- [ ] Follow `dux-demo-brief.md`: a polished Prism design-system studio with live monochromatic hue/palette, light/dark/system scheme, radius, density, scheme+density shadows, elevation, fonts, and none/subtle/springy motion.
- [ ] Demonstrate axes, cases, non-color mutability, media/container queries, responsive composition, ports, plugins, raw CSS reach, provenance, SSR persistence, and custom-property integration.
- [ ] Keep Pug as the demo workspace convention if still desired.
- [ ] Rebuild the comparison demo around a smaller parity-friendly concept, then re-run maintained peer comparisons using current official sources.
- [ ] Walk every next delight-gauntlet moment and link evidence.

### Exit gate

- A fresh adopter sees one setup dialect and truthful documentation.
- The demo illustrates capability without becoming the source of architectural requirements.
- Every integration/package/performance gate in `dux-testing.md` is green.

## 13. Phase 9 — promotion and cleanup

- [ ] Reconcile/copy unchanged current domain spec details into the target set.
- [ ] Replace canonical vision/language/patterns/specs with the implemented target docs.
- [ ] Remove superseded old sections and all temporary compatibility notes.
- [ ] Remove `docs/next/` by promoting its contents and updating links.
- [ ] Remove the historical ideation note or archive it outside normative docs according to maintainer preference.
- [ ] Verify no status table claims more than tests prove.
- [ ] Run complete release rehearsal without publishing.
- [ ] Decide alpha timing from evidence and desired API feedback.

## 14. Current-document migration map

| Current document | Migration |
| --- | --- |
| `dux-vision.md` | Replace product framing with TypeScript harness for CSS; preserve compiler/fork/plane/framework rationale; update gauntlet and domains. |
| `dux-language.md` | Replace root free-function and theme/liveness vocabulary; preserve naming discipline, anatomy/port/recipe terms, and CSS-aligned mapping practice. |
| `dux-patterns.md` | Preserve evaluation, parser/type split, layers, variants, escapes, boring CSS, diagnostics, and agent legibility; replace liveness/theme boundary with four traits and mutable slots; distinguish ports. |
| `dux-spec-tokens.md` | Major rewrite through next token spec. Preserve staged graph, modules, checks, metadata, rename, and explicit preset edges. |
| `dux-spec-css.md` | Update canonical setup, common value language, root-anchored conditions, token layers, aliases/standards lane; preserve daily CSS surface. |
| `dux-spec-ports.md` | Preserve behavior; migrate values/validation and clarify ownership versus mutable tokens. |
| `dux-spec-recipes.md` | Preserve; add `fromTokenGroup`, refined `propsOf`, and common value/plugin typing where proven. |
| `dux-spec-preset.md` | Preserve deletable preset/atoms/a11y/motion; implement opinions through public plugins; reorganize pattern versus utility taxonomy. |
| `dux-spec-vue.md` | Preserve overlays/SSR/HMR; adapt runtime snapshots, mutable token binding, and validation. |
| `dux-spec-introspection.md` | Major manifest update; preserve class/source provenance and audits. |
| `dux-workspace.md` | Preserve workspace/fork/release mechanics; replace testing section with link/summary of permanent testing doc and add benchmark commands. |
| `dux-dx-benchmark.md` | Removed; permanent comparison questions and performance scenarios live in `dux-testing.md`. |
| `dux-release-initiative.md` | Removed; active tasks live only in this implementation plan. |
| `dux-review-2026-07.md` | Removed after its historical findings were represented by permanent regression gates. |

## 15. Ideation resolution map

| § | Original proposal | Final destination |
| --- | --- | --- |
| 1 | CSS/W3C alignment | Vision promise; same-named parity and typed raw future syntax. |
| 2 | Two setup stages | Canonical `createEngine()` → `de.createSystem()`; no intermediate stage. |
| 3 | Modularity/type locality | Engine-bound modules; `tokensOf`/`namesOf`/`varsOf`; performance benchmarks. |
| 4 | Terminology | Token overrides/custom properties; literal/raw; root/condition/context; no primitive theme/CCP/generic scope. |
| 5 | Data-type brands | Common value IR with ergonomic optional brands. |
| 6 | Token metadata | `token({ val, reference, emit, mutable, axes, register... })`; `$` only in shared user namespaces. |
| 7 | Configurable engine | Public staged `.use`/`.extend`; deterministic semantic signature; built-ins dogfood it. |
| 8 | BEM/elevation/nonstandard color | Optional plugins/preset utilities. |
| 9 | Full color composition | Shared value IR, full CSS channel grammar, correct interpolation controls. |
| 10 | Scales/fluid | Callable scales plus token generation; typed general interpolation/fluid helper. |
| 11 | Axes | Engine axes, typed order, partial/complete maps, sparse cases, generic values. |
| 12 | Emission scope/order | Effective roots, explicit condition anchoring, token sublayers, system prefix ownership. |
| 13 | Platform levers | Opt-in valid `@property`, deliberate `:where`, true `@scope`, custom-ident values. |
| 14 | Null/integration | Null sugar, typed no-default tokens, system-bound projections, `$var(fallback)`. |
| 15 | Runtime value updates | Generic explicit-target custom-property lane plus runtime-bound mutable token lane. |
| 16 | Runtime stylesheet ownership | Reject extracted-rule mutation; preserve provenance; use slots; optional explicit runtime sheet only if justified. |
| 17 | Port validation | Common brands/serializer; optional sync Standard Schema validation; clear invalid policies. |
| 18 | Custom-property base pattern | No new primitive; document constants, ports, and local CSS custom properties. |
| 19 | `rawVar` | `customProperty(name).$var(fallback)`; optional one-shot sugar only if earned. |
| 20 | Property aliases | No core aliases; fully typed configurable plugin with standards/raw escape. |
| 21 | `fromGroup` | `fromTokenGroup()`. |
| 22 | `propsOf` | Preserve object-key namespacing. |
| 23 | Patterns/mixins | Separate layout patterns and style-fragment utilities; avoid misleading mixin terminology. |
| 24 | Custom utility authoring | Stable public value/operation/style extension contracts used by built-ins. |
| 25 | DTCG | Resolved standard snapshots plus vane extension; optional plugin codecs; semantic portability. |
| 26 | `&` selectors | Explicit documentation/tests; root anchoring becomes foundational. |
| 27 | Port runtime checks | Structured dev/runtime diagnostics through shared validation policy. |
| 28 | Pug demos | Workspace-only preference; apply when demos are rebuilt. |

## 16. Preserved July-review gates

The historical review files are removed, but these requirements remain permanent:

- graph-typed derivations and graph-aware rename must not regress;
- Nuxt dev/reload/HMR/browser/process behavior remains a real matrix;
- valid modern CSS must survive supported optimizers without noisy incompatible transforms;
- source transforms remain syntax-aware with adversarial fixtures;
- diagnostics carry stable codes and trustworthy source locality;
- explicit imports remain canonical where auto-import magic is less reliable;
- packaging, fresh-app tarball smoke, and delight-gauntlet evidence stay release blockers;
- the preset/core boundary keeps opinions deletable;
- demos are behavior-tested, not accepted because they render once.

## 17. Work that must not sneak into early phases

- Rebuilding the flagship visual demo before stable APIs.
- Adding broad new pattern libraries before public extension contracts exist.
- Publishing compatibility adapters for the old unpublished API.
- Implementing DTCG before the canonical graph/axes IR can round-trip.
- Adding runtime stylesheet mutation as a shortcut around slot/root design.
- Optimizing emitted CSS before semantic/output baselines exist.
- Treating future CSS syntax as invalid because the first-party parser lacks a helper.

## 18. Implementation-readiness review resolution map

This table makes the July 14, 2026 plan-polish review auditable rather than relying on conversation history.

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | Shorthand `reference`/`emit` default missing | D47; token spec §1; zero-config `var`/emit default plus configurable engine policy and explicit folded path. |
| 2 | Engine identity unsafe under HMR/duplicate installs | D48; engine spec §3; deterministic semantic signature, stable plugin identities, separate runtime schema ID. |
| 3 | `$axes` value/handle contradiction | D49; token spec §2.1; branch handles on both planes, runtime adds effects only. |
| 4 | Context-free `VaneValue.css` impossible | D50; value spec §1; `de.serialize` for self-contained values and `ds.serialize` for finalized context. |
| 5 | Typed registration can freeze `light-dark()` | D51; token spec §8.4/runtime spec §6; element-local default, root-bound opt-in, incompatible registration diagnostic, browser matrix. |
| 6 | Daily `de` plus `ds` authoring tax | D52; engine spec §12.1; finalized systems re-expose configured value constructors/plugins. |
| 7 | Anti-mincho migration law disappeared | D53; migration rule 11 and testing §1.1; every phase boundary stays green and independently verifiable. |
| 8 | Phase-1 constructors lacked their final home | D54; phase 1 IR tasks; internal engine kernel first, root helpers as temporary adapters. |
| 9 | `.axisOrder()` imposed common-case ceremony | D22; engine spec §4.2; declaration order default, exhaustive typed override optional. |
| 10 | Illustrative private slot names conflicted | D55; token/runtime slot sections; one non-normative illustration and opaque metadata-owned addresses. |
| 11 | Snapshot and batch mode/case addressing could diverge | D56; runtime spec §§7/11; one semantic base/axis/case record model for setters, batches, SSR, hydration, and reset. |
| 12 | Schema mismatch could wipe otherwise valid persisted state | D57; runtime spec §11.1; per-entry reconciliation, protocol-only wholesale rejection. |
| 13 | `$set()` addressability of unauthored branches was implicit | D58; token spec §§2.1/5.5; exact authored/reserved handles and mutable `null` reservations. |
| 14 | Flattened system constructors risk future name theft | D59; engine spec §12.2; closed versioned core list, namespaced extensions, breaking-addition policy. |
| 15 | Var-default output raises the CSS-expression floor | D60; value spec §13/token spec §1; target gating, folded-path diagnostics, resolved previews. |
| 16 | Element-local scheme meaning varied by trigger mechanism | D61; engine spec §4.4; explicit per-arm locality and fallback-degradation rules. |
| 17 | Runtime tuple batches redundantly required `runtime.t` | D56; runtime spec §7; same-system plane-neutral `ds.t` handles are canonical. |
| 18 | Anonymous `.extend()` example implied opaque semantics were portable | Engine/language staged-extension examples now use stable `{ id, version }` ownership. |
| 19 | Resolution propagation could become a hidden TypeScript cost | D62; value spec §1/testing §6; dedicated mixed-resolution benchmark and cheaper-encoding escape. |
| 20 | Base no-default runtime reservation was only implicit | Token spec §§1.3/5.5; testing §4; explicit typed base form, `@property initial-value` interaction, and phase-3/5 fixtures. |
| 21 | Reserved branch plus native scheme output was untested | Testing §4; phases 4/5; native `light-dark()` and selector fallback-chain fixtures. |
| 22 | Introspection spelling drifted from the reserved system surface | D59; token/value/pattern/testing specs; `ds.explain()` is canonical. |
| 23 | Demo migration could preserve the obsolete concept by accident | D63; `dux-demo-brief.md`; Phase 8 is a deliberate flagship/comparison rebuild. |
