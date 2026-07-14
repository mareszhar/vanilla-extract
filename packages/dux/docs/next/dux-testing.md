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
- browser computed value when stable to assert;
- optimizer/toolchain survival.

Authoritative CSS specifications and relevant Web Platform Tests are the source of cases. Copy only minimal cases needed to establish the contract and record their provenance; do not create a divergent grammar by intuition.

Color coverage includes every shipped constructor, interpolation space/hue policy, relative channel form, missing component, alpha form, gamut-sensitive preservation, and native/fallback capability ceiling.

Math coverage includes additive compatibility, multiplication/division, mixed dimensions, `min`/`max`/`clamp`, precedence, and context rejection.

## 4. Token and axis matrix

Test each data type against:

- raw shorthand token;
- configured `reference: 'val'`;
- configured/inferred `reference: 'var'`;
- null and typed no-default token;
- known `emit: false` value;
- registration;
- mutable base slot;
- one complete axis;
- base plus partial axis;
- multiple independent axes in each order;
- explicit sparse case;
- mutable base/mode/case set and unset;
- module composition/derivation;
- token override class;
- resolved environment snapshot;
- manifest and DTCG projections.

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
- narrow runtime setters for mutable base/mode/case handles;
- standards lane availability under aliases-only policy.

Type tests that merely assert assignability are insufficient for APIs whose product claim includes completion, rename, or error locality.

## 6. Performance benchmarks

Record cold and warm results with environment metadata. Benchmarks are comparative gates against the previous accepted implementation on the same machine/CI class, not universal marketing numbers.

Required measurements:

- `tsc --noEmit` cold and incremental;
- declaration emit time and `.d.ts` size;
- completion latency at root tokens, deep groups, axes, cases, `css()` properties, and aliases;
- diagnostic latency after a one-character typo;
- rename latency across composed modules and consumers;
- Vite production build time;
- Nuxt dev cold start and CSS HMR latency;
- manifest generation time/size;
- emitted CSS size with and without mutable slots;
- runtime entrypoint and runtime metadata size;
- snapshot serialize/hydrate time.

Initial regression policy:

- no accepted phase may degrade a large-fixture editor/type metric by more than 20% without an explicit decision explaining the user-visible gain;
- completion/diagnostic interactions must remain subjectively immediate, then receive a numeric budget from baseline measurements in phase 0;
- mutable-slot overhead is reported separately for zero, typical, and all-token mutability;
- type-level bulk axis syntax ships only if it stays within the same budget as canonical per-token syntax.

Store machine-readable results under a generated benchmark artifact path and commit a human summary only when a new baseline is accepted.

## 7. Runtime/browser contract

Browser tests assert:

- no failed stylesheet/resource requests;
- no console/page errors;
- first styled paint remains styled under SSR;
- custom-property inheritance and axis selection produce real computed values;
- mutable base/mode/case writes update expected descendants;
- `$unset()` restores authored values;
- inner widget runtimes do not leak to siblings;
- shadow-root behavior matches the documented support policy;
- `light-dark()` or selector scheme output behaves in supported browsers;
- port and mutable token writes coexist;
- runtime snapshot rendered on the server hydrates without a flash;
- accessibility/motion/focus contracts remain intact.

Selectors are tested against actual DOM placement, not only string snapshots.

## 8. Dev/HMR/toolchain matrix

The permanent matrix preserves the lessons of the July 2026 hardening review:

- every virtual stylesheet URL requested by a browser returns 200;
- repeated reloads preserve styled first paint;
- dependency CSS HMR replaces in place;
- export-shape changes cause exactly the documented reload behavior;
- runtime overrides survive compatible HMR or receive an explicit rebind diagnostic;
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
