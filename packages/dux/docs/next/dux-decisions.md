updated: 2026-07-14
status: accepted architecture decisions — change only with new evidence recorded here

# vane-dux next — decisions

This is the compact decision record for the refactor. The specs own full behavior; this file prevents settled choices from being accidentally reopened or contradictory interpretations from spreading across tasks.

## Product and architecture

| ID | Decision | Consequence |
| --- | --- | --- |
| D01 | vane-dux is a **TypeScript harness for CSS**. | Same-named CSS concepts owe the platform's full capability; TypeScript adds leverage without narrowing CSS. |
| D02 | Delight is the governing product criterion. | Consistency with other dux projects is useful prior art, never authority. |
| D03 | The foundation separates CSS data type, CSS expression, token representation/emission, and variation/mutability. | No single “mode” enum or metadata flag may collapse these dimensions again. |
| D04 | CSS is the semantic authority and emitted artifact. | CSS terminology wins; future platform syntax always has a typed/raw path. |
| D05 | `createEngine()` is the canonical first stage. | No intermediate public system-definition stage is introduced. A standalone `createSystem` convenience is deferred until evidence justifies a second dialect. |
| D06 | The engine is the complete authoring environment used to define a design system. | Value constructors, plugins, axes, token definition, graph semantics, and reusable modules live on the engine. |
| D07 | `engine.createSystem()` finalizes a token graph and returns the language used to style with it. | Prefix, effective root, layers, loose conditions, emission, recipes, ports, and runtime binding belong to the system. |
| D08 | Built-ins use the same public plugin/extension contracts as users. | No privileged internal-only path for value utilities, patterns, aliases, elevation, or BEM. |

## Values and tokens

| ID | Decision | Consequence |
| --- | --- | --- |
| D09 | All CSS-capable values share one typed expression IR. | Color is a value family, not a separate architecture. |
| D10 | Folding occurs only when semantic equivalence is proven. | Platform expressions are preserved when gamut, missing components, runtime dependencies, or new syntax make evaluation uncertain. |
| D11 | Raw CSS strings remain first-class. Brands are helpful, not mandatory. | `padding: '2em'` remains valid; `length.em(2)` adds composition and type information. |
| D12 | Advanced token configuration uses `token({ ... })`; raw leaf values remain shorthand. | Token/group discrimination does not reserve ordinary user group names. |
| D13 | The paired vocabulary is `val`/`var`. | Config uses `val`; handles expose `$val` and `$var(fallback?)`; `reference` accepts `val` or `var`. |
| D14 | Closed token config keys are unprefixed; vane members sharing user namespaces use `$`. | `token({ val, axes, description })`; groups use `$axes`, `$description`, `$root`; handles use `$name`, `$val`, `$var`, `$axes`. |
| D15 | Reference, emission, registration, mutability, and axes are separate token capabilities. | The former `is: [...]` bag is replaced by explicit fields with inference for common combinations. |
| D16 | `null` is valid sugar for an untyped named token/custom property with no emitted value declaration. | Typed no-default forms use constructors such as `token.color()`; known-but-unemitted values use explicit config. |
| D17 | `register` config owns `@property`. | The public property may infer `syntax`; `inherits` and `initial-value` follow platform validity rules. |
| D18 | CSS data types are an open spec-defined taxonomy. | The engine implements a useful core and a typed raw escape instead of pretending to enumerate CSS forever. |

## Axes, conditions, and emission

| ID | Decision | Consequence |
| --- | --- | --- |
| D19 | Axes are configured on the engine. | Engine-bound `defineTokens()` has exact axis/mode IntelliSense in external modules. |
| D20 | An axis is an environmental dimension; a mode is one value of that axis. | Arbitrary conditions are not axes unless mutual-exclusivity/default semantics are declared. |
| D21 | Per-axis maps remain valid; sparse `cases` model explicit multi-axis intersections. | Authors do not maintain Cartesian matrices, but can define a special value for a particular combination. |
| D22 | Axis precedence defaults to axis declaration order; `.axisOrder(...)` is an optional typed override. | The common one-axis case has no ordering ceremony. When supplied, the override autocompletes axis names and requires every declared axis exactly once. |
| D23 | Mode maps remain objects; overlapping trigger precedence is explicit. | Object insertion order is not the only semantic control; built-in axes encapsulate preference-versus-explicit override order. |
| D24 | The system owns the effective root and token layer; modules/groups may refine the root. | The nearest group/module root overrides the system root. Prefix has one owner: the final system. |
| D25 | Conditions use explicit root anchoring. | `&[data-x]`, `[data-x] &`, and `& [data-x]` express self, ancestor, and descendant relationships; absolute conditions are explicit. |
| D26 | `scope` is reserved for CSS `@scope`. | APIs use root, selector, condition, query, and emission context for other concepts. |
| D27 | Token emission order is base → ordered axes → cases → authored overrides, expressed with cascade layers. | Bundle/import order cannot silently change axis semantics. |

## Runtime and custom properties

