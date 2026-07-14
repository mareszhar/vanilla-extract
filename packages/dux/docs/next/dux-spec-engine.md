updated: 2026-07-14
status: target spec — engine/system authoring model, implementation pending

# vane-dux next — spec: engine and system

The engine defines the design-system language. The system finalizes one design system and exposes its styling language.

## Implementation ledger

| Contract | Current asset | Target state |
| --- | --- | --- |
| Root free functions | Broad package-root imports | Derive value/token helpers from `createEngine()`. |
| `createSystem(options)` | Implemented | Move canonical creation to `engine.createSystem(options)`. |
| Conditions/layers | Implemented and shared across surfaces | Preserve; integrate root-anchored conditions and token sublayers. |
| Token prefix | Accepted by builder and system | Final system is the sole owner. |
| Extensions | Ad hoc/internal/preset | Public `.use()`/`.extend()` dogfooded by built-ins. |
| Scheme | Hardcoded color/light/dark concept | Engine-defined general axes. |

## 1. `createEngine()`

```ts
const de = createEngine({
  color: {/* policy */},
  length: {/* policy */},
  validation: {/* policy */},
})
```

The zero-config call returns the complete default authoring environment. The one-line engine creation is intentional: it teaches the two-stage model and replaces a broad free-function import surface.

The engine object exposes value constructors and graph utilities directly:

```ts
de.oklch
de.length
de.calc
de.customProperty
de.rawValue
de.token
de.defineTokens
de.createSystem
```

Configuration changes defaults and policy without removing explicit CSS forms.

## 2. Staged extension

```ts
const de = createEngine()
  .use(plugin())
  .extend(context => ({
    values: {/* ... */},
    utilities: {/* ... */},
  }))
```

Each link receives the accumulated engine before it. Links are immutable: extending an engine creates a new engine identity and does not mutate modules already created from the previous engine.

Use `.use()` for reusable plugins with identity/configuration. Use `.extend()` for project-local capabilities. Do not proliferate separate `.utils()`, `.channels()`, `.units()`, and similar extension mechanisms unless a distinct lifecycle is proven.

## 3. Engine identity and portability

Every value node, token module, axis, and plugin capability records its originating engine identity.

- Values/modules from the same engine compose.
- Values created by a parent engine may compose into a derived engine when their semantics remain compatible.
- Incompatible policy/plugin identities produce a local diagnostic naming both engines/plugins.
- A plugin may mark a node/module as portable by resolving all required semantics into the public IR.

No failure may appear later as an undefined helper, missing serializer, or silently different unit/color policy.

## 4. Axes

Axes are declared after the engine helpers they may use:

```ts
const de = createEngine()
  .axes(({ axis, data, schemeIs, darken }) => ({
    scheme: axis({
      modes: {
        light: defaultMode(),
        dark: schemeIs('dark'),
      },

      derive: {
        dark: ({ light }) => darken(light, 0.4),
      },
    }),

    density: axis({
      modes: {
        compact: data('density', 'compact', { on: 'root' }),
        cozy: data('density', 'cozy', { on: 'root' }),
      },
    }),
  }))
  .axisOrder('scheme', 'density')
```

### 4.1 Axis contract

An axis defines:

- a unique name in the engine;
- literal mode names;
- a default/base relationship;
- one or more ordered condition bindings per mode;
- optional exposure/requirement policy for token groups;
- optional per-mode derivations;
- optional native emission optimization;
- manifest description.

An axis is not merely a record of selectors. It promises coherent mode semantics.

### 4.2 Order

`.axisOrder()` comes after `.axes()` so its arguments autocomplete. The type should require every declared axis exactly once unless the engine accepts declaration order explicitly.

Mode definitions stay object-shaped for mapped typing. If overlapping mode triggers need precedence, the axis uses an explicit typed order/binding-priority API. JavaScript insertion order is not the sole semantic contract.

Built-in scheme behavior orders user/OS preference below explicit application selection.

### 4.3 Exposure and derivation

Exposure/requirement paths must be typed against token structure only when that structure exists. Engine-time strings pointing into a future graph are not accepted as if they were safely typed.

Preferred solutions, in order:

1. group-local `$axes`/requirement metadata;
2. module identity supplied to axis configuration after module creation;
3. explicit reusable selectors with diagnostics;

The implementation must not claim type safety for unchecked future dot paths.

## 5. Token modules

`engine.defineTokens()` creates an unfinished module without final names/prefix:

```ts
export const colors = de.defineTokens(/* ... */)
```

It may be independently composed, derived, inspected structurally, and used for system-bound projections after finalization.

Pre-build modules do not expose final `$name`/`$var()` handles. Those depend on the final system prefix/root/naming policy.

