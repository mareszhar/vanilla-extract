updated: 2026-07-15
status: canonical public language

# vanity — language

One term has one meaning. CSS terms retain their platform meaning; vanity terms name concepts CSS does not provide by itself.

## 1. The canonical sentence

> **An engine defines your system; a system styles your things.**

```ts
export const de = createEngine()

export const tokens = de.defineTokens(/* ... */)

export const ds = de.createSystem({
  tokens,
})
```

The `de` name is a recommended local convention for a design engine, not a required export. `ds` remains the recommended name for the resolved design system.

## 2. Vocabulary

| Term | Exact meaning |
| --- | --- |
| **engine** | The configured authoring environment used to define token modules and systems: values, plugins, axes, graph semantics, and policy. |
| **system** | One finalized token graph plus its bound styling, emission, introspection, and runtime APIs. |
| **CSS data type** | A platform value category such as `<color>`, `<length>`, or `<angle>`. |
| **expression** | A typed CSS-producing value: literal, function, calculation, reference, operation, or raw syntax. |
| **token** | A named design decision in the graph. A token is not synonymous with a custom property. |
| **token module** | An unfinished, independently composed token graph created by one engine. |
| **val reference** | Using a token's resolved CSS expression directly. |
| **var reference** | Using a token through `var(--custom-property)`. |
| **custom property** | A CSS property in the `--*` family. Never shortened to CCP in public API names. |
| **axis** | A mutually exclusive environmental dimension such as scheme, density, brand, or contrast. |
| **mode** | One value of an axis, such as `dark` or `compact`. |
| **case** | An explicit value for an intersection of two or more axis modes. |
| **condition** | A reusable circumstance composed from selectors and/or conditional at-rules. |
| **root** | The selector anchoring a system/module/group's emitted token declarations. |
| **emission context** | The effective root, condition, at-rules, and layer for one declaration. |
| **mutable token** | A token whose authored base/mode/case values receive runtime-addressable custom-property slots. |
| **runtime** | A finalized system bound to one concrete DOM/cascade root. |
| **token override** | A typed group of changes to token values. It may produce a build-time class or runtime assignments. |
| **port** | A component/style's published per-instance custom-property input with a default. |
| **plugin** | A reusable engine extension built through the same public contracts as built-ins. |
| **pattern** | A reusable class-generating styling composition. |
| **utility** | A pure value or style-fragment helper; not every utility is a pattern. |

`theme` remains an application/product word. Vanity does not use it for the primitive act of assigning arbitrary custom properties.

`scope` is reserved for CSS `@scope`. Conversational uses such as “scoped under the widget” are understandable, but APIs use `root`, `condition`, `selector`, and `context` precisely.

## 3. Engine authoring

The engine grows through staged, immutable links so later links receive exact earlier capabilities.

```ts
export const de = createEngine({
  color: {
    space: 'oklch',
  },

  length: {
    unitless: 'px',
  },

  tokens: {
    reference: 'var',
    emit: true,
  },
})
  .use(elevationPlugin())
  .extend({
    id: 'com.example.editorial-values',
    version: 1,
  }, ({ defineValue }) => ({
    editorial: {
      measure: defineValue(/* extension-owned serializer */),
    },
  }))
  .axes(({ axis, data, defaultMode, schemeIs, darken }) => ({
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
```

Axes use declaration order by default. Add `.axisOrder('density', 'scheme')` only when deliberate precedence differs from that order; the override autocompletes and must list every axis exactly once.

The engine object is kept intact. Destructuring a helper for local convenience is allowed, but examples should not scatter unrelated engine functions into a pseudo-global import surface.

## 4. Token definition

### 4.1 Raw shorthand

The common path is a value:

```ts
export const colors = de.defineTokens({
  color: {
    brand: de.oklch(0.58, 0.2, 285),
  },
})
```

The zero-config shorthand policy is `reference: 'var'` plus `emit: true`: `brand` emits an inspectable custom property and the resolved token handle uses `var()`. A project that deliberately prefers compile constants may configure `createEngine({ tokens: { reference: 'val', emit: false } })`; modules capture the engine policy under which they were defined.

### 4.2 Advanced configuration

Configuration uses `token()` so groups never reserve `val`, `axes`, `emit`, or other ordinary keys:

```ts
brand: de.token({
  val: de.oklch(0.58, 0.2, 285),
  reference: 'var',
  emit: true,
  mutable: true,
  description: 'Primary brand color',

  axes: {
    scheme: {
      dark: de.oklch(0.72, 0.16, 285),
    },
  },

  register: {
    inherits: true,
  },
})
```

Canonical fields:

