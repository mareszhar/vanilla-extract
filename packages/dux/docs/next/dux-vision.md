updated: 2026-07-14
status: target vision — normative for the next architecture

# vane-dux next — vision

> **vane-dux is a TypeScript harness for CSS.** It lets authors harness the full power of CSS through a language that feels native to TypeScript: inferred, composable, extensible, refactorable, inspectable, and delightful.

The library is an answer to one question: **what would feel like the most delightful way to style things with TypeScript?** The answer is not a replacement for CSS. It is a harness around CSS that makes difficult design-system work approachable without taking platform capabilities away.

## 1. The promise

When vane-dux names a CSS concept, it should:

1. accept everything that concept accepts, subject only to an explicit documented maturity tier;
2. preserve platform semantics rather than approximate them invisibly;
3. emit ordinary inspectable CSS;
4. add useful TypeScript inference and validation;
5. compose with tokens, custom properties, axes, plugins, and design-system structure;
6. provide an honest escape for CSS the library does not yet understand.

CSS is the floor, not the ceiling. `oklch()` must be as capable as CSS `oklch()`. A length constructor cannot make `'2em'` invalid. A strict property-alias policy cannot make standard CSS unreachable. New platform syntax cannot wait for a vane release before users can employ it.

## 2. The semantic foundation

Every styling value is understood through four independent dimensions.

### 2.1 CSS data type

What kind of value is this?

Examples: `<color>`, `<length>`, `<percentage>`, `<angle>`, `<time>`, `<custom-ident>`, a composite type, or an explicitly unknown/future type.

The type answers where the value may be used and which operations are valid. It does not decide whether the value is a token, custom property, literal, or runtime input.

### 2.2 CSS expression

What produces the value?

Examples: a literal, function, calculation, token reference, external custom-property reference, operation, raw future syntax, or derived expression.

Expressions serialize to CSS and carry dependency/foldability information. Build-time evaluation is an optimization available only when it preserves platform semantics.

### 2.3 Token representation and emission

How is a design decision referenced and projected into CSS?

A token may be referenced by its resolved `val` or through a `var()` custom-property reference. Its declaration may be emitted, omitted, registered with `@property`, or represented only as a name supplied by another system.

Those choices are related but not collapsed into one flag.

### 2.4 Variation and mutability

How may the value differ across environments or time?

Axes select values from CSS conditions. Derived expressions react through CSS dependencies. Mutable tokens expose runtime-addressable custom-property slots. Ports expose per-instance component inputs. None of these changes the underlying CSS data type.

## 3. The two-stage language

### 3.1 The engine defines a design system

`createEngine()` constructs the authoring environment:

- CSS value constructors and policies;
- data-type brands and operations;
- public plugins and extensions;
- axes and their conditions/derivations;
- token definition, composition, and graph checks;
- optional property aliases and authoring policies.

The engine is reusable and immutable through staged extension. An extension sees everything defined before it, so sibling utilities and axis derivations receive exact inference.

### 3.2 The system styles with that design system

`engine.createSystem()` finalizes one composed token graph and returns:

- resolved token handles;
- the engine's configured value constructors and value plugins for one-import style authoring;
- `css`, global CSS, keyframes, and font faces;
- recipes, anatomy, ports, atoms, and patterns;
- conditions and layers bound to this system;
- token/name/var projections;
- manifests, audits, and runtime binding.

The sentence to remember is:

> **An engine defines your system; a system styles your things.**

There is no mandatory intermediate public stage and no need to destructure the same engine utilities into sibling callbacks.

Engine compatibility is semantic rather than object-referential: equivalent HMR evaluations and duplicate package instances remain compatible when their normalized policies and stable plugin signatures match.

## 4. The three execution planes

The existing plane separation remains valuable and becomes more precise.

### 4.1 Contract plane

Engines, token modules, axes, conditions, layers, recipe definitions, ports, and metadata describe styling decisions and relationships as typed data.

### 4.2 Compiled plane

`*.style.ts` modules execute at build time. They may use ordinary TypeScript without static-analyzer restrictions. CSS rules, classes, custom-property bindings, registrations, and manifests are emitted statically.

### 4.3 Live plane

The browser owns the live cascade. Runtime code may:

- write custom-property values;
- select modes through attributes/classes already represented in emitted CSS;
- resolve precompiled recipe choices;
- snapshot and hydrate declared runtime values.

Runtime code does not reconstruct the token graph or patch extracted stylesheets. New CSS rules require an explicit optional runtime-sheet capability rather than appearing as an accidental setter behavior.

## 5. Design principles

When principles pull against one another, earlier ones win.

