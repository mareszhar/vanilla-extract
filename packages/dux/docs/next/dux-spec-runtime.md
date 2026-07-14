updated: 2026-07-14
status: target spec — runtime custom-property boundary, implementation pending

# vane-dux next — spec: runtime

The runtime plane writes declared CSS custom-property values and selects pre-emitted states. The browser remains responsible for cascade, inheritance, expressions, axes, and recomputation.

## Implementation ledger

| Current contract | Disposition |
| --- | --- |
| `applyTheme(element, tokens, overrides)` writes live token custom properties | Generalize to runtime-bound mutable token overrides; retire theme terminology. |
| `setScheme(element, mode)` | Generalize to `setMode`; preserve scheme convenience. |
| Port `.set()` returns inline style fragments | Preserve; share value serialization/validation primitives. |
| Runtime never constructs CSS rules | Preserve for core; optional explicit runtime sheet remains separately scoped. |
| Token handles serialize across build/runtime | Preserve and add mutable slot provenance. |

## 1. Two runtime lanes

### 1.1 Generic explicit-target custom-property writes

```ts
setCustomProperty(target, property, val)
setCustomProperties(target, entries)
```

This is a direct CSS operation. It works with:

- vane token custom-property handles;
- external `customProperty()` handles;
- optionally validated raw custom-property names;
- any token regardless of `mutable`, because the caller supplies the target and accepts ordinary cascade behavior.

It writes an inline declaration and does not use token provenance, mutate stylesheets, or promise axis-specific behavior.

The low-level target is an element/`CSSStyleDeclaration`-like object. A selector string is not overloaded to mean rule injection.

### 1.2 Runtime-bound mutable token updates

```ts
const runtime = ds.runtime(document.documentElement)

runtime.t.color.brand.$set(val)
runtime.t.color.brand.$unset()
```

This lane requires `mutable: true`. It writes the token's stable internal slot on the runtime root and exposes typed base/mode/case addressing.

## 2. `ds.runtime(root)`

```ts
const runtime = ds.runtime(root, options)
```

The runtime binds one serialized system contract to one concrete cascade instance.

Root forms considered for the first implementation:

- explicit `ElementCSSInlineStyle`/HTML/SVG element — required;
- omitted root as `document.documentElement` convenience for a `:root` system — recommended;
- selector string resolving exactly one element at bind time — optional, never stylesheet injection;
- shadow root requires an explicit eligible host/target strategy.

Binding validates where possible:

- system/root compatibility;
- duplicate runtime identity on the same target if unsafe;
- mutable axis bindings whose substitution point lies outside the bound subtree;
- initial snapshot system/version identity.

It does not observe or query every token trigger continuously.

## 3. Runtime token tree

Plane-neutral handles:

```ts
ds.t.color.brand.$name
ds.t.color.brand.$val
ds.t.color.brand.$var()
```

Runtime-bound handles add:

```ts
runtime.t.color.brand.$set(val)
runtime.t.color.brand.$unset()

runtime.t.color.brand.$axes.scheme.dark.$set(val)
runtime.t.color.brand.$axes.scheme.dark.$unset()
```

Case addressing should remain typed and discoverable. Candidate canonical shape:

```ts
runtime.t.shadow.card
  .$case({ scheme: 'dark', density: 'compact' })
  .$set(val)
```

The final form must avoid exposing private slot names as ordinary design tokens.

Nonmutable handles do not expose provenance-aware `$set`/`$unset`. The generic explicit-target function remains available.

## 4. Mutable slots

Every mutable token receives uniform slots, including non-axed tokens.

Conceptual output:

```css
:root {
  --app-brand--base: oklch(...);
  --app-brand--scheme-dark: oklch(...);
  --app-brand: var(--app-brand--base);
}

:root[data-scheme="dark"] {
  --app-brand: var(--app-brand--scheme-dark);
}
```

Runtime writes only slots:

```ts
root.style.setProperty(baseSlotName, serializedVal)
root.style.removeProperty(baseSlotName)
```

Contracts:

- public and private properties have different names, so selector specificity cannot block slot changes;
- stylesheet-authored slot values provide reset/fallback;
- slot names are serialized in runtime metadata and stable for one build/system identity;
- slot names are not a supported external theming API;
- public property bindings remain ordinary CSS visible in devtools;
- no CSSRule index, stylesheet query, or original-value registry is required.

## 5. Substitution-point invariant

CSS custom-property `var()` substitution happens at the element on which the binding computes. Therefore mutable public bindings should target the effective token root:

```css
[data-scheme="dark"] #widget {
  --app-brand: var(--app-brand--scheme-dark);
}
```

Here the binding matches `#widget`, the same element on which runtime slots are normally written.

A condition that instead binds above the runtime root can inherit an already-substituted public value and ignore inner slot writes. The compiler/runtime must:

- prefer root-anchored binding output;
- diagnose mutable bindings outside the effective root;
- warn when a non-document runtime root cannot influence known trigger placement;
- document shadow-tree boundaries explicitly.

## 6. Native scheme optimization

