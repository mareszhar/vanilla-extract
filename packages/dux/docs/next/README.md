updated: 2026-07-14
status: target documentation hub — phases 0–4 accepted; phase 5 is next

# vane-dux next — documentation hub

This directory defines the target architecture for vane-dux's pre-publication semantic-foundation refactor.

The current documents one level above remain the truthful description of the implementation that exists today. The documents here describe the system we have agreed to build next. Keeping those truths separate prevents an implementation in transition from appearing complete merely because its specification was rewritten first.

## The north star

> **vane-dux is a TypeScript harness for CSS.** It exposes the full expressive power of CSS while adding type inference, validation, composition, introspection, reusable design-system structure, and delightful authoring ergonomics.

The refactor is not primarily a collection of new utilities. It rebuilds the semantic foundation around four independent concepts:

1. the CSS data type of a value;
2. the CSS expression that produces it;
3. how a token is referenced and emitted;
4. how the environment or runtime may vary it.

Everything else — axes, custom properties, runtime updates, plugins, DTCG, scales, colors, ports, and patterns — is built on that separation.

## Truth during the transition

| Location | Meaning during the refactor |
| --- | --- |
| `docs/*.md` | Current implementation contract. These files remain accurate until a migrated domain passes its gates. |
| `docs/next/*.md` | Target contract. New implementation work follows these files. |
| `notes/vane-dux-ideation.md` | Historical exploration and resolution map. It is not normative. |
| Tests and emitted output | Evidence. A target contract is not implemented until its named evidence exists. |

When a target document conflicts with a current document, the target document governs new work; the current document continues to describe shipped behavior until promotion.

## Current migration state

- Phase 0 established the semantic contracts, preservation inventory, and pre-refactor evidence baseline.
- Phase 1 is accepted: the internal engine kernel, unified typed CSS value IR, standards-aware serializers, public value-extension contracts, and compatibility adapters pass the permanent phase-boundary gates.
- Phase 2 is accepted: the canonical configurable engine, semantic identity, engine-bound token modules, single-owner system finalization, root/layer emission, and one-import styling surface pass the permanent phase-boundary gates.
- Phase 3 is accepted: independent token traits, branded configuration, CSS-reactive shorthand, the finalized `$` handle language, exact authored branch addresses, cross-plane restoration, and deterministic token/name/var projections pass their evidence planes.
- Phase 4 is accepted: immutable staged axes, root-anchored trigger locality, exact modes/cases, group roots, registration, deterministic token sublayers, mutable-address reservations, guarded native scheme output, and emission provenance pass their evidence planes.
- Phase 5 is next: bind mutable token/custom-property addresses to explicit runtime roots, setters, batches, validation, snapshots, SSR, hydration, and HMR reconciliation.

The detailed checklist and acceptance evidence live in the [implementation plan](./dux-implementation-plan.md). The [current baseline](./dux-current-baseline.md) remains the immutable pre-refactor comparison point rather than a rolling description of the new implementation.

## Reading order

1. [Vision](./dux-vision.md) — product identity, principles, architecture, and the capability boundary.
2. [Language](./dux-language.md) — the public vocabulary and canonical API shapes.
3. [Patterns](./dux-patterns.md) — cross-cutting behavioral laws every domain follows.
4. [Decisions](./dux-decisions.md) — settled choices and deliberately open implementation details.
5. [Value specification](./dux-spec-values.md) — the typed CSS value IR, data types, expressions, folding, and extensions.
6. [Engine and system specification](./dux-spec-engine.md) — the two-stage authoring model, plugins, axes, roots, and emission policy.
7. [Token specification](./dux-spec-tokens.md) — token configuration, modules, axes/cases, custom properties, and manifests.
8. [Runtime specification](./dux-spec-runtime.md) — custom-property writes, mutable slots, runtime binding, validation, reset, and SSR.
9. [Testing](./dux-testing.md) — permanent evidence planes, performance budgets, integration matrices, and release gates.
10. [Demo brief](./dux-demo-brief.md) — Phase 8 flagship studio, comparison scope, implementation boundaries, and acceptance evidence.
11. [Current baseline](./dux-current-baseline.md) — pre-refactor exports, build sizes, verification results, and characterization map.
12. [Implementation plan](./dux-implementation-plan.md) — migration inventory, phases, task ledger, and promotion procedure.

## Contract inheritance

The new foundation intentionally preserves large implemented domains. Until their canonical specs are promoted, the following current documents remain the detailed contract except where a next document explicitly overrides them:

- `dux-spec-css.md`: selectors, layers, keyframes, font faces, `globalCss`, and `css.raw`;
- `dux-spec-ports.md`: ports as typed component custom-property boundaries;
- `dux-spec-recipes.md`: recipes, toggles, compound variants, anatomy, and strict call sites;
- `dux-spec-vue.md`: `usePorts`, anatomy projection, Nuxt SSR/HMR, and framework boundaries;
- `dux-spec-preset.md`: preset deletability, atoms, accessibility, motion, and layout patterns;
- `dux-spec-introspection.md`: provenance, audits, and agent-readable artifacts;
- `dux-workspace.md`: workspace layout, fork hygiene, scripts, and publishing mechanics.

The [implementation plan](./dux-implementation-plan.md) records the exact preserve/rework/add decision for every section, so “inherited” never means “forgotten.”

## Promotion protocol

The `next/` namespace disappears only after all of these are true:

1. every phase in the implementation plan is complete;
2. all preserved current contracts still pass their regression evidence;
3. every new contract has runtime, type, editor-DX, output, and integration evidence proportional to its risk;
4. the public examples compile from a packed artifact;
5. the manifest and documentation describe the implemented shapes rather than planned ones;
6. no compatibility alias or transitional type remains unintentionally public;
7. the old canonical docs are replaced or reconciled domain by domain;
8. all links and status tables are checked after removing `next/`.

Promotion is documentation cleanup, not the moment at which architectural decisions are made. Decisions belong here before implementation.

## Change discipline

- No implementation phase may silently change a settled API shape. Update [decisions](./dux-decisions.md) first and record the evidence that forced the change.
- A feature is not complete because its runtime works. Its types, diagnostics, emitted CSS, provenance, and supported integrations are the same product.
- Internal transitional adapters are allowed; public transitional ambiguity is not.
- Every phase boundary keeps the current suite, demos, build, packaging, and maintained fresh-app smoke green; foundational work is not permission for a broken mainline.
- Compatibility with the unpublished current API is not a goal. Preserving its proven behaviors and evidence is.
- CSS capability is never removed to enforce an opinion. Policies may narrow the primary lane only when a standards/raw lane remains available.
