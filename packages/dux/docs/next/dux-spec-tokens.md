updated: 2026-07-14
status: target spec — token graph, axes, emission, and interoperability; implementation pending

# vane-dux next — spec: tokens

Tokens are named design decisions in a typed dependency graph. They may resolve to CSS values, custom-property references, environmental variants, runtime-addressable slots, metadata, and interchange projections without conflating those capabilities.

## Implementation ledger

| Current contract | Disposition |
| --- | --- |
| Staged `defineTokens().compose().derive().build()` | Preserve staged graph and graph-aware rename behavior; move construction to the engine and final build to the system. |
| Static/live/scheme/derived mode enum | Replace with independent expression, reference, axes, and mutability traits. |
| Color-only `.live()` | Replace with value-agnostic token config and propagation. |
| `scheme({ light, dark })` | Generalize to axes; retain built-in scheme adapter/native optimization. |
| `theme()` / `applyTheme()` | Replace primitive terminology with token overrides and runtime custom-property assignment. |
| All tokens emitted at unlayered `:root` | Replace with effective roots and explicit token sublayers. |
| `{ light, dark }` manifest values | Replace with declaration provenance across arbitrary axes/cases. |
| Metadata/checks/graph edges/emitted names | Preserve and generalize. |

## 1. Definition forms

### 1.1 Shorthand leaf

```ts
brand: de.oklch(0.58, 0.2, 285)
space: '1rem'
factor: 1.25
```

The engine infers data type/expression. The zero-config policy normalizes shorthand to:

```ts
de.token({
  val: authoredVal,
  reference: 'var',
  emit: true,
})
```

Therefore a plain token graph emits inspectable custom properties and ordinary handle consumption uses `var()`. Graph edges are CSS-reactive by default: overriding an input custom property updates downstream expressions that have a CSS representation. This preserves vane's public custom-property contract and keeps design tokens open to consumer CSS without per-leaf ceremony.

Projects may deliberately choose another policy once:

```ts
const de = createEngine({
  tokens: {
    reference: 'val',
    emit: false,
  },
})
```

The engine policy applies both to raw shorthand and omitted fields in `de.token({ val })`. Explicit per-token fields win unless they violate a capability invariant. Choosing `reference: 'val'` is the deliberate build-folded/inline path; it is never inferred merely because today's input happens to be foldable.

The var default also means downstream derivations prefer living platform expressions—relative color, `color-mix()`, `calc()`, and peers—over folded literals. That is deliberate: ordinary overrides rederive by default and “boring CSS” includes inspectable standards-track functions, not only primitives. It does **not** permit silently emitting above the configured support target; the value support policy must provide an equivalent fallback/enhancement or diagnose the edge with the explicit `reference: 'val'` alternative.

### 1.2 Configured token

```ts
brand: de.token({
  val: de.oklch(0.58, 0.2, 285),
  reference: 'var',
  emit: true,
  mutable: true,
  axes: {/* ... */},
  cases: [/* ... */],
  register: {/* ... */},
  description: 'Primary brand color',
  deprecated: { use: 'color.accent' },
  validate: {/* runtime setter policy */},
})
```

### 1.3 No-default token

```ts
fill: null
fill: de.token.color()
```

The token receives a path/name/handle but no ordinary value declaration. Bare null is unknown-typed; typed constructors preserve runtime/property validation.

### 1.4 Known nonemitted value

```ts
wide: de.token({
  val: de.length.rem(64),
  reference: 'val',
  emit: false,
})
```

This supports compile-known design constants such as query thresholds. It is not the same as a no-default custom property.

## 2. Token traits and inference

Each token independently records:

- data type;
- expression/dependencies;
- default reference (`val`/`var`);
- emission behavior;
- custom-property registration;
- axes and cases;
- runtime mutability;
- checks and metadata.

Inference rules:

- axes require a var reference and an emitted public binding;
- mutability requires a var reference, an emitted public binding, and stable emitted slots;
- an explicit `reference: 'val'` or `emit: false` conflicting with axes/mutability is diagnosed at that field rather than silently rewritten;
- no-default tokens imply a custom-property identity with `reference: 'var'` and no ordinary declaration unless axes/mutability require a binding;
- references to mutable/axed inputs remain runtime-dependent;
- runtime dependence does not necessarily require JS recomputation; CSS expressions remain preferred;
- explicit incompatible configuration fails at the config key with a suggested correction.

`reference: 'val'` means use the resolved CSS expression, not “guaranteed primitive folded literal.”

The defaults are intentionally configurable, but never inferred from whether one literal happened to fold in the current compiler. That keeps CSS output stable across optimizer improvements.