| Field | Meaning |
| --- | --- |
| `val` | Base CSS value/expression. May be absent for a typed no-default token. |
| `reference` | `'val'` or `'var'`: the token's default representation when consumed. |
| `emit` | Whether to emit the ordinary value/property projection. Defaults from engine token policy; axes/mutability require a binding. |
| `mutable` | Whether stable runtime slots and setters are generated. Implies a var reference. |
| `axes` | Per-axis mode values. Axes/modes autocomplete from the engine. |
| `cases` | Explicit multi-axis intersection values. |
| `register` | Optional `@property` registration descriptors; syntax is inferred when possible. |
| `description` | Human/manifest description. |
| `deprecated` | Deprecation metadata and optional replacement. |
| `validate` | Optional runtime validation for mutable writes; build-time CSS validity remains universal. |

### 4.3 Null and no-default forms

```ts
fill: null
// untyped token/custom-property name; no value declaration

fill: de.token.color()
// typed <color>; no value declaration

breakpoint: de.token({
  val: de.length.rem(64),
  reference: 'val',
  emit: false,
})
// known compile value; deliberately no declaration
```

Null means “no authored value,” not CSS `unset`, `initial`, or an empty value.

### 4.4 Composition

```ts
export const tokens = de
  .defineTokens()
  .compose(colors)
  .compose(space)
  .derive(({ color }) => ({
    shadow: {
      focus: de.shadow({ color: color.brand }),
    },
  }))
```

Modules with incompatible semantic engine requirements fail with a signature diagnostic unless the plugin/value IR explicitly declares itself portable. Equivalent engines do not need to be the same object.

## 5. Resolved token handles

Every vanity-provided member that shares the token-tree namespace is `$`-prefixed:

```ts
t.color.brand.$name
t.color.brand.$val
t.color.brand.$var()
t.color.brand.$var(de.oklch(0.5, 0.1, 285))
t.color.brand.$description
t.color.brand.$axes.scheme.dark.$val
```

The token handle itself serializes according to `reference`:

```ts
css({ color: t.color.brand })
```

Code that requires a specific projection says so:

```ts
css({ color: t.color.brand.$val })
css({ color: t.color.brand.$var('currentColor') })
```

`$val` is a property. `$var()` is a method because it accepts an optional fallback.

Axis modes and cases are branch handles, not raw values and not separate public custom properties:

```ts
const dark = t.color.brand.$axes.scheme.dark

dark.$val
// no dark.$name or dark.$var(): the selected public property is brand.$name
```

Using `dark` directly in a value position serializes its authored `$val`, not the parent token's default `var()` projection. The corresponding `runtime.t` branch has the same shape and adds `$set()`/`$unset()` when the token is mutable. This keeps generic traversal plane-neutral while private runtime slot names stay private.

## 6. System creation and projections

```ts
export const ds = de.createSystem({
  tokens: de
    .defineTokens()
    .compose(colors)
    .compose(space),

  prefix: 'app',
  root: ':root',
  layers: ['reset', 'tokens', 'recipes', 'utilities', 'overrides'],
})
```

The system is the only final owner of the emitted prefix.

It returns the resolved graph and styling language:

```ts
ds.t
ds.css
ds.globalCss
ds.keyframes
ds.fontFace
ds.recipe
ds.anatomy
ds.port
ds.defineAtoms
ds.length
ds.oklch
ds.customProperty
ds.rawValue
ds.serialize
ds.runtime
ds.runtimeStyle
ds.runtimeProps
ds.reconcileRuntimeSnapshot
```

The system re-exposes its engine's configured value constructors and value plugins directly. Style modules therefore need only the system import; graph-definition operations remain on `de`.

The core system-member set is closed and versioned. Extensions should expose one distinctive namespace—such as the example's `ds.editorial.measure`—so future core capabilities and unrelated plugins cannot appropriate a generic top-level name unnoticed.

Module/tree projections are system-bound so names reflect the final prefix and naming policy:

```ts
ds.tokensOf(colors)
ds.namesOf(colors)
ds.varsOf(colors)

ds.namesOf(ds.t.color)
ds.namesOf({
  color: ds.t.color,
  icon: ds.t.icon,
})
```

`tokensOf()` returns resolved handles, `namesOf()` returns custom-property names, and `varsOf()` returns `var()` expressions with an isomorphic tree shape.

## 7. CSS values

Direct CSS remains the ergonomic floor:

```ts
ds.css({
  padding: '2em',
  color: 'oklch(60% 0.2 285)',
})
```

Brands add type and composition when wanted:

```ts
ds.css({
  padding: ds.length.em(2),
  rotate: ds.angle.deg(45),
})
```

Constructors accept ergonomic primitives and typed expressions:

```ts
ds.oklch(0.5, 0.2, 285)
ds.oklch(ds.percent(50), ds.calc(/* ... */), ds.angle.deg(285), 0.5)
```