1. **Delight governs.** Design for the person authoring, reading, debugging, and extending the system. Implementation convenience is not product evidence.
2. **Harness all of CSS.** CSS concepts retain platform capability and terminology. Vane adds leverage; it does not create a smaller substitute language.
3. **Separate independent concerns.** Data type, expression, representation, emission, variation, and mutability remain composable dimensions.
4. **Boilerplate is active harm.** Inference and composition remove repeated declarations, mirrored registries, string paths, and framework glue.
5. **Errors arrive at the cursor or build.** Names and structure belong to TypeScript; value grammar belongs to real CSS parsing; supported runtime inputs validate at the boundary.
6. **The browser is the runtime.** Cascade, inheritance, custom properties, media/container queries, layers, relative colors, and native functions do the live work.
7. **Boring CSS is the contract.** Output remains inspectable, portable, overrideable, and useful if vane disappears.
8. **Predictability beats magic.** Root composition, axis precedence, folding, runtime targets, and escapes are visible and introspectable.
9. **Power is opt-in.** Raw values stay light. Brands, registration, mutability, axes, strict aliases, DTCG, and advanced plugins are reached for deliberately.
10. **Capabilities and policies differ.** A project may enforce a narrow preferred lane; a standards/raw lane keeps the full platform available.
11. **Extensions are first-class.** Users can create the same kinds of values and utilities as vane without subclassing private implementation types.
12. **Diagnostics and provenance are product surfaces.** A warning without locality and a value without an explanation trail are unfinished features.
13. **Frameworks are clients.** Vue/Nuxt receive excellent adapters without entering the core value/token language.
14. **Evidence outranks completion claims.** Runtime, types, editor behavior, emitted CSS, integration, packaging, and performance are separate gates.
15. **The implementation must be as legible as the API.** One source of truth per concept, explicit layer boundaries, and public primitives dogfooded internally.

## 6. CSS and ecosystem alignment

The CSS specifications supply canonical concepts such as custom properties, `var()`, data types, selectors, conditions, cascade layers, `@property`, and `@scope`. Vane uses those names unless it introduces a genuinely higher-level design-system concept such as token, axis, mode, recipe, anatomy, or port.

Alignment does not mean freezing to today's grammar. CSS data types and functions evolve. Vane maintains:

- typed first-class support for stable/high-value syntax;
- maturity annotations for experimental helpers;
- raw typed escapes for future syntax;
- conformance fixtures derived from authoritative specifications and web-platform behavior.

Ecosystem standards are adapters, not internal authorities. DTCG describes interchange tokens; Standard Schema describes validation; neither is allowed to distort the daily authoring API.

## 7. The capability boundary

### In scope

- typed CSS values and operations;
- design-token graphs, modules, axes, derivations, checks, metadata, and custom-property projection;
- typed CSS authoring, conditions, selectors, at-rules, layers, and raw CSS;
- variants, anatomy, ports, atoms, patterns, and utilities;
- runtime custom-property binding for declared mutable values;
- Vue/Nuxt integration, SSR/HMR, manifests, audits, DTCG adapters, and plugin authoring.

### Pass-through or opt-in

- arbitrary new CSS syntax through raw/typed escapes;
- nonstandard design conventions such as elevation channels and BEM helpers through plugins;
- property aliases through policy plugins;
- runtime selector-rule injection through a separate explicit sheet capability if justified.

### Out of scope

- a runtime CSS-in-JS engine;
- a component library;
- reconstructing arbitrary TypeScript source from interchange formats;
- silently owning or patching arbitrary application stylesheets;
- forcing every project into a preset, alias vocabulary, design-tool schema, or framework.

## 8. Delight gauntlet

The existing gauntlet remains, with the color-only runtime framing broadened.

1. Rename a token across composed modules and consumers with native editor refactors.
2. Add a scheme axis without component edits.
3. Live-tune a brand color and have dependent CSS expressions update without JS recomputation.
4. Live-tune a non-color value such as density, radius, or spacing with the same typed runtime model.
5. Define a multi-axis token and make one explicit intersection case without authoring a Cartesian matrix.
6. Override a component's published custom-property contract without selector archaeology or `!important`.
7. Style headless states through typed conditions.
8. Bind reactive component state through a typed port.
9. Use a CSS feature vane has never heard of without losing the rest of the system.
10. Trace a rendered declaration to its class, authoring call, token, axis/case, and source value.
11. Export a portable DTCG snapshot and a semantically lossless vane-authored document where all nodes are portable.
12. Extend the engine with a custom typed value and use it everywhere a built-in value can be used.
13. Render persisted runtime overrides during SSR and hydrate without a flash.
14. Copy a packed quickstart into strict Vite and Nuxt applications with no repository aliases.
15. Let an agent make a wrong token/condition/value guess and self-correct from types, diagnostics, and manifest context.

## 9. Output and override stance

- Non-atomic rules remain the default authoring/output model.
- Every vane rule belongs to a declared system layer.
- Token declarations receive explicit base/axis/case/override sublayers.
- Unlayered consumer CSS retains the platform's ordinary ability to override layered framework output.
- Selectors and at-rules remain visible in generated CSS; conditions are reusable descriptions, not a hidden alternative cascade.
- Mutable runtime slots are custom properties, not JS state masquerading as design tokens.
- Internal slot names are stable enough for serialized runtime handles but are not the public consumer contract.

## 10. Success condition

The refactor succeeds when users experience one coherent continuum:

```text
CSS primitive
  → typed expression
  → design token
  → axis/case/custom-property projection
  → style/recipe/port usage
  → emitted CSS
  → runtime update where explicitly declared
  → provenance and interoperable export
```

No step should require changing languages, copying string paths, maintaining parallel registries, or accepting less CSS than the browser supports.