### 2.1 Token and branch handles

The resolved token is the public-property handle. Its `$name`, `$var()`, `$val`, and default serialization follow the token contract.

An axis mode or case is a **branch handle** on every plane:

```ts
const dark = ds.t.color.brand.$axes.scheme.dark

dark.$val

const compactDark = ds.t.shadow.card.$case({
  scheme: 'dark',
  density: 'compact',
})

compactDark.$val
```

Branch handles expose authored value/condition/provenance metadata. When used directly as a value, a branch handle serializes as its authored `$val`; it never inherits the parent token's default `var` projection. They do not expose `$name`/`$var()` because the branch is not another consumer-facing token property. Internal mutable-slot names remain opaque.

`runtime.t` preserves the same tree and branch-handle shape, adding `$set()`/`$unset()` only for mutable addresses. Generic traversal can therefore move between `ds.t` and `runtime.t` without changing whether `$axes` yields a value or a handle.

Branch typing is exact:

- `$axes` contains only modes explicitly authored on that token, including explicit no-default reservations—not every mode known to the engine;
- `$case(when)` accepts only the literal case intersections authored/reserved on that token;
- an omitted partial mode or unauthored case has no handle, no private slot, and cannot be passed to `$set()`;
- every mutable token still has its uniform base address; mode/case addresses remain pay-for-what-you-author.

## 3. Modules and graph derivation

```ts
export const colors = de
  .defineTokens({
    color: {
      brand: de.oklch(0.58, 0.2, 285),
    },
  })
  .derive(({ color }) => ({
    color: {
      brandSoft: de.alpha(color.brand, 0.12),
    },
  }))
```

Contracts preserved from the current graph:

- exact accumulated typing per stage;
- cycle/missing/duplicate diagnostics;
- immutable branching;
- deterministic composition order;
- graph-aware editor rename across definitions, derivations, composed modules, and consumers;
- separate graph identity preventing unrelated rename crossover;
- public metadata and deprecation propagation;
- checks evaluated with the same dependency graph.

New requirements:

- module semantic engine requirements/signature;
- data-type compatibility on graph edges;
- reference/mutability propagation explanations;
- portable versus plugin-owned node identity;
- module/root/layer provenance;
- module-local structure introspection without fake final names.

## 4. Group metadata

Vane keys inside user structure use `$`:

```ts
const tokens = {
  color: {
    $description: 'Color decisions',
    $root: '#widget',
    $axes: {},

    brand: token,
  },
}
```

Initial group metadata set:

- `$description`;
- `$axes` if the bulk form survives its implementation fixture;
- `$root` if group-level roots pass selector-composition/performance tests;
- axis requirement/exposure metadata in the least magical shape selected during the axis phase.

Do not grow a generic arbitrary `$` bag. Every group key needs a precise manifest and inheritance contract.

## 5. Axes

### 5.1 Complete single-axis values

```ts
accent: de.token({
  axes: {
    scheme: {
      light: de.color('red'),
      dark: de.color('darkred'),
    },
  },
})
```

A complete map for one axis may omit a base `val` when exactly one mode is always active or the axis explicitly permits no default declaration.

### 5.2 Base with partial modes

```ts
accent: de.token({
  val: de.color('red'),
  axes: {
    scheme: {
      dark: de.color('darkred'),
    },
  },
})
```

Unspecified modes use the base value.

### 5.3 Multiple independent axes

```ts
shadow: de.token({
  val: baseShadow,

  axes: {
    scheme: {
      light: lightShadow,
      dark: darkShadow,
    },

    density: {
      cozy: cozyShadow,
      compact: compactShadow,
    },
  },
})
```

When multiple modes match, declarations resolve in engine axis order. This is allowed and introspectable; the compiler should warn only when policy identifies likely accidental overwrites, not prohibit deliberate precedence.

### 5.4 Sparse cases

```ts
shadow: de.token({
  val: baseShadow,
  axes: {/* ... */},

  cases: [
    {
      when: {
        scheme: 'dark',
        density: 'compact',
      },
      val: darkCompactShadow,
    },
  ],
})
```

“Sparse” means only exceptional intersections are authored. No Cartesian table is generated or required.

Case contracts:

- `when` keys/modes autocomplete from the engine;
- at least two axes are required unless a one-axis case has a separately justified use;
- duplicate/intersecting equivalent cases are diagnosed;
- cases emit after single-axis declarations;
- a case may be mutable and receives an addressable runtime slot when the token is mutable;
- manifest provenance records the complete `when` object.

### 5.5 No-default runtime reservations

An author may reserve a mutable branch without giving it a build-time value:

```ts
accent: de.token({
  val: baseAccent,
  mutable: true,

  axes: {
    scheme: {
      dark: null,
    },
  },

  cases: [
    {
      when: {
        scheme: 'dark',
        density: 'compact',
      },
      val: null,
    },
  ],
})
```

Here `dark` and the dark/compact case are authored addresses, so they appear in branch-handle types and receive runtime slots, but no initial slot declaration is emitted. Until `$set()` supplies a value, each binding falls through to the expression that would have won without that reserved branch. `$unset()` restores that same fallback.

The compiler serializes the prior effective expression into the slot fallback chain; it must not create a self-referential public-property cycle. If no prior effective value exists, the branch remains CSS-invalid until set and ordinary consumer `$var(fallback)` behavior remains available.

Branch `null` is valid only on a mutable token. On a nonmutable token it has no public property identity of its own and is diagnosed; omission is the correct partial-axis form. The token's data type supplies the reserved branch type, so an additional untyped value sentinel is unnecessary.

## 6. Group-level axis bulk form

The transposed form remains a candidate because it matches palette-table authoring:

```ts
const tokens = {
  color: {
    $axes: {
      scheme: {
        light: {
          canvas: lightCanvas,
          ink: lightInk,
        },

        dark: {
          canvas: darkCanvas,
          ink: darkInk,
        },
      },
    },

    canvas: de.token({
      description: 'Application canvas',
    }),

    ink: de.token({
      description: 'Primary text',
    }),
  },
}
```

It ships only if:

- exact key totality and metadata merging remain readable;
- error locality is better than repeated per-token maps;
- TypeScript completion/diagnostic performance meets the large-graph budget;
- it normalizes to the same canonical graph as per-token axes;
- it does not complicate cases or module composition disproportionately.

Per-token axes remain the canonical internal representation.

## 7. Roots and declaration contexts

Every token declaration resolves an effective root. Axis selector conditions must state their relation to it.

For root `#widget`:

```ts
condition('&[data-scheme="dark"]')
// #widget[data-scheme="dark"]

condition('[data-scheme="dark"] &')
// [data-scheme="dark"] #widget
```

Mutable token bindings should match the effective root so internal slot substitution sees values written on that root. Descendant/absolute placements that break this invariant produce a diagnostic or require a separately bound runtime root.

At-rule conditions wrap the declaration root.

## 8. Emission

Conceptual order:

```text
token contract/name allocation
→ optional @property registrations
→ base declarations
→ axis declarations in engine order
→ cases
→ token override classes
```

All ordinary declarations live in deterministic system token sublayers.

### 8.1 Val-referenced token

May emit no custom property when no other capability needs one. Consumers serialize the resolved expression.

### 8.2 Var-referenced token

Emits a public custom property unless `emit: false`/no-default semantics deliberately omit it. Consumers serialize `var(--name)`.

### 8.3 Mutable token

Emits internal inheritable value slots and a public binding:

```css
:root {
  --app-brand--slot-base: oklch(...);
  --app-brand: var(--app-brand--slot-base);
}
```

The `--slot-*` spelling is illustrative only. Axed/case slots use opaque stable identifiers carried by runtime metadata. Their exact names are not a public consumer contract and are never returned as a branch `$name`.

### 8.4 Registered token

The public custom property may emit `@property`. Internal slots remain unregistered/inheritable unless a future proven requirement changes that policy.

Registration validates platform requirements, including syntax and initial-value constraints. A no-default token cannot silently synthesize an invalid initial value.

Typed registration also changes computed-value timing. An unregistered custom property retains an unresolved token stream, while a registered property substitutes as its computed value. For `<color>`, that means `light-dark()` selects against the declaring element's color scheme before the result inherits. See [CSS Properties and Values API §2.4](https://www.w3.org/TR/css-properties-values-api-1/#calculation-of-computed-values) and [CSS Color 5 §7](https://drafts.csswg.org/css-color-5/#light-dark).

Consequently:

- the built-in scheme adapter defaults to **element-local** selection, preserving descendant `color-scheme` overrides;
- element-local native scheme output plus a typed registered public property is an error, because registration would freeze selection at the broader declaration root;
- an explicit universal (`syntax: '*'`) registration follows unregistered custom-property computation and may preserve element-local token-stream semantics, but it does not promise typed interpolation;
- an author may explicitly choose **root-bound** scheme semantics, after which typed registration and root computation are compatible;
- selector emission may replace native output only when it preserves the declared scheme semantics; it is not an excuse for a silent downgrade.

## 9. Schemes

Scheme becomes a built-in axis adapter, not a token/color special case.

