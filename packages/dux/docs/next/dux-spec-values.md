updated: 2026-07-14
status: target spec — semantic value foundation, implementation pending

# vane-dux next — spec: typed CSS values

This is the foundation of the refactor. Tokens, CSS properties, ports, runtime setters, atoms, keyframes, plugins, and interchange all consume the same value language.

## Implementation ledger

| Contract | Current asset | Target state |
| --- | --- | --- |
| General serialized CSS values | `VaneCssValue`/`CssValue` | Replace with typed expression IR. |
| Color expression graph | Rich color-specific IR | Generalize into the common IR; preserve color features. |
| Math values | `calc`, `min`, `max`, `clamp` with partial dimension tracking | General CSS arithmetic compatibility and data-type propagation. |
| Raw strings | Accepted in CSS/token/port lanes | Preserve as ergonomic first-class input with parsing/audit policy. |
| Data-type brands | Partial/inferred from constructors | Add explicit extensible brands. |
| Custom values | Internal subclassing patterns | Public constructors/plugins used by built-ins. |

## 1. Core representation

The public conceptual type is opaque and records whether final system context is required:

```ts
declare const vaneValue: unique symbol

interface VaneValue<
  Type extends VaneCssDataType = VaneCssDataType,
  Resolution extends 'self' | 'system' = 'self' | 'system',
> {
  readonly type: Type
  readonly [vaneValue]: {
    readonly resolution: Resolution
  }
}
```

There is deliberately no universal `.css` property or implicit string coercion. A literal length can serialize without a system, but an expression containing an unfinished token reference cannot know its final prefix/name yet. Public serialization is therefore explicit:

```ts
de.serialize(de.length.em(2))
// '2em' — accepts only values typed as self-contained

ds.serialize(ds.t.color.brand.$var())
// 'var(--app-color-brand)' — resolves through this finalized system
```

`de.serialize()` rejects system-dependent values at the call site. `ds.serialize()` accepts compatible self-contained and system-bound values. Style/token/runtime APIs normally serialize internally, so these functions are escape and integration tools rather than ceremony on ordinary authoring paths.

`Resolution` above expresses a semantic requirement, not a mandate to thread a costly public union generic through every operation forever. Phase 1 must prove that self/system propagation stays inside editor/type budgets. A branded, covariant, overload-based, or partially erased internal encoding is allowed if it preserves call-site rejection, readable hovers, declaration portability, and context-bound serialization.

The internal IR additionally records:

```ts
interface VaneExpressionNode {
  kind: VaneExpressionKind
  type: VaneCssDataType
  dependencies: readonly VaneReference[]
  serialize: (context: VaneSerializeContext) => string
  fold?: (context: VaneFoldContext) => VaneFoldResult
  source?: VaneSource
  extension?: VaneExtensionIdentity
}
```

The public interface stays small. Internal node kinds are not a user-authored discriminated union and may evolve without making arbitrary private objects valid values. Plugin serializers always receive `VaneSerializeContext`; they never read a context-free string field.

## 2. CSS data types

The first implementation must support at least:

- unknown/declaration value;
- number and integer;
- percentage;
- number-percentage where the grammar permits both;
- length and length-percentage;
- angle;
- time;
- frequency;
- resolution;
- flex;
- color;
- image where current CSS authoring already accepts it;
- position;
- easing function;
- transform function/list;
- custom-ident and dashed-ident;
- string and URL;
- plugin-defined opaque/composite types.

This list is a practical first set, not a claim that CSS has a closed data-type universe.

Data types are capabilities, not units. `px`, `rem`, and `em` all construct `<length>` values. Degrees and turns construct `<angle>` values.

## 3. Ergonomic constructors

Explicit units use native TypeScript property access:

```ts
de.length.px(8)
de.length.rem(1)
de.length.em(2)
de.angle.deg(45)
de.angle.turn(0.5)
de.time.ms(150)
de.percent(50)
```

Configured bare constructors remain available:

```ts
const de = createEngine({
  length: { unitless: 'px' },
})

de.length(8) // 8px
```

Configuration affects only the branded constructor. It never reinterprets every raw `number` in CSS.

Raw CSS stays valid:

```ts
ds.css({
  padding: '2em',
  transitionDuration: '150ms',
})
```

## 4. Expression kinds

The common IR must represent:

- recognized literal;
- CSS function;
- calculation/operation;
- token `val` reference;
- token/custom-property `var()` reference;
- external custom-property reference;
- raw typed CSS syntax;
- plugin-defined node;
- composite structured value;
- list/separator form where necessary for correct serialization.

The former color `kind: 'parse'` does not survive. A successfully recognized authored string is a `literal`; deliberately opaque syntax is `raw`.

## 5. Same-named CSS parity

Any public helper named after a CSS function accepts the platform grammar relevant to that function, including typed expressions:

```ts
de.oklch(
  0.5,
  de.calc(/* ... */),
  285,
  0.5,
)
```

And:

```ts
de.oklch(
  de.percent(50),
  chromaVar,
  de.angle.deg(285),
  alphaVar,
)
```

The requirement applies to `rgb`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `color`, `color-mix`, math functions, transforms, gradients, and future same-named helpers — not only OKLCH.

Capability matrices record for each helper:

- accepted platform grammar;
- accepted ergonomic shorthand;
- output grammar;
- fold behavior;
- live/var behavior;
- maturity/support constraints;
- raw escape when first-class coverage is incomplete.

## 6. Calculations and compatibility

Math operations propagate CSS data-type compatibility, not merely strings.

Required behavior includes:

- add/subtract only compatible additive types;
- multiplication/division following the supported CSS Values arithmetic model;
- `min`, `max`, and `clamp` rejecting incompatible result types;
- nested calculations preserving precedence without unnecessary wrappers;
- var/token inputs carrying their asserted types;
- unknown inputs forcing an unknown result rather than a false precise type;
- context diagnostics when a valid value type cannot be used in a particular property/at-rule.

The implementation must not encode a narrower arithmetic model under CSS-native function names without an explicit diagnostic and raw path.

## 7. Colors

Color remains a flagship value family, now built on the shared IR.

Contracts to preserve or add:

- all current color spaces and literal parsing;
- channel-level token/custom-property references;
- numbers, percentages, angles, `none`, calculations, and typed references where CSS permits them;
- relative-color construction and channel operations;
- mixing with explicit interpolation space and hue policy;
- alpha replacement without pretending it has an interpolation space;
- build/live equivalence where possible;
- documented fallback for contrast operations without a mature native equivalent;
- no hidden gamut or normalization change outside configured policy.

`.in(space)` belongs only on operations whose semantics actually use a working/interpolation space.

Nonstandard elevation/color conventions may be plugins and may use the same typed color constructors. They are not core CSS primitives.

## 8. Folding

A fold result is accepted only when the implementation can prove it is semantically equivalent for the supported contract.

```ts
type VaneFoldResult = { kind: 'folded', node: VaneExpressionNode }
  | { kind: 'preserve', reason: VaneFoldRefusal }
```

Refusal is normal, not an error. Reasons are inspectable:

- runtime dependency;
- raw/unknown syntax;
- plugin without fold support;
- platform-dependent evaluation;
- color/gamut semantics;
- unsupported arithmetic combination;
- configured preserve-native policy.

Users may choose a preserve-native engine policy. No policy may force an unsafe fold.

## 9. External custom properties

```ts
const gap = de.customProperty('--library-gap', {
  type: 'length',
})

gap.$name
gap.$var()
gap.$var(de.length.rem(1))
```

Without an explicit type, a compatible typed fallback may infer the expression result type. Without either, the reference is unknown and must not masquerade as a color/length.

The constructor validates custom-property name syntax and fallback compatibility. It cannot validate an externally owned runtime declaration.

## 10. Typed raw values

```ts
de.rawValue.length('anchor-size(width)')
de.rawValue.color('future-color(...)')
de.rawValue.unknown('future-value(...)')
```

Raw values:

- retain the asserted type for property compatibility;
- are parsed for broad token/balance/syntax safety where possible;
- never expose type-specific transformations requiring understood structure;
- never fold;
- appear in audits and provenance as raw assertions;
- preserve authored serialization unless a standards-required normalization is proven safe.

## 11. Public extension contracts

The minimum public surface is conceptually:

```ts
const editorialMeasure = defineCssValue({
  type: 'length',

  create(input) {
    return {
      serialize(context) {
        return 'editorial-measure(...)'
      },
    }
  },
})
```

A value with extension-owned serialization such as this is installed through an identified plugin or `.extend({ id, version }, ...)` link. Anonymous local extensions are limited to values fully lowered into core IR.

Advanced operations may declare inputs, result type, serialization, dependencies, and optional folding:

```ts
const elevate = defineCssOperation({
  inputs: ['color', 'number'],
  output: 'color',
  serialize(context, /* ... */) {},
  fold(/* ... */) {},
})
```

Extension contracts provide namespace/collision diagnostics and semantic engine requirements. Opaque semantics require a stable plugin/extension identity and version; values lowered entirely to core IR are portable. Manifest and DTCG codecs are optional capabilities, not requirements.

## 12. Context compatibility

The same value language is accepted by:

- token definitions and derivations;
- CSS declarations;
- keyframes and font-face descriptors where types fit;
- ports and atoms;
- mutable token setters;
- custom-property fallbacks;
- plugin utilities.

Context still matters. A runtime/axed `var()` cannot be substituted into a media-query definition where CSS custom properties are not allowed. A compile-known `val` may work there. Diagnostics explain the context and available projection.

## 13. Support targets and expression previews

Var-referenced graph edges commonly preserve platform expressions. The engine therefore owns an explicit CSS support-target policy:

- the zero-config engine uses vane's published, CI-locked browser/toolchain matrix for that release; it does not float silently with market data;
- projects may supply a different supported-target policy through the engine/integration adapter;
- every first-party/plugin expression reports the CSS features its serialization requires;
- if a required feature is outside target, vane emits a proven semantically equivalent fallback plus enhancement when possible;
- if no honest dynamic fallback exists, compilation diagnoses the dependency and suggests an explicit build-folded `reference: 'val'`, a target-policy change, or an acknowledged raw/experimental path;
- vane never adds hidden JavaScript recomputation merely to mask unsupported CSS.

Expression-emitted tokens remain inspectable. Manifest/`ds.explain()` output includes a resolved preview for a declared environment when the graph can evaluate one, plus the actual emitted expression and support requirements. External/unknown/runtime-only inputs carry `preview: unavailable` with a reason rather than a fabricated value. A preview is diagnostic context, not a replacement for browser computed-value fixtures.

The exact target-input adapter (Browserslist, bundler target data, or an explicit vane matrix) is settled through Phase 1 integration fixtures; the behavioral contract above is invariant.

## 14. Evidence

Completion requires:

- type fixtures for every data-type compatibility boundary;
- output fixtures for every constructor and nested expression form;
- runtime/build equivalence tests for foldable operations;
- preserve-native tests for nonfolded operations;
- Web Platform Test/spec-derived grammar cases where feasible;
- plugin dogfood fixtures proving built-ins need no private privilege;
- property/at-rule context diagnostics;
- performance benchmarks for representative large expression/token graphs;
- support-target fallback/diagnostic fixtures and resolved-preview manifest snapshots;
- optimizer/toolchain survival for emitted modern syntax.