| ID | Decision | Consequence |
| --- | --- | --- |
| D28 | Public vocabulary says “custom property,” not CCP. | Generic APIs use `setCustomProperty`/`setCustomProperties`; handles use `$name` and `$var()`. |
| D29 | `theme` is not the primitive name. | Build-time grouped changes are token overrides; runtime grouped writes are token overrides/custom-property assignments. Product themes may be built from them. |
| D30 | Generic custom-property setting and mutable-token updating are distinct lanes. | Explicit-target writes work for any custom property; provenance-aware base/mode/case setters require a mutable token and a runtime root. |
| D31 | Runtime stylesheet patching is not the default mutation mechanism. | Extracted CSS remains immutable; CSSOM indexes, optimizer reordering, HMR replacement, and origin-clean restrictions cannot invalidate updates. |
| D32 | `mutable: true` emits stable internal value slots for every mutable token. | Base, modes, and cases can be set/unset uniformly; nonmutable tokens avoid the CSS and metadata cost. |
| D33 | A concrete runtime is bound once with `ds.runtime(root)`. | Plane-neutral `ds.t` exposes CSS metadata; `runtime.t` adds `$set()`/`$unset()` against one cascade instance. |
| D34 | Mutable bindings should assign the public property on the effective token root. | Slot substitution occurs where the slots exist; conditions that move the binding outside the runtime root are diagnosed. |
| D35 | `$unset()` removes the inline slot assignment. | The authored stylesheet value becomes effective again without remembering it in JavaScript. |
| D36 | Runtime setters accept the same value language and optional validation as their build-time types. | Branded values and valid raw CSS serialize consistently; Standard Schema remains optional. |
| D37 | Runtime state can be snapshotted and projected to SSR root properties. | Persistence storage is app-owned; vane owns validation, custom-property styles, runtime-managed mode attributes, hydration, and deterministic runtime schema identity. |

## Ergonomics and integrations

| ID | Decision | Consequence |
| --- | --- | --- |
| D38 | External custom properties use the same handle concept as token properties. | `customProperty('--x').$var(fallback)` replaces the conceptual need for `rawVar`; a one-shot `varRef` may exist only as sugar. |
| D39 | Core ships no property aliases. | A typed alias plugin may expose both names or an aliases-only primary lane; `css.standard`/`css.raw` preserve full CSS reach. |
| D40 | The recipe helper is `fromTokenGroup()`. | It maps a resolved token group to a same-key variant/config table; arbitrary arrays use ordinary TypeScript. |
| D41 | `propsOf()` keeps object-key namespacing. | Nested and multi-component projection remains typed and explicit. |
| D42 | Elevation, BEM, and nonstandard color conventions are optional plugins/presets. | Plugins may expose any deliberate names; namespacing is recommended when a name resembles a platform primitive. |
| D43 | Layout patterns and style-fragment utilities are distinct concepts. | `circle`, `square`, `truncate`, and `visuallyHidden` are utilities, not mislabeled layout patterns. |
| D44 | DTCG import/export supports interoperable snapshots and vane-authored extension data. | Vane-to-vane semantic round trips are lossless for portable nodes; arbitrary TypeScript source is not serializable. |
| D45 | Plugin DTCG codecs are optional. | Strict lossless export fails on nonportable nodes; resolved export may flatten them with an explicit warning. |
| D46 | Pug is a demo workspace preference, not product architecture. | Demo template syntax does not appear in the public vision/specs. |

## Implementation-readiness resolutions

