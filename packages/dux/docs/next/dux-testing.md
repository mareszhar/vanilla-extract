updated: 2026-07-14
status: permanent verification strategy — applies during and after the refactor

# vane-dux — testing and benchmarks

This document replaces the dated DX benchmark, release initiative, and July 2026 review as the permanent evidence policy. Historical findings were useful; their lasting value is a set of reproducible gates, not another status narrative.

## 1. Evidence rule

A contract is complete only when every relevant observation plane is green.

| Plane | Typical suffix/artifact | What it proves |
| --- | --- | --- |
| Runtime | `*.test.ts` | Graph evaluation, serializers, recipes, setters, validation, snapshots, diagnostics. |
| Type | `*.test-d.ts` | Accepted/rejected shapes, inference, trait propagation, axis/mode keys, runtime honesty. |
| Editor DX | `*.dx.test.ts` | Completion, hover, rename, source locality, diagnostic count/message/range. |
| Output | `*.out.test.ts` | Exact CSS functions, selectors, layers, registrations, slots, source/debug metadata. |
| Conformance | spec/WPT-derived fixtures | Same-named CSS helper grammar and semantics. |
| Browser | Playwright | Actual cascade, inheritance, computed values, interactions, first paint, accessibility. |
| Integration | Vite/Nuxt dev and production | Virtual CSS, HMR, SSR, optimizer survival, process cleanup. |
| Packaging | packed fresh apps | Export map, declarations, peers, side effects, tarball contents, real consumer resolution. |
| Introspection | manifest/audit snapshots | Provenance, axes/cases, slots, portability, source mappings, actionable audits. |
| Performance | benchmark fixtures | Completion, diagnostics, typecheck, build, output, manifest, and runtime budgets. |
| Documentation | compiled snippets | Public examples describe the package that actually ships. |

Unit coverage cannot substitute for browser cascade behavior. Browser success cannot substitute for editor diagnostics. A green repository build cannot substitute for installing the tarball in a clean app.

### 1.1 Phase-boundary gate

The anti-mincho constraint applies throughout the migration: every accepted phase is an independently verifiable vertical slice. At each phase boundary, the current public suite, typecheck, build, demos, package dry-run, and maintained fresh-app smoke remain green through temporary internal adapters where necessary. A foundational phase may expose no premature target API, but it may not leave mainline intentionally broken while waiting for later phases.

Target evidence added by the phase must also be green. Promotion-only matrices may run less frequently during a phase, but none may be knowingly red at phase acceptance.

## 2. Fixture families

Maintain one vocabulary across fixtures while varying scale.

### 2.1 Micro fixtures

One feature and one failure. Used for exact types, diagnostics, serialization, and CSS output.

### 2.2 Prism

The shared representative design system. It exercises colors, lengths, axes, recipes, anatomy, ports, mutable tokens, overrides, aliases, and manifest provenance without becoming an application demo.

### 2.3 Scale fixtures

Generated but source-controlled definitions at three sizes:

| Size | Target shape |
| --- | --- |
| Small | ~50 tokens, 2 axes, 5 recipes. |
| Medium | ~500 tokens across 10 modules, 3 axes, 30 recipes/anatomies. |
| Large | ~5,000 tokens across 50 modules, 4 axes, 150 style/recipe consumers. |

The exact counts may change once representative real systems are measured, but benchmark names and historical result storage remain stable.

### 2.4 Fresh applications

Strict Vite and Nuxt apps install the packed package with no repository aliases, workspace links, or generated artifacts copied from the monorepo.

### 2.5 Browser applications

Keep a focused Nuxt flagship and a small comparison/integration fixture. The flagship may be rebuilt later; architecture completion never depends on its visual concept.

Phase 8 follows the separate [demo brief](./dux-demo-brief.md). Until the rebuilt flagship and comparison fixture replace their evidence, the existing demos remain phase-boundary regression gates rather than templates to migrate literally.

## 3. Value conformance