Typed future syntax is explicit:

```ts
ds.rawValue.length('anchor-size(width)')
```

The raw escape validates broad CSS structure and carries the asserted data type; it does not pretend vanity understands the future function's semantics.

## 8. External custom properties

An external custom property uses the same handle vocabulary:

```ts
const mystery = de.customProperty('--mystery', {
  type: 'length',
})

mystery.$name
mystery.$var()
mystery.$var('4rem')
```

One-off use remains possible:

```ts
ds.css({
  padding: ds.customProperty('--mystery').$var('4rem'),
})
```

A future `varRef(name, fallback?)` may be added only as direct sugar over this same model.

## 9. Axes and cases

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

An omitted mode falls back to `val` when a base exists. A complete single-axis map may omit `val`. Multiple matching axes resolve in engine axis order; a matching case resolves after every single-axis declaration.

Resolved branch handles enumerate authored addresses only. A mutable `dark: null` mode or `{ when, val: null }` case explicitly reserves a typed runtime address without a build-time default; before it is set, its binding falls through to the value that otherwise would have won. Omitted modes/cases have neither a handle nor a slot.

## 10. Roots and conditions

The system root defaults to `:root`:

```ts
de.createSystem({
  root: '#widget',
  tokens,
})
```

A module may carry a nearer root. Group-local `$root` ships as the nearest refinement because it shares user structure; it accepts an absolute selector or composes an `&`-anchored selector against the inherited root.

Conditions anchor explicitly to the effective root:

```ts
condition('&[data-scheme="dark"]')
// #widget[data-scheme="dark"]

condition('[data-scheme="dark"] &')
// [data-scheme="dark"] #widget

condition('& [data-scheme="dark"]')
// #widget [data-scheme="dark"]

absoluteCondition('[data-scheme="dark"]')
// [data-scheme="dark"]
```

Typed helpers should express the same placement without string assembly:

```ts
data('scheme', 'dark', { on: 'root' })
data('scheme', 'dark', { on: 'ancestor' })
data('scheme', 'dark', { on: 'descendant' })
condition(media('print'), { priority: 0 })
```

Raw typed conditions require an `&` anchor or an explicit absolute constructor. No implicit descendant surprise.

## 11. Runtime language

Plane-neutral system handles contain CSS information:

```ts
ds.t.color.brand.$name
ds.t.color.brand.$var()
```

A runtime binds one system to one concrete cascade root:

```ts
const runtime = ds.runtime(document.documentElement)
```

Runtime-bound mutable handles add side effects:

```ts
runtime.t.color.brand.$set(newBrand)
runtime.t.color.brand.$unset()

const darkBrand = runtime.t.color.brand.$axes.scheme.dark

darkBrand.$val
darkBrand.$set(newDarkBrand)
```

Generic explicit-target operations work for any custom property:

```ts
import { setCustomProperties, setCustomProperty } from '@mszr/vanity/runtime'

setCustomProperty(element, ds.t.color.brand, value)
setCustomProperties(element, [
  [ds.t.color.brand, value],
  [externalProperty, otherValue],
])
```

Grouped token operations use token language, not theme language:

```ts
const compactClass = ds.tokenOverride({
  size: {
    control: '28px',
  },
})

runtime.applyTokenOverrides({
  size: {
    control: '32px',
  },
})

runtime.applyTokenOverrides([
  [ds.t.color.brand.$axes.scheme.dark, newDarkBrand],
])
```

`ds.tokenOverride()` is the canonical build-time class primitive. `runtime.applyTokenOverrides()` is the canonical runtime batch primitive. Its object form addresses base leaves; its tuple-entry form accepts plane-neutral mutable base/mode/case handles from the same system. Both runtime forms feed the same snapshot address model as `$set()`.

Snapshot schema changes reconcile per semantic address: valid overrides survive, invalid/removed ones produce migration diagnostics, and only an unsupported snapshot protocol rejects the document wholesale.

An app-plane validation schema is registered under the stable ID authored in `token({ validate: { id, schema } })`; schema functions never get embedded in generated style-module contracts. Runtime selector strings are intentionally absent—query an element explicitly, or omit the target only for a `:root` system.

## 12. Property aliases

Aliases are engine plugins:

```ts
const de = createEngine().use(propertyAliases({
  pb: 'paddingBottom',
  py: 'paddingBlock',
}, {
  expose: 'both', // or 'aliases-only'
}))
```

Aliases participate in `css()` IntelliSense and collision diagnostics. An aliases-only primary lane retains explicit standards access:

```ts
ds.css.standard({
  paddingBlock: '1rem',
})

ds.css.raw`padding-block: 1rem;`
```