The adapter may emit native `light-dark()` when:

- the token value type supports it;
- the browser/toolchain target permits it;
- its condition/override semantics match the requested scheme behavior.

Mutable scheme values compose with slots:

```css
:root {
  --app-brand--slot-scheme-light: oklch(...);
  --app-brand--slot-scheme-dark: oklch(...);
  --app-brand: light-dark(
    var(--app-brand--slot-scheme-light),
    var(--app-brand--slot-scheme-dark)
  );
}
```

Selector-based emission remains available where native optimization cannot represent the axis policy.

## 10. Overrides

The build-time grouped override primitive replaces `theme()` terminology:

```ts
const compactClass = ds.tokenOverride({
  size: {
    control: '28px',
  },
})
```

It must preserve the current valuable behavior:

- exact tree typing and typo diagnostics;
- override only named token inputs;
- re-resolve/re-emit downstream build-folded values where necessary;
- let CSS-dependent expressions continue to derive in the cascade;
- return an ordinary class in the system override layer;
- record provenance and overridden paths.

The canonical name is `ds.tokenOverride()`; `theme` is retired as the mechanism name.

## 11. Projections and public naming

Final names are deterministic from system prefix and kebab token path unless an explicit stable naming policy overrides them.

```ts
ds.tokensOf(colors)
ds.namesOf(colors)
ds.varsOf(colors)
```

Projections must work from config/plugin contexts without running style emission. This is required for SVG/icon pipelines and other TS configuration integration.

`$var(fallback?)` serializes a valid CSS `var()` expression and validates fallback data-type compatibility.

## 12. Manifest and explanation

The token manifest no longer hardcodes `{ light, dark }`:

```ts
interface VaneManifestToken {
  path: readonly string[]
  name?: `--${string}`
  type: string
  reference: 'val' | 'var'
  mutable: boolean
  declarations: readonly VaneManifestDeclaration[]
  dependencies: readonly VaneManifestEdge[]
  preview:
    | {
      status: 'resolved'
      val: string
      environment: Record<string, string>
      caveats?: readonly string[]
    }
    | {
      status: 'unavailable'
      reason: string
    }
  metadata: Record<string, unknown>
}

interface VaneManifestDeclaration {
  kind: 'base' | 'axis' | 'case' | 'override' | 'slot'
  val: string | number | null
  axis?: string
  mode?: string
  when?: Record<string, string>
  context: {
    root: string
    selectors: readonly string[]
    atRules: readonly string[]
    layer: string
  }
  source?: VaneSource
}
```

`explain(token)` returns or renders:

- authored source/module;
- data type and expression kind;
- dependency edges;
- reference/emission inference and reasons;
- fold result/refusal;
- resolved preview for the selected build environment, or an explicit reason one cannot be computed;
- emitted-expression browser-support requirement and any fallback/enhancement path;
- axes/cases and final order;
- public name and mutable slots;
- registration;
- DTCG portability;
- every emitted declaration context.

## 13. DTCG

```ts
importDesignTokens(document, options)
exportDesignTokens(dsOrModule, options)
```

Export modes:

1. **Resolved snapshot** — select an environment and emit broadly interoperable DTCG values/aliases/types where representable.
2. **Authored vane document** — include `com.mszr.vane-dux` extension data for axes, cases, graph operations, emission, registration, and metadata.

Vane-authored round trips are semantically lossless when every node is portable or has a plugin codec. Unknown DTCG extensions are preserved. Nonportable arbitrary TypeScript closures cannot be reconstructed; strict lossless export fails rather than lying.

External reference/network resolution is opt-in and separately secured.

## 14. Checks

Current graph checks, contrast guarantees, unused-token findings, scale audits, and metadata remain. They generalize over the new value/axis model:

- checks may resolve a specified environment snapshot;
- checks over mutable/live values report runtime guarantees or uncertainty honestly;
- axis totality/case conflicts/root placement/runtime slot issues have stable diagnostics;
- raw assertions and alias/policy escapes remain auditable.

## 15. Evidence

Completion requires:

- migration tests proving current graphs preserve intended output where semantics are unchanged;
- exact token config/type fixtures including null and typed no-default forms;
- all axis/base/partial/multi-axis/case combinations;
- exact authored/reserved branch handles and mutable `null` reservation fallback/reset;
- root-anchored selector and at-rule output;
- layer order independent of imports;
- mutable slot output and public registration interaction;
- graph rename and module isolation;
- module/name/var projections outside compiler execution;
- manifest/explain snapshots;
- DTCG standard snapshot and vane semantic round-trip fixtures;
- large graph completion/diagnostic/declaration budgets.
