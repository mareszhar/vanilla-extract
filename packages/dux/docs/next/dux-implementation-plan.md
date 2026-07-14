updated: 2026-07-14
status: active migration ledger — architecture preparation complete; phase-0 baselines pending; implementation not started

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
| 0 | Documentation, inventory, characterization, and performance baseline | ◐ |
| 1 | Unified typed CSS value IR and public extension contracts | ☐ |
| 2 | Canonical engine authoring environment and two-stage setup | ☐ |
| 3 | Token configuration, traits, handles, modules, and projections | ☐ |
| 4 | Axes, cases, roots, conditions, registrations, and emission order | ☐ |
| 5 | Mutable slots, runtime binding, custom-property APIs, SSR snapshots | ☐ |
| 6 | Ports, recipes, preset, aliases, scales, patterns, and framework adaptation | ☐ |
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

### Characterization

- [x] Record current public export/build/test snapshots for intentional comparison in `dux-current-baseline.md`.
- [x] Map existing characterization fixtures for current color IR, graph modes, theme/applyTheme, schemes, token manifest, roots/layers, ports, and system serialization.
- [x] Identify behavior to preserve versus architecture/API spellings intentionally replaced.
- [ ] Capture current packed Vite/Nuxt smoke result.

### Performance baseline

- [ ] Add small/medium/large generated fixtures.
- [ ] Record cold/incremental typecheck, declarations, completion, diagnostics, rename, build, CSS/manifest size, and runtime bundle baselines.
- [ ] Add stable benchmark commands and machine-readable artifacts.

### Exit gate

- The target documents cross-link cleanly and cover every ideation/review item.
- Current behavior worth preserving has characterization evidence.
- Performance regression budgets have real baseline numbers.
- No implementation refactor has begun under an unsettled semantic model.

## 5. Phase 1 — unified CSS value foundation

### IR

- [ ] Create the internal engine kernel and its default configured instance before porting constructors.
- [ ] Route existing package-root value helpers through compatibility adapters to that internal default engine.
- [ ] Introduce data-type, expression, dependency, serialization, and optional fold traits.
- [ ] Prototype generic and branded/erased resolution-context encodings; benchmark mixed self/system propagation before public value types depend on one.
- [ ] Replace the minimal `VaneCssValue` string wrapper with the typed common interface.
- [ ] Port the color expression graph into the common IR without behavior loss.
- [ ] Port math/calc values and fix dimension compatibility for `min`, `max`, `clamp`, multiplication, and division.
- [ ] Add literal/function/operation/var/raw/plugin/composite node support.
- [ ] Preserve source/provenance through expressions.

### Data types and ergonomics

- [ ] Implement the minimum data-type set from the value spec.
- [ ] Add `length.px/rem/em`, angle/time/etc. unit constructors and configured bare constructors.
- [ ] Preserve direct raw strings/numbers in compatible CSS contexts.
- [ ] Add typed raw future-value constructors.
- [ ] Add external `customProperty()` handles with `$name` and `$var(fallback?)`.

### CSS parity

- [ ] Expand every color constructor to full accepted channel types.
- [ ] Add per-channel token/custom-property refs.
- [ ] Restrict `.in()` to operations with interpolation/working-space semantics.
- [ ] Add mix hue policy and native grammar coverage.
- [ ] Build capability tables and spec/WPT-derived tests.
- [ ] Define stable versus experimental helper maturity policy.
- [ ] Define the CI-locked default CSS support target and project override adapter.
- [ ] Require every expression serializer to declare feature requirements and implement a proven fallback/enhancement or actionable folded-path diagnostic.

### Public extensions

- [ ] Design `defineCssValue` and `defineCssOperation` through API fixtures.
- [ ] Reimplement at least one simple and one advanced built-in through them.
- [ ] Add engine/plugin identity, collision, serialization, and optional fold hooks.
- [ ] Ensure extension authors do not import internal classes.

### Exit gate