When policy permits, slots compose with `light-dark()`:

```css
:root {
  --app-brand--light: oklch(...);
  --app-brand--dark: oklch(...);
  --app-brand: light-dark(
    var(--app-brand--light),
    var(--app-brand--dark)
  );
}
```

The public binding and substitution occur at the root. Mode-specific setters update the corresponding slot. Toolchain/browser policy determines whether this optimization or selector emission is used.

## 7. Setting and unsetting

```ts
interface VaneMutableHandle {
  $set: (input: VaneRuntimeInput) => void
  $unset: () => void
}
```

`$set`:

- accepts the token data type's standard input union;
- accepts engine-created values and valid raw CSS strings;
- serializes through the common value layer;
- performs optional runtime schema validation;
- writes the correct private slot;
- records current override state for snapshots without duplicating CSS evaluation.

`$unset` removes the inline slot. It does not write CSS `unset`, `initial`, or `null`.

Batch form:

```ts
runtime.applyTokenOverrides({
  color: {
    brand: val,
  },
})
```

The batch is typed against mutable inputs and may support a structured axis/case section; exact syntax must receive its own API fixture.

## 8. Validation

Value data-type validation is universal. Optional Standard Schema validation is allowed on mutable setter inputs:

```ts
de.token({
  val: de.length.rem(1),
  mutable: true,
  validate: {
    schema: PositiveLengthSchema,
    runtime: 'dev', // false | 'dev' | 'always'
    onInvalid: 'throw', // 'throw' | 'fallback' | 'omit'
  },
})
```

Rules:

- async schemas are rejected for synchronous `$set()` unless a separate async API is deliberately introduced;
- schema output, not raw input, is serialized when transformation is supported;
- transformed output must remain compatible with the token CSS data type;
- warning does not mean “write an invalid value anyway”;
- port and token validation share infrastructure while retaining different ownership APIs.

## 9. Token overrides versus ports

Runtime token overrides affect a system-level design decision for one bound root.

Ports affect an individual style/component instance and return style fragments suitable for framework binding.

```ts
runtime.t.radius.control.$set('10px')
// system instance decision

progressPort.set(0.62)
// component instance input fragment
```

Framework helpers may merge both fragments, but documentation must prevent ports from becoming a second token registry or mutable tokens from replacing per-instance component contracts.

## 10. Modes

```ts
runtime.setMode('density', 'compact')
runtime.clearMode('density')
```

The operation delegates to the engine axis adapter's runtime trigger contract, commonly a `data-*` attribute. It does not set token values directly.

Built-in convenience may remain:

```ts
runtime.setScheme('dark')
```

Mode names autocomplete from the engine/system. Axes without a runtime-selectable trigger reject `setMode` honestly.

## 11. SSR, hydration, and persistence

Runtime override state is serializable:

```ts
const snapshot = runtime.snapshot()
```

The system can validate/project a snapshot without DOM access:

```ts
const style = ds.runtimeStyle(snapshot)
```

Server frameworks place the resulting custom-property map on the effective root. Client binding receives the same snapshot:

```ts
const runtime = ds.runtime(document.documentElement, {
  initial: snapshot,
})
```

Contracts:

- no flash caused by waiting for client setters;
- snapshot includes system identity/schema version;
- unknown/removed tokens and modes produce migration diagnostics;
- only explicit overrides are serialized, never the entire resolved graph;
- persistence transport/storage is application-owned;
- hydration does not redundantly rewrite matching inline values;
- Nuxt adapters expose an SSR-safe integration path without making core framework-aware.

## 12. Optional runtime stylesheet

Arbitrary selector-targeted runtime rule creation is not part of `setCustomProperty` or `ds.runtime`.

If justified, it is an explicit capability:

```ts
const sheet = createRuntimeStyleSheet(document)

sheet.setCustomProperty(
  '[data-preview="large"]',
  '--external-size',
  '4rem',
)
```

Such a capability owns its sheet, replacement/deduplication, CSP diagnostics, shadow-root target, SSR limitations, and teardown. It never patches extracted vane stylesheets.

## 13. Manifest and devtools

Runtime metadata includes:

- system identity and effective root;
- mutable token paths/types;
- base/mode/case slot addresses;
- public property binding contexts;
- current inline overrides when a runtime is inspected;
- validation configuration without embedding unsafe schema implementation details;
- snapshot version.

Devtools should display authored value, active override, selected axis/case, effective public value, and reset action without exposing private slot names as the primary UX.

## 14. Evidence

Completion requires:

- generic custom-property set/unset on HTML and SVG targets;
- base/mode/case mutable slot writes and reset;
- substitution-point browser fixtures for self/ancestor/descendant conditions;
- nested widget and shadow-root coverage;
- `light-dark()` slot behavior under the supported target policy;
- runtime value serialization and invalid-input policies;
- ports/mutable-token coexistence;
- snapshot → SSR style → hydration round trip with no flash;
- HMR preserving/rebinding runtime overrides or diagnosing incompatible system identity;
- no CSS rule creation in core runtime;
- runtime bundle/metadata budgets.