Modules may carry emission metadata that the final system resolves:

```ts
de.defineTokens(tree, {
  root: '#widget',
  layer: 'tokens.components',
})
```

## 6. `engine.createSystem()`

```ts
const ds = de.createSystem({
  tokens: de
    .defineTokens()
    .compose(colors)
    .compose(space),

  prefix: 'app',
  root: ':root',
  layers: ['reset', 'tokens', 'recipes', 'utilities', 'overrides'],
  conditions: {/* loose styling conditions */},
  audit: {/* policy */},
})
```

System creation:

1. validates engine/module identity;
2. finalizes graph names once;
3. resolves values, axes, cases, checks, and references;
4. establishes layer order before emitting declarations;
5. emits token contracts/values/registrations;
6. binds styling APIs to tokens, conditions, and layers;
7. records manifest/provenance/runtime metadata;
8. returns serializable plane-neutral handles.

An already-finalized token graph from a different prefix/system is not silently accepted. The current double-prefix precedence surface is removed.

## 7. System root

`root` replaces generic emission “scope” terminology:

```ts
de.createSystem({
  root: '#widget',
  tokens,
})
```

Effective root precedence:

```text
nearest group root (if supported)
→ module root
→ system root
→ :root default
```

Module/group roots compose according to their explicit selector form; they are not concatenated as opaque strings without CSS parsing.

## 8. Conditions

Loose conditions continue to type `css`, recipes, anatomy, and atoms.

Axis mode bindings use the same condition IR but carry axis guarantees and explicit root placement. The two concepts share infrastructure without becoming synonyms.

Selector conditions use `&` as the effective-root anchor:

```ts
condition('&[data-x="y"]')
condition('[data-x="y"] &')
condition('& [data-x="y"]')
absoluteCondition('[data-x="y"]')
```

At-rule conditions wrap the root. Multiple arms emit deterministically in declared binding priority.

Every condition exposes its resolved selectors/at-rules in the manifest.

## 9. Emission and layers

The system declares its global layer root and nested layers before output.

Token emission receives ordered sublayers conceptually equivalent to:

```text
<prefix>.tokens.base
<prefix>.tokens.axes.<axis in order>
<prefix>.tokens.cases
<prefix>.tokens.overrides
```

Exact CSS flattening may vary with the emitter, but precedence cannot.

- Base values emit first.
- Axis declarations emit in engine order.
- Explicit cases emit after axes.
- Token-override classes emit after ordinary token declarations.
- Unlayered consumer normal declarations retain ordinary CSS precedence over layered framework declarations.

Module sublayers may refine organization without reordering axes.

## 10. Property aliases and authoring policy

Aliases are optional typed engine plugins:

```ts
createEngine().use(propertyAliases({
  pb: 'paddingBottom',
  py: 'paddingBlock',
}, {
  expose: 'both',
}))
```

The plugin controls completion/type exposure:

- `both`: aliases and standard properties;
- `aliases-only`: preferred `css()` lane exposes aliases, while `css.standard` and `css.raw` preserve platform reach.

Diagnostics cover alias/property/condition collisions, conflicting normalization, and shorthand/longhand hazards.

Core defines no aliases.

## 11. System projections

```ts
ds.tokensOf(moduleOrTree)
ds.namesOf(moduleOrTree)
ds.varsOf(moduleOrTree)
```

Requirements:

- preserve the input tree shape and literal keys;
- accept unfinished modules from the system's engine and resolved subtrees;
- accept composed objects of resolved subtrees;
- use final system prefix/naming policy;
- remain plane-neutral for use in config files and integrations;
- avoid triggering CSS emission when a name-only projection is requested outside style compilation.

## 12. Returned styling language

The refactor preserves the proven bound APIs unless a target spec explicitly changes them:

- `t`;
- `css` and `css.raw`;
- `globalCss`;
- `keyframes` and `fontFace`;
- `recipe` and `anatomy`;
- `port`;
- `defineAtoms`;
- layers, conditions, audits, provenance, and framework serialization.

New additions include projections, token overrides, runtime binding, and engine/plugin context where appropriate.

## 13. Evidence

Completion requires:

- editor/type fixtures for axis and plugin staged inference;
- incompatible-engine diagnostics;
- modular token completion/rename benchmarks;
- prefix/root finalization tests;
- emitted selector tests for every root placement;
- layer-order tests independent of module import order;
- property-alias completion and standards-lane escape fixtures;
- name/var projection in build, config, app-runtime, and SSR contexts;
- packed Vite/Nuxt examples using the canonical two-stage setup;
- declaration-size and completion-latency budgets on representative systems.