- One value IR works in token, CSS, port, atom, keyframe, and runtime-input fixtures.
- Existing valid CSS remains accepted.
- Same-named helpers meet their declared capability tables.
- Build/preserved expressions are semantically locked.
- Performance stays within the accepted budget.
- Default var-reference output never silently exceeds the declared CSS support target.

## 6. Phase 2 — canonical engine and system

### Engine

- [ ] Implement `createEngine()` default authoring environment.
- [ ] Expose the phase-1 engine kernel as public `createEngine()` rather than rehoming constructors a second time.
- [ ] Implement deterministic semantic engine signatures from protocol, normalized policy, and stable plugin/extension identities; never use object equality for compatibility.
- [ ] Define plugin configuration fingerprints and reject anonymous opaque extension semantics.
- [ ] Implement immutable `.use()` and `.extend()` links.
- [ ] Make built-ins/preset candidates consume public extension contracts.
- [ ] Decide the minimal package-root exports: `createEngine`, public types, adapters/standards entrypoints.
- [ ] Reject incompatible engine/module/value composition locally.

### System

- [ ] Implement `de.createSystem()` as canonical finalization.
- [ ] Remove double prefix ownership; system finalizes names once.
- [ ] Preserve bound CSS/recipe/anatomy/port/atoms/global/keyframe/font APIs.
- [ ] Re-expose configured value constructors/plugins directly on `ds` for one-import daily style authoring, while keeping definition/finalization methods engine-only.
- [ ] Export/version the closed system-member and built-in-constructor reservation set; add namespaced extension conventions and collision diagnostics.
- [ ] Add `root` and token-layer configuration without generic scope terminology.
- [ ] Preserve build/app function serialization and framework boundaries.
- [ ] Decide whether standalone `createSystem(de => ...)` remains deferred; do not ship both dialects by accident.

### Modules

- [ ] Make engine-bound `defineTokens()` modules carry identity but no fake final names.
- [ ] Preserve composition, immutable branching, checks, exact staged inference, and rename bridge.
- [ ] Add module emission metadata normalization.

### Exit gate

- Canonical examples use one engine → one system dialect.
- External modules have exact engine helper and later axis typing.
- Current system styling behavior remains regression-green.
- Prefix/name identity cannot silently diverge.
- Equivalent HMR/package-duplicate engine instances compose; semantic changes fail locally.
- Style modules can use `ds.css`, `ds.t`, and configured value constructors from one import.

## 7. Phase 3 — token traits, configuration, and handles

### Config

- [ ] Implement raw shorthand plus `de.token({ ... })` branding.
- [ ] Lock zero-config shorthand to `reference: 'var'`/`emit: true` and add engine-level `tokens` defaults.
- [ ] Characterize the intentional shift from implicit static graph edges to CSS-reactive shorthand; prove explicit/engine-default `reference: 'val'` retains the folded path.
- [ ] Implement `val`, `reference: 'val' | 'var'`, `emit`, `mutable`, `register`, `axes`, `cases`, metadata, and runtime validation fields as independent traits.
- [ ] Add inference/diagnostics for implied/incompatible traits.
- [ ] Implement bare `null`, typed `token.color()`/other no-default forms, and known `emit: false` values.
- [ ] Remove `.live()` and old mode enum from the target public model.

### Handles

- [ ] Rename public members to `$name`, `$val`, `$var(fallback?)`, `$description`, `$axes`, etc.
- [ ] Make axis modes and cases branch handles on both plane-neutral and runtime-bound trees; expose `$val`/metadata without public private-slot names.
- [ ] Enumerate authored/reserved branch addresses exactly; omit unconfigured partial modes/cases from handle types.
- [ ] Keep `$val` a property and `$var()` a fallback-accepting method.
- [ ] Ensure the handle default serialization follows `reference`.
- [ ] Preserve plane-neutral serialization across build/app boundaries.
- [ ] Add readable public types/hover and no collision with user group keys.

### Projections

- [ ] Implement `ds.tokensOf`, `ds.namesOf`, and `ds.varsOf` for modules, resolved subtrees, and composed tree selections.
- [ ] Make name/var projection usable from configuration contexts without CSS emission.
- [ ] Lock deterministic naming as a public contract.

