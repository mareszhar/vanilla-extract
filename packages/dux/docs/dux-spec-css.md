updated: 2026-07-15
status: canonical implemented specification

# vane-dux — spec: css authoring

The daily-driver surface: the engine-bound system and the typed authoring functions it exposes — `css`, conditions, layers, `keyframes`, `globalCss`, and the escape hatches.

Contracts here lean on the cross-cutting law: evaluation ([dux-patterns.md §1](./dux-patterns.md#1-evaluate-dont-extract-compile-dont-run)), the validation split ([§2](./dux-patterns.md#2-type-the-names-parse-the-values)), conditions ([§5](./dux-patterns.md#5-conditions)), layers ([§6](./dux-patterns.md#6-layer-discipline)), and escape-hatch grace ([§8](./dux-patterns.md#8-escape-hatch-grace)).

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | `createSystem` — bind once, typed everywhere | ☑ |
| 2 | `css()` — the style unit | ☑ |
| 3 | Conditions | ☑ |
| 4 | Selectors and cross-file references | ☑ |
| 5 | Layers | ☑ |
| 6 | `keyframes` and `fontFace` | ☑ |
| 7 | `globalCss` | ☑ |
| 8 | `css.raw` | ☑ |
| 9 | Value validation | ☑ (stable code, exact property path, and compiler-proven file/line/column) |
| 10 | Optional property-alias policy and standards/raw reach | ☑ |

---

## 1. `de.createSystem` — bind once, typed everywhere

**Why.** Panda-grade typing without Panda's generated artifact directory: a factory that closes over tokens, conditions, and layers returns authoring functions whose types are *inferred*, so a new condition or token is available everywhere the instant it's defined — no codegen lag, no stale artifacts, no diff noise. And because this is the one file every user must write on day one, its floor is engineered: tokens can be defined inline, `t` comes back out, layers default, and a universal base condition set is already there — the happy path is **one file, one call** ([§1.1](#11-the-happy-path-one-file)).

**Usage — the full form.** The engine owns the constructors used to define the
system, and the finalized system re-exposes them so daily style files need one
import.

```TS
// design/system.style.ts
import { createEngine } from '@mszr/vane-dux'

export const de = createEngine()
const tokens = de.defineTokens({
  color: { brand: de.oklch(0.58, 0.2, 285) },
})

export const ds = de.createSystem({
  tokens,
  prefix: 'prism',
  conditions: {
    open: '&[data-state="open"]',
    md: de.media('(min-width: 768px)'),
    lg: de.media('(min-width: 1024px)'),
    cardWide: de.container('card', '(min-width: 400px)'),
  },
  layers: ['reset', 'tokens', 'recipes', 'utilities', 'overrides'],
})

export const { t, css, recipe, anatomy, keyframes, globalCss, port } = ds
```

**Contract details.**

- One system per design system; the destructured functions are the app's whole authoring import surface.
- **`tokens` accepts an engine-bound token module, and `t` is always returned** beside the authoring functions — one import line serves every style file. Token modules can stay inline or compose across files ([dux-spec-tokens.md §1](./dux-spec-tokens.md#1-definetokens--the-graph-in-plain-ts)).
- **`layers` is optional**, defaulting to `['reset', 'tokens', 'recipes', 'utilities', 'overrides']`. Nobody needs to know what a cascade layer is to hello-world; declaring `layers` is how you take control when you do.
- **A base condition set is built in** — the platform-universal names, no opinions: `hover` (`&:hover` — exactly what it says), `hoverFocus` (`&:hover, &:focus-visible` — the interactive-affordance pair, named for what it does), `active` (`&:active`), `focusVisible`, `disabled`, `motionOk`, `motionReduce`, `dark`, `light`, `ltr`, `rtl`. User conditions merge over it; a same-named user condition overrides; `baseConditions: false` opts out entirely. Breakpoints, container sizes, and headless states are opinions and live in the preset ([dux-spec-preset.md §2](./dux-spec-preset.md#2-preset-conditions)).
- A condition name colliding with a CSS property is refused **at the definition key** (`VANE_SYSTEM_CONDITION_COLLISION`).
- Condition values are plain selector strings or the engine's typed helpers (`de.media`, `de.supports`, `de.container`, `de.schemeIs`, `de.data`, `de.aria`); helpers exist for readability, strings are never second-class. String forms: a selector containing `&`, or a bare at-rule (`'@media (min-width: 768px)'`).
- `de.createSystem` is itself evaluated build-time code; its returns are inert typed functions ([dux-patterns.md §1](./dux-patterns.md#1-evaluate-dont-extract-compile-dont-run)).

**Proposed approach.** A generic factory whose type parameters flow from the literal config (`const`-inferred), compiling each authoring call down to substrate primitives. No emitted `.d.ts` artifacts: inference is the codegen.

### 1.1 The happy path: one file

The canonical quickstart — the exact file the README and Nuxt module docs share:

```TS
// design/system.style.ts
import { createEngine } from '@mszr/vane-dux'
import { presetConditions, presetTokens } from '@mszr/vane-dux/preset'

export const de = createEngine()
export const ds = de.createSystem({
  tokens: presetTokens(de, { brand: '#635bff' }),
  conditions: presetConditions(de), // breakpoints, containers, preferences, states
})

export const { t, css, recipe, anatomy, port } = ds
```

One file, two imports, zero layer literacy, dark mode already working. Every capability remains reachable from here by *adding* keys — never by restructuring (principle 10).

---

## 2. `css()` — the style unit

**Why.** The style unit must feel like CSS with an index: typed properties, token-typed values, nesting as CSS now natively does it — and 100% of CSS reachable without leaving the type system's sight.

**Usage.**

```TS
// components/Card.style.ts
import { css } from '~/design/system.style'
import { t } from '~/design/tokens.style'

export const card = css({
  ...t.text.body,
  padding: t.space.md,
  background: t.color.surfaceRaised,
  border: `1px solid ${t.color.border}`,
  borderRadius: t.radius.md,

  hover: { background: t.color.surface },              // named condition
  md: { padding: t.space.lg },                          // responsive condition
  color: { base: t.color.ink, hover: t.color.brand },   // property-first map

  '&:has(> img:first-child)': { paddingTop: 0 },        // plain CSS, validated
  '@supports (view-transition-name: none)': { viewTransitionName: 'card' },
})
```

**Contract details.**

- Returns a class string; the rules compile away entirely.
- Properties are csstype-typed camelCase; values accept tokens, ports, plain CSS values, color-helper expressions (`alpha(t.color.ink, 0.42)` — [dux-spec-tokens.md §2](./dux-spec-tokens.md#2-liveness-compilation)), and template interpolations of any of them.
- **`css()` is open-valued: any valid CSS value is legal with no escape wrapper.** The token map guides; it never gates. (`unsafe.value` exists only in `atoms`, whose property sets are deliberately closed — [dux-spec-preset.md §3](./dux-spec-preset.md#3-atoms). A utility-CSS refugee looking for "arbitrary value syntax" here should find this sentence: there isn't one, because everything is already allowed and still parsed.)
- Numbers take the property's canonical unit where one exists (`padding: 8` → `8px`; unitless properties like `lineHeight`, `opacity`, `zIndex`, `flexGrow` stay unitless). The number→unit table **is** the substrate's proven table — vane-dux delegates rather than re-deriving it — ships in the manifest, and is locked by the output test plane; it must never be a guess.
- Nesting depth is unlimited; every non-property key is either a known condition, a selector, or an at-rule — anything else errors at the key.

### 2.1 CSS value composition

**Why.** TypeScript should improve the parts of CSS that are punctuation-heavy or composition-sensitive without wrapping values that already read naturally. One value layer feeds tokens, declarations, keyframes, ports, atoms, and `css.raw`; a utility never traps its result in a special lane.

```TS
import { ds, t } from '~/design/system.style'

const fluid = ds.clamp('1rem', ds.calc('2vw').add('0.5rem'), '3rem')
const columns = ds.grid.repeat('auto-fit', ds.grid.minmax('16rem', '1fr'))
const muted = ds.oklch.from(t.color.brand, {
  c: ds.channel.multiply(0.5),
  alpha: 0.72,
})

export const gallery = css({
  gap: fluid,
  gridTemplateColumns: columns,
  color: muted,
})
```

- `ds.calc(value)` is an immutable expression with `add`, `subtract`, `multiply`, `divide`, and `negate`. Nested calculations preserve precedence automatically. Known dimensions flow through the type (`length`, `percentage`, `angle`, `time`, and so on); known-invalid sums such as length + angle fail at the operand. A token's authored `$val` and a port's default participate in that inference when known; an arbitrary CSS variable degrades honestly to `unknown`.
- `min`, `max`, and `clamp` emit their platform functions. `grid.minmax`, `grid.repeat`, `grid.template`, and `grid.areas` compose Grid's punctuation-heavy value grammar.
- `oklch.from` and `channel.*` are the general relative-color primitive; the token compiler folds static inputs and keeps live graph edges as standards-native relative color syntax. Color constructors cover `oklch`, `oklab`, `lch`, `lab`, `hsl`, `rgb`, and `displayP3`.
- Every utility returns a `VaneCssValue`: ordinary `toString()` plus a readable `.css` fact. Strings remain first-class and preferred wherever CSS is already the clearest spelling (`'system-ui'`, `'1px solid currentColor'`, or a template interpolation). The utilities are leverage, never ceremony.

---

## 3. Conditions

The behavior contract lives in [dux-patterns.md §5](./dux-patterns.md#5-conditions); this entry owns the authoring specifics.

- **Bare keys, both directions.** `hover: { … }` and `color: { base, hover }` compile identically; mixing directions in one rule is legal. House style so teams don't relitigate it per PR: group a state's declarations selector-first; reach for property-first when one property varies across three or more states.
- **Conditions compose by nesting:** `open: { motionOk: { animation: … } }` emits the intersection.
- **`base`** is the unconditioned arm of a property-first map; omitting it means "no unconditioned declaration".
- **Container conditions** reference containers declared via `containerName`/`containerType` declarations or the `container()` helper's named handle. One rule queries one container — the substrate emits a single `@container` per rule, and nesting a second is a diagnostic.
- **Scheme conditions compile to two arms.** `dark:` means "the effective scheme is dark": a rule under a `[data-scheme='dark']` subtree, plus the OS preference outside any `[data-scheme='light']` subtree. Nesting a condition with several arms intersects each arm separately.

```TS
export const accordionContent = css({
  overflow: 'hidden',
  open: { motionOk: { animation: `${slideDown} 200ms ease-out` } },
})
```

---

## 4. Selectors and cross-file references

**Why.** Selector strings are where CSS's silent breakage lives — `:deep(.card .title)` breaks when the child renames a class, silently, at runtime. Making cross-file references *imports* moves that failure to the editor.

**Usage.**

```TS
import { button } from '../Button/Button.style'

export const toolbar = css({
  display: 'flex',
  gap: t.space.xs,
  [`${button} + ${button}`]: { marginInlineStart: 0 },  // typed class reference
  [`& ${button}`]: { borderRadius: 0 },                  // parent-scoped child rule
})
```

**Contract details.**

- A style handle interpolated into a selector resolves to its generated class; recipe and anatomy-part handles interpolate the same way. Renaming the export renames the relationship.
- Interpolation is the *only* boundary-crossing form — deliberately. It looks like what it is (a selector reaching into a child), which keeps the honest hierarchy visible: theme a child's *values* through its ports ([dux-patterns.md §4](./dux-patterns.md#4-the-runtime-boundary-is-a-port)); select into a child's *structure* only when you own it, and the interpolated class says so in plain sight. A friendlier `within()` sugar was considered and deferred — a comfortable wrapper here would hand every `:deep()` refugee a crutch that delays learning ports ([dux-vision.md §8](./dux-vision.md#8-deferred-intentions)).
- All selectors — helper-built or raw — go through the same build-time parser (§9).

---

## 5. Layers

Per [dux-patterns.md §6](./dux-patterns.md#6-layer-discipline). Authoring specifics:

- `css()` defaults to the system's first non-reserved authoring layer (`recipes` in the preset order); override per style with `layer: 'overrides'`.
- The emitted stylesheet declares `@layer` order once, from the system config — app CSS outside vane-dux can slot into the same order by name.
- **Emission nests under the prefix.** Authoring says `layer: 'overrides'`; the CSS says `@layer vane.overrides` (or `prism.overrides` under `prefix: 'prism'`). Cascade-layer order is *global* and first-declaration-wins, so bare names like `utilities` would couple a system to every coexisting framework's layer order (Tailwind and Panda both claim them); nesting means the only global name a system claims is its own namespace. When a coexisting framework layers aggressive resets (Tailwind's preflight), pin the order once, before any stylesheet loads: `@layer theme, base, components, utilities, vane;` — the comparison sandbox demonstrates the whole dance.

```TS
export const launchHeroFix = css({
  layer: 'overrides',
  '& [data-vendor-widget] iframe': { maxWidth: '100%' },
})
```

---

## 6. `keyframes` and `fontFace`

**Why.** Animations and fonts are values, not global names — anonymous at-rules whose identity is the export that holds them.

**Usage.**

```TS
const slideDown = keyframes({
  from: { blockSize: 0, opacity: 0 },
  to: { blockSize: 'var(--reka-accordion-content-height)', opacity: 1 },
})

export const content = css({
  open: { motionOk: { animation: `${slideDown} 200ms ease-out` } },
  closed: { motionOk: { animation: `${slideDown} 150ms ease-in reverse` } },
})
```

**Contract details.** Steps are declaration-only rule objects: tokens, ports, and color helpers are legal inside, but condition and selector keys are **type errors at the key** — a `hover:` inside a keyframe step is semantically meaningless, so the grammar refuses it rather than silently ignoring it. The handle interpolates as the generated name. `fontFace(descriptor)` follows the same shape. `@starting-style` and `transition-behavior` need no wrapper — they're plain keys (§2).

---

## 7. `globalCss`

**Why.** Resets, base element styles, and third-party overrides are genuinely global; the global lane must be explicit, layered, and just as validated as the scoped one.

**Usage.**

```TS
globalCss('html, body', {
  layer: 'reset',
  margin: 0,
  background: t.color.canvas,
  color: t.color.ink,
})
```

**Contract details.** Same rule shape as `css()` including conditions; no class is generated. Global rules default to the `reset` layer and are enumerated by the escape audit when they target third-party selectors ([dux-spec-introspection.md §3](./dux-spec-introspection.md#3-audits)).

---

## 8. `css.raw`

**Why.** Some styling is a blob by nature — markdown prose, a vendor widget. The escape hatch is CSS itself: still scoped, still validated, still token-interpolating, so stepping off the object syntax costs nothing else.

**Usage.**

```TS
export const prose = css.raw`
  h2 { margin-block: 1.5em 0.5em; }
  a  { text-underline-offset: 2px; color: ${t.color.brand}; }
`
```

**Contract details.** Scoped under the generated class; parsed at build (typos still caught, §9); deliberately allowed to target descendants — "style this markdown output" is a legitimate need, not a failure. Raw blocks are enumerated by the audit.

---

## 9. Value validation

**Why.** The other half of "type the names, parse the values" ([dux-patterns.md §2](./dux-patterns.md#2-type-the-names-parse-the-values)): value grammar is beyond the type system's economic reach, so a real CSS parser validates every emitted rule at build.

**Contract details.**

- Every declaration — object, raw, global, keyframe step — is parsed; an invalid value is a build diagnostic with file:line, the offending property, and the reason (`VANE_CSS_INVALID_VALUE`).
- Unknown properties pass through only under an explicit vendor/experimental marker; otherwise they error (the silent-failure ban is absolute).
- Diagnostics land within the HMR loop — save, and the overlay names the line; never later than the reload.
- **Setup failures are diagnosed too.** Importing a `*.style.ts` module without the `/vite` plugin registered produces one friendly error naming the missing plugin and the config line to add (`VANE_VITE_PLUGIN_MISSING`) — never a raw Node evaluation stack. The bounce point of a misconfigured first install gets the same message quality as a typo'd property.

**Implementation.** Validation runs at evaluation time in the core, so every bundler gets the same diagnostics. The work is split between two authorities: **lightningcss owns grammar** — a known property whose value fails its typed grammar (and carries no `var()` or unknown function, whose grammar only the browser can decide) is refused, as are unparseable selectors and queries; **the W3C property list owns existence** (`known-css-properties`), so a platform property lightningcss has not learned yet is never blocked (principle 6) — only a name in neither authority errors. Checks memoize per declaration. The `/vite` compiler injects syntax-tree-derived call/property locations into compiler-owned app modules; diagnostics use only exact or uniquely attributable positions and never guess.

---

## 10. Optional property aliases

Core owns no aliases. A typed engine plugin may shorten real CSS property names without creating an alternate utility vocabulary:

```ts
const de = createEngine().use(propertyAliases({
  py: 'paddingBlock',
  bg: 'background',
}, {
  expose: 'both', // or 'aliases-only'
}))
```

Alias policy finalizes the typed authoring vocabulary, so install it after axes and other engine plugins, immediately before creating systems. This deliberate ordering keeps exact `css()` completion local to systems that opted in instead of recursively cloning the full CSS property graph through every earlier engine stage.

Aliases flow into `css()` completion with the target property's value type at every rule depth, including named conditions, selectors, and at-rules, then normalize before the ordinary compiler/parser. Collisions with CSS properties, system conditions, or a same-arm standard declaration are diagnostics in the arm where they occur.

`both` exposes aliases beside standard names. `aliases-only` removes only each aliased target spelling from the primary `css()` type/runtime lane; every unrelated standard property remains available. Full platform reach is permanent:

```ts
ds.css({ py: '1rem' })
ds.css.standard({ paddingBlock: '1rem' })
ds.css.raw`padding-block: 1rem;`
```

The capability travels through the public engine plugin protocol as a symbol-backed policy contribution, not a synthetic daily constructor or private compiler privilege. Its stable configuration fingerprint participates in semantic engine identity.