Every same-named CSS helper receives a capability table and fixtures for:

- literals and ergonomic primitive shorthand;
- every accepted CSS channel/data-type category;
- typed token/custom-property references;
- nested calculations;
- valid raw future syntax;
- invalid/incompatible types;
- serialization form;
- build fold versus preserved CSS expression;
- feature requirement versus configured support target;
- proven fallback/enhancement or actionable `reference: 'val'` diagnostic when outside target;
- browser computed value when stable to assert;
- optimizer/toolchain survival.

Authoritative CSS specifications and relevant Web Platform Tests are the source of cases. Copy only minimal cases needed to establish the contract and record their provenance; do not create a divergent grammar by intuition.

Color coverage includes every shipped constructor, interpolation space/hue policy, relative channel form, missing component, alpha form, gamut-sensitive preservation, and native/fallback capability ceiling.

Math coverage includes additive compatibility, multiplication/division, mixed dimensions, `min`/`max`/`clamp`, precedence, and context rejection.

## 4. Token and axis matrix

Test each data type against:

- zero-config raw shorthand (`reference: 'var'`, `emit: true`);
- an engine-configured shorthand policy;
- configured `reference: 'val'`;
- configured/inferred `reference: 'var'`;
- downstream shorthand derivation remains CSS-reactive, while explicit/engine-default `reference: 'val'` produces the build-folded counterpart;
- null and typed no-default token;
- known `emit: false` value;
- registration;
- element-local scheme plus typed registration rejection;
- element-local scheme plus universal-syntax registration preservation;
- explicitly root-bound scheme plus registration;
- mutable base slot;
- typed mutable no-default base reservation, both unregistered/invalid-until-set and registered with `initial-value` as its effective default;
- one complete axis;
- base plus partial axis;
- multiple independent axes in each order;
- explicit sparse case;
- mutable base/mode/case set and unset;
- explicit-target external/vane custom-property writes on HTML, SVG, and `CSSStyleDeclaration`-like targets;
- Standard Schema transformed output plus `throw`/`fallback`/`omit`, missing app-plane registry, and async-schema rejection;
- authored/reserved branches appear in handle types while omitted partial modes and unauthored cases do not;
- mutable `null` mode/case reservation has no authored slot value, accepts `$set()`, and `$unset()` restores the prior effective expression;
- native scheme output composes a reserved branch fallback inside `light-dark()` and selector emission preserves the equivalent fallback behavior;
- module composition/derivation;
- token override class;
- resolved environment snapshot;
- manifest and DTCG projections;
- resolved expression preview or explicit preview-unavailable reason in manifest/`ds.explain()`.

Root/condition output matrix:

- system `:root`;
- system widget root;
- module root;
- group root if shipped;
- same-element `&[data-*]`;
- ancestor `[data-*] &`;
- descendant `& [data-*]`;
- absolute selector;
- media/supports/container wrappers;
- combinations and `@scope` when supported;
- mutable substitution-point accepted and rejected placements.

Order matrix:

- base before every axis;
- axes follow declared order, not import order;
- cases after axes;
- explicit application triggers beat preference triggers;
- native preference arms preserve consuming-element locality and nested `color-scheme` changes;
- root-anchored attribute/class arms preserve independent nested-root selection;
- media-query selector fallbacks are asserted/documented as document-global and never mislabeled element-local;
- unsupported element-local fallback either diagnoses or requires an explicit degraded/root-bound policy;
- declaration order is the default axis order;
- exhaustive `.axisOrder()` overrides declaration order and rejects omissions/duplicates;
- override class/runtime public behavior follows declared policy;
- consumer unlayered CSS retains expected platform precedence.

## 5. TypeScript/editor DX contract

For every new public API, lock:

- completion items and their order/relevance at the authoring site;
- exactly one useful diagnostic for common mistakes;
- diagnostic range on the offending key/value;
- readable hover free of internal conditional-type walls;
- definition and references across token modules;
- rename from definition and consumer;
- unrelated graph/engine isolation;
- no `undefined` pollution in valid staged callbacks;
- engine/axis/plugin literal preservation without `as const` ceremony;
- semantically equivalent engine instances compose across HMR/package duplication while incompatible signatures fail locally;
- plane-neutral and runtime `$axes`/`$case()` paths both return branch handles, with side effects present only on mutable runtime branches;
- `applyTokenOverrides()` tuple entries accept same-system plane-neutral handles and reject different-system/unauthored addresses locally;
- narrow runtime setters for mutable base/mode/case handles;
- standards lane availability under aliases-only policy.

System namespace fixtures lock the exported reserved-member set, namespaced plugin convention, constructor/plugin/system collision diagnostics, and the rule that an unreserved core top-level addition is a system-surface version change.

Type tests that merely assert assignability are insufficient for APIs whose product claim includes completion, rename, or error locality.

## 6. Performance benchmarks

Record cold and warm results with environment metadata. Benchmarks are comparative gates against the previous accepted implementation on the same machine/CI class, not universal marketing numbers.

Required measurements:

- `tsc --noEmit` cold and incremental;
- declaration emit time and `.d.ts` size;
- TypeScript `--extendedDiagnostics` instantiation count and memory for value graphs;
- completion latency at root tokens, deep groups, axes, cases, `css()` properties, and aliases;
- diagnostic latency after a one-character typo;
- rename latency across composed modules and consumers;
- Vite production build time;
- Nuxt dev cold start and CSS HMR latency;
- manifest generation time/size;
- emitted CSS size with and without mutable slots;
- runtime entrypoint and runtime metadata size;
- snapshot serialize/hydrate time.

Phase 1 has a dedicated resolution-propagation matrix:

- self-contained expressions only;
- one system-bound leaf in shallow, medium, and deeply nested calculations/operations;
- mixed self/system expressions across the small/medium/large fixtures;
- hover/declaration readability and union width at each scale;
- direct comparison of the candidate `Resolution` generic against a branded/erased encoding with identical call-site behavior.

Initial regression policy:

- no accepted phase may degrade a large-fixture editor/type metric by more than 20% without an explicit decision explaining the user-visible gain;
- D65 applies a 1ms floor to that relative editor threshold; sub-millisecond interactions use absolute latency, repeated-run stability, and unchanged result counts because percentage deltas at timer-noise scale are not meaningful product regressions;
- completion/diagnostic interactions must remain subjectively immediate, then receive a numeric budget from baseline measurements in phase 0;
- mutable-slot overhead is reported separately for zero, typical, and all-token mutability;
- type-level bulk axis syntax ships only if it stays within the same budget as canonical per-token syntax.
- D62 selected separate self/system brands plus focused overloads: at 5,000 mixed expressions the rejected generic used 1.25s TypeScript total time and 339,107 declaration bytes versus 0.77s and 279,177 bytes for the selected encoding.

Store machine-readable results under a generated benchmark artifact path and commit a human summary only when a new baseline is accepted.

## 7. Runtime/browser contract

Browser tests assert:

- no failed stylesheet/resource requests;
- no console/page errors;
- first styled paint remains styled under SSR;
- omitted-root document binding works only for a `:root` system; widget roots remain explicit;
- custom-property inheritance and axis selection produce real computed values;
- mutable base/mode/case writes update expected descendants;
- `$unset()` restores authored values;
- inner widget runtimes do not leak to siblings;
- shadow-root behavior matches the documented support policy;
- external custom-property writes affect SVG presentation attributes through ordinary CSS;
- `light-dark()` or selector scheme output behaves in supported browsers;
- unregistered element-local `light-dark()` tokens respond to nested `color-scheme` overrides;
- typed registered public properties never silently freeze an element-local scheme token at an ancestor;
- per-arm scheme manifest locality matches observed native, root-selector, media-fallback, and absolute-selector behavior;
- port and mutable token writes coexist;
- runtime snapshot rendered on the server hydrates without a flash;
- snapshot round trips preserve base, axis-mode, case, and runtime-managed mode addresses through individual and batch setters;
- an additive runtime schema change reconciles and hydrates still-valid entries instead of rejecting the snapshot wholesale;
- removed/type-changed/unauthored addresses are skipped with exact migration diagnostics, while unsupported protocol versions reject safely;
- accessibility/motion/focus contracts remain intact.