### Exit gate

- Every token form has runtime/type/editor/output evidence.
- Current graph refactors and diagnostics remain credible.
- Name/var integration replaces the Hail/Nuxt mirrored registry use case.
- No old mode/liveness special case remains load-bearing.

## 8. Phase 4 — axes, roots, cases, registration, and emission

### Axes

- [ ] Implement `.axes(context => record)` on the staged engine.
- [ ] Use normalized declaration order by default; implement optional typed `.axisOrder(...)` with completeness/duplicate checks.
- [ ] Implement axis/mode condition bindings, defaults, descriptions, and optional derivations.
- [ ] Implement explicit trigger priority for overlapping conditions; built-in scheme preference loses to explicit selection.
- [ ] Record native-element, root/subtree-selector, document-media, and absolute-selector locality per trigger arm; prohibit unacknowledged element-local degradation.
- [ ] Decide exposure/requirement API without unchecked future dot paths.
- [ ] Add built-in scheme and generic data-axis adapters.

### Token authoring

- [ ] Implement complete single-axis maps, base plus partial maps, multiple axes, and sparse cases.
- [ ] Accept `null` on mutable modes/cases as an explicit no-default address reservation; reject it on nonmutable branches.
- [ ] Emit diagnostics for totality, duplicate cases, impossible modes, and likely accidental precedence.
- [ ] Prototype group `$axes`; ship only if API/performance gates pass.
- [ ] Add color-agnostic axes across arbitrary value data types.

### Roots/conditions

- [ ] Implement system/module effective roots; prototype group `$root` separately.
- [ ] Implement root-anchored condition IR with self/ancestor/descendant/absolute placement.
- [ ] Preserve bare styling conditions and selector/at-rule reach.
- [ ] Reserve actual `@scope` support and terminology.
- [ ] Surface resolved emission contexts in diagnostics/manifest.

### Emission

- [ ] Establish token sublayers before declarations.
- [ ] Guarantee base → ordered axes → cases → overrides.
- [ ] Add optional native `light-dark()` optimization behind support/toolchain policy.
- [ ] Implement `@property` registration with inferred syntax and validity checks.
- [ ] Model element-local versus root-bound scheme selection; reject typed registration that would silently freeze element-local `light-dark()` behavior.
- [ ] Ensure unlayered consumer CSS and system override layers behave predictably.

### Exit gate

- Full axis/root/order browser and output matrices pass.
- Import order cannot change semantics.
- Mutable-compatible binding placement is defined before runtime slot implementation.
- Scheme is no longer a hardcoded color/light/dark graph shape.

## 9. Phase 5 — mutable runtime and custom properties

### Generic lane

- [ ] Implement `setCustomProperty`/`setCustomProperties` for explicit DOM/style targets and external/vane handles.
- [ ] Do not overload selectors as implicit stylesheet injection.
- [ ] Decide whether selector query convenience belongs on `ds.runtime()`.

### Mutable slots

- [ ] Emit uniform base slots for every `mutable: true` token.
- [ ] Emit addressable mode/case slots and public bindings.
- [ ] Emit no authored slot value for reserved `null` branches and compile a noncyclic fallback to the previously effective expression.
- [ ] Keep slots inheritable/unregistered and public registration separate.
- [ ] Serialize slot provenance into plane-neutral runtime metadata.
- [ ] Keep private slot spelling opaque/non-normative and resolve it only from semantic token/branch addresses.
- [ ] Implement `$set()` and `$unset()` on runtime-bound base/mode/case handles.
- [ ] Validate substitution-point/root invariants in compiler and runtime.

### Runtime binding

- [ ] Implement `ds.runtime(root?)` and runtime-bound token tree.
- [ ] Keep `ds.t` plane-neutral without misleading no-target setters.
- [ ] Implement `applyTokenOverrides()` with an ergonomic base-tree form and explicit mutable-handle tuple entries for base/mode/case batches.
- [ ] Accept same-system plane-neutral `ds.t` handles canonically in tuple entries and reject other-system/unauthored handles locally.
- [ ] Implement `setMode`/clear and built-in scheme convenience.
- [ ] Add Standard Schema-compatible optional setter validation with sync semantics.