| ID | Decision | Consequence |
| --- | --- | --- |
| D47 | Zero-config token shorthand defaults to `reference: 'var'` and `emit: true`. | A plain graph produces inspectable, consumer-overridable custom properties and CSS-reactive platform expressions instead of folded descendants. This raises the default expression capability floor but, per D60, never silently exceeds the configured browser-support target. `createEngine({ tokens: { reference, emit } })` may choose a different project-wide default; explicit traits/invariants win. |
| D48 | Engine compatibility uses a deterministic semantic signature, never object-reference identity. | Equivalent engines survive HMR re-evaluation and duplicate package instances. The signature covers the IR protocol, normalized policies, and stable plugin/extension identities; object identity is cache-local only. |
| D49 | Axis modes and cases are branch handles on both `ds.t` and `runtime.t`. | Plane-neutral branch handles expose their authored `$val` and metadata; runtime-bound versions add `$set`/`$unset`. Private slot names are never presented as token `$name`s. |
| D50 | Authoring values do not promise a context-free `.css` property. | Serialization is context-bound: `de.serialize()` accepts only self-contained values, while `ds.serialize()` may resolve finalized token names. Plugin serializers always receive an explicit context. |
| D51 | Native scheme selection declares whether it is element-local or root-bound. | The built-in default preserves element-local `color-scheme` semantics. A typed registered public property that would compute `light-dark()` at a broader root is diagnosed unless the author explicitly selects root-bound semantics; vane never silently freezes subtree scheme behavior. |
| D52 | A finalized system directly re-exposes its engine's read-only value constructors and value plugins. | Daily style modules can import only `ds`: `ds.css({ padding: ds.length.em(2) })`. Definition/finalization methods remain engine-only, and constructor/system-name collisions are rejected locally. |
| D53 | The anti-mincho constraint remains a migration law. | Every phase is an independently verifiable vertical slice, and the existing suite, demos, build, and packaging gates remain green at each phase boundary. Foundational phases need not invent premature user-facing surface. |
| D54 | Phase 1 builds the value IR on the internal engine kernel that will power public `createEngine()`. | Existing root helpers temporarily delegate to the internal default engine; phase 2 exposes and configures that kernel rather than migrating every constructor twice. |
| D55 | Internal mutable-slot names are opaque implementation addresses. | Examples use one illustrative scheme but are non-normative; snapshots store semantic token/branch addresses and resolve current private names through system metadata. |
| D56 | Runtime snapshots and batch overrides share one semantic address model. | Snapshot v1 records `{ token, address, val }` entries for base/axis/case overrides plus runtime-managed modes. `$set()` and both base-tree and handle-entry `applyTokenOverrides()` forms normalize to those records; tuple entries accept same-system plane-neutral handles. |
| D57 | A runtime schema-ID mismatch triggers per-entry reconciliation, not wholesale snapshot rejection. | Valid addresses and modes hydrate after current validation; removed/incompatible entries are skipped with migration diagnostics. Only an unreadable/unsupported snapshot protocol version rejects the whole document. |
| D58 | Runtime branch handles enumerate authored addresses plus explicit no-default reservations only. | Missing partial modes/cases have no handle or slot. `null` on a mutable mode/case reserves an address without a default; its binding falls through to the previously effective expression until set. |
| D59 | The top-level system member namespace is a closed, versioned contract. | Core publishes/reserves its member set; adding another core top-level name outside that set is a breaking change. Extensions should claim one unique namespace such as `ds.editorial.*`; collisions fail when the engine is built. |
| D60 | Var-default derivations may raise the CSS feature floor, never silently the supported-browser floor. | Engine target policy gates expression emission. Vane emits a proven fallback/enhancement pair or diagnoses the unsupported dependency and suggests `reference: 'val'`; manifests/explanations include a resolved preview or an explicit preview-unavailable reason. |
| D61 | Scheme selection locality is declared per trigger arm. | Native used-color-scheme arms may be element-local; root-anchored attribute/class arms may be subtree-local; preference media-query fallbacks are document-global and cannot silently claim element-local equivalence. |
| D62 | Resolution context uses separate `VaneSelfValue`/`VaneSystemValue` brands and a plane-neutral union, not a propagated public generic. | The 5,000-expression candidate generic cost 62% more TypeScript total time and 21.5% more declaration bytes than the branded/overloaded encoding. Focused overloads retain call-site rejection and readable hovers without taxing every value operation. |
| D63 | The flagship demo is rebuilt as a design-system studio, not mechanically migrated from the current color-picker concept. | Phase 8 proves one coherent system across live palette, scheme, density, radius, elevation, typography, motion, responsive/container behavior, and runtime persistence. The comparison demo uses a smaller parity-friendly brief; neither demo dictates product architecture. |
| D64 | Core CSS support targets are explicit versioned feature sets. | `defineCssSupportTarget({ id, features })` is the stable adapter; optional Browserslist/bundler integrations may derive it, but core behavior never floats with external market data. |
| D65 | Relative performance thresholds have a 1ms measurement floor for editor micro-operations. | Below that floor, repeated-run stability, completion/diagnostic counts, and absolute latency govern acceptance; percentage changes between sub-millisecond medians are treated as timer noise, not fictitious user-visible regressions. |
| D66 | Deprecated package-root authoring functions are migration adapters, not a second canonical dialect. | Until target-doc promotion they preserve inherited regression gates and receive no new language features. The target root centers `createEngine`, public types, and explicit standards/adapter entrypoints; engine-derived constructors and `de.createSystem()` are the only canonical authoring path. |

## Deliberately open implementation details

These questions do not block the architecture, but must be settled in their owning phase before public implementation is considered complete:

- Whether the advanced token wrapper is `de.token()` only or also available unqualified inside engine callbacks.
- The exact shape of condition helpers for self/ancestor/descendant root placement.
- Whether group-level `$root` ships in the first refactor or follows module-level roots.
- Whether a one-shot `varRef()` convenience earns its surface beside `customProperty().$var()`.
- Whether runtime selector strings are supported as a query-once convenience; they must never silently mean stylesheet injection.
- The supported subset and maturity tier of `light-dark()` optimization versus selector-based scheme emission.
- The exact public spelling for per-arm scheme locality and acknowledged degraded fallback; D61's semantics are fixed.
- The minimum initial CSS data-type set beyond color, number, percentage, length, angle, time, resolution, custom-ident, and unknown.
- How plugins namespace manifest/DTCG data and report nonportable IR nodes.

Each item must be decided with API fixtures and emitted-output examples, not implementation convenience alone.