Selectors are tested against actual DOM placement, not only string snapshots.

## 8. Dev/HMR/toolchain matrix

The permanent matrix preserves the lessons of the July 2026 hardening review:

- every virtual stylesheet URL requested by a browser returns 200;
- repeated reloads preserve styled first paint;
- dependency CSS HMR replaces in place;
- export-shape changes cause exactly the documented reload behavior;
- runtime overrides survive compatible HMR or receive an explicit rebind diagnostic;
- an equivalent re-evaluated engine/system retains compatibility without object-reference equality;
- a semantically changed engine or runtime schema receives a precise invalidation/migration diagnostic;
- server shutdown releases HTTP and HMR listeners;
- repeated start/stop does not leak watchers or ports;
- modern CSS emitted by values/axes survives every supported optimizer without invalid rewrites or unexplained warnings;
- source/export discovery and debug-name transforms keep adversarial AST fixtures for aliases, destructuring, re-exports, comments, and new syntax.

Supported version matrices are recorded in package metadata and CI. A valid browser value that produces warnings in a default supported stack is a red integration gate until vane configures, preserves, or sharply documents the limitation.

## 9. Packaging/fresh-app gate

Before publication or promotion:

1. lint;
2. SDK typecheck;
3. all runtime/type/editor/output/conformance tests;
4. SDK build;
5. package dry-run and tarball inspection;
6. both demo typechecks/builds;
7. production and development Playwright matrices;
8. process lifecycle checks;
9. fresh strict Vite and Nuxt tarball smoke;
10. manifest/audit/delight-gauntlet walk;
11. performance comparison against the accepted baseline;
12. documentation snippet compilation.

The current workspace commands remain the starting point:

```text
pnpm run sdk:typecheck
pnpm run sdk:test
pnpm run sdk:build
pnpm run bench:fixtures:check
pnpm run bench:resolution
pnpm run bench:baseline
pnpm run demo:typecheck
pnpm run demo:build
pnpm run demo:e2e
pnpm run fresh:smoke
pnpm run audit
pnpm run validate
```

The refactor may add benchmark/conformance/doc-test commands; it must not weaken the existing gate.

## 10. Maintained DX comparison

“Most delightful” is tested through user moments, not a permanently frozen competitor table.

Before a release, compare current official peer behavior for:

- design token definition/derivation/modules;
- rename and editor locality;
- full CSS escape/reach;
- runtime values and custom properties;
- component contracts/variants;
- framework integration;
- provenance and diagnostics;
- output scaling and ecosystem breadth.

Record only current, sourced conclusions. If a peer is better at a moment vane claims as differentiating, improve vane or narrow the claim. Do not keep stale marketing tables as architectural truth.

Permanent comparative questions:

- Does the quickstart compile from the packed artifact at the advertised TypeScript version?
- Can definitions and consumers rename across composed modules without touching unrelated graphs?
- Can valid modern CSS survive supported toolchains cleanly?
- Can Nuxt SSR/dev/HMR retain styled output and runtime state?
- Can a rendered declaration be traced to its authoring call, token, axis/case, and source?
- Do audits produce actionable signal rather than noise?
- Is the simpler path still simpler than assembling equivalent primitives manually?

## 11. Delight-gauntlet evidence

Each gauntlet moment in the next vision maps to a named test/fixture before promotion. The implementation plan owns the temporary ledger; after promotion, test names and docs links become the stable evidence map.

No gate becomes green from a manual glance alone. Exploratory manual testing is valuable input, not durable proof.