### SSR/persistence/HMR

- [ ] Implement snapshot v1 with deterministic system schema ID, semantic `{ token, address, val }` base/axis/case records, and runtime-managed modes.
- [ ] Normalize `$set()`, both `applyTokenOverrides()` forms, `$unset()`, SSR projection, and hydration through the same record set.
- [ ] Implement per-entry schema reconciliation and `ds.reconcileRuntimeSnapshot()`; preserve valid entries across additive schema changes.
- [ ] Reserve wholesale rejection for unreadable/unsupported snapshot protocol versions; emit exact migration diagnostics for skipped entries/modes.
- [ ] Implement server-side snapshot → inline custom-property projection.
- [ ] Implement snapshot → root style/attribute projection so runtime-managed modes also paint before hydration.
- [ ] Implement hydration/rebind without flash or redundant writes.
- [ ] Integrate Nuxt SSR payload/root style path.
- [ ] Preserve compatible overrides through HMR by semantic address or diagnose an invalid runtime schema.

### Exit gate

- No core runtime CSS rule construction exists.
- Base/mode/case changes and reset work in real browsers across document/widget/shadow policies.
- Persisted SSR overrides paint correctly before hydration.
- Runtime types/validation/metadata and bundle budgets are green.

## 10. Phase 6 — adjacent surfaces and ergonomics

### Ports

- [ ] Move ports to the common value/data-type serializer.
- [ ] Retire `as` in favor of branded values.
- [ ] Add Standard Schema options with explicit `false | 'dev' | 'always'` validation and non-write invalid policies.
- [ ] Reject async schemas for synchronous setters unless a separate API is justified.
- [ ] Preserve port defaults, style fragments, recipes publication, Vue reactivity, and SSR.
- [ ] Document port versus mutable-token ownership.

### Recipes/Vue

- [ ] Preserve recipes, toggles, compound/defaults, anatomy, headless conditions, call-site strictness, and published ports.
- [ ] Add `fromTokenGroup()` only after a real recipe fixture proves repeated value.
- [ ] Preserve/refine object-key `propsOf()` namespacing.
- [ ] Adapt `usePorts` and runtime helpers to common serializers/validation.

### Engine plugins and conveniences

- [ ] Implement property alias plugin with `both`/`aliases-only` completion policies and standards/raw escape.
- [ ] Rebuild elevation and optional BEM/nonstandard conventions as public plugins/preset utilities.
- [ ] Generalize scales to callable step access plus token generation; define negative/fractional behavior.
- [ ] Implement `fluid()` on a general typed interpolation primitive with monotonic validation.
- [ ] Separate layout patterns from style-fragment utilities; expand only through proven repeated use.
- [ ] Preserve base/custom-property relationship patterns without inventing another primitive.

### Exit gate

- Existing recipe/port/Vue/preset contracts remain green.
- Plugins receive exact IntelliSense and no private privileges.
- Alias strictness never removes CSS capability.
- Convenience additions have real use fixtures, not speculative surface alone.

## 11. Phase 7 — introspection and interchange

### Manifest/explain

- [ ] Replace `{ light, dark }` manifest shapes with declaration provenance.
- [ ] Record data types, expressions, fold decisions, reference inference, axes/cases, roots, layers, registrations, mutable slots, and portability.
- [ ] Record emitted feature requirements, fallback/enhancement path, and resolved preview or preview-unavailable reason.
- [ ] Implement `explain(token)` structured output and devtools projection.
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
- [ ] Demonstrate axes, non-color mutability, ports, plugins, raw CSS reach, provenance, SSR persistence, and custom-property integration.
- [ ] Keep Pug as the demo workspace convention if still desired.
- [ ] Re-run maintained peer comparisons using current official sources.
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
