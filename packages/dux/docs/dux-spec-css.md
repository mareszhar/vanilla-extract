updated: 2026-07-07
status: spec — contracts settled, implementation pending

# vane-dux — spec: css authoring

The daily-driver surface: the system factory and the typed authoring functions it binds — `css`, conditions, layers, `keyframes`, `globalCss`, and the escape hatches. Phase 2 of the roadmap.

Contracts here lean on the cross-cutting law: evaluation ([dux-patterns.md §1](./dux-patterns.md#1-evaluate-dont-extract-compile-dont-run)), the validation split ([§2](./dux-patterns.md#2-type-the-names-parse-the-values)), conditions ([§5](./dux-patterns.md#5-conditions)), layers ([§6](./dux-patterns.md#6-layer-discipline)), and escape-hatch grace ([§8](./dux-patterns.md#8-escape-hatch-grace)).

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | `createSystem` — bind once, typed everywhere | ☐ |
| 2 | `css()` — the style unit | ☐ |
| 3 | Conditions | ☐ |
| 4 | Selectors and cross-file references | ☐ |
| 5 | Layers | ☐ |
| 6 | `keyframes` and `fontFace` | ☐ |
| 7 | `globalCss` | ☐ |
| 8 | `css.raw` | ☐ |
| 9 | Value validation | ☐ |

---

## 1. `createSystem` — bind once, typed everywhere

**Why.** Panda-grade typing without Panda's generated artifact directory: a factory that closes over tokens, conditions, and layers returns authoring functions whose types are *inferred*, so a new condition or token is available everywhere the instant it's defined — no codegen lag, no stale artifacts, no diff noise. And because this is the one file every user must write on day one, its floor is engineered: tokens can be defined inline, `t` comes back out, layers default, and a universal base condition set is already there — the happy path is **one file, one call** ([§1.1](#11-the-happy-path-one-file)).

**Usage — the full form.**

```TS
// design/system.style.ts
import { container, createSystem, media, schemeIs } from '@mszr/vane-dux'
import { t } from './tokens.style'

export const { css, recipe, anatomy, keyframes, globalCss, port, theme } = createSystem({
  tokens: t,
  prefix: 'prism',
  conditions: {
    open: '&[data-state="open"]',
    md: media('(min-width: 768px)'),
    lg: media('(min-width: 1024px)'),
    cardWide: container('card', '(min-width: 400px)'),
  },
  layers: ['reset', 'tokens', 'recipes', 'utilities', 'overrides'],
})
```

**Contract details.**

- One system per design system; the destructured functions are the app's whole authoring import surface.
- **`tokens` accepts a raw graph or a `defineTokens` result, and `t` is always returned** beside the authoring functions — one import line serves every style file. The separate tokens file remains the library-authoring form ([dux-spec-tokens.md §1](./dux-spec-tokens.md#1-definetokens--the-graph-in-plain-ts)); nothing requires it.
- **`layers` is optional**, defaulting to `['reset', 'tokens', 'recipes', 'utilities', 'overrides']`. Nobody needs to know what a cascade layer is to hello-world; declaring `layers` is how you take control when you do.
- **A base condition set is built in** — the platform-universal names, no opinions: `hover` (`&:hover` — exactly what it says), `hoverFocus` (`&:hover, &:focus-visible` — the interactive-affordance pair, named for what it does), `active` (`&:active`), `focusVisible`, `disabled`, `motionOk`, `motionReduce`, `dark`, `light`, `ltr`, `rtl`. User conditions merge over it; a same-named user condition overrides; `baseConditions: false` opts out entirely. Breakpoints, container sizes, and headless states are opinions and live in the preset ([dux-spec-preset.md §2](./dux-spec-preset.md#2-preset-conditions)).
- A condition name colliding with a CSS property is refused **at the definition key** (`VANE_SYSTEM_CONDITION_COLLISION`).
- Condition values are plain selector strings or the typed helpers (`media`, `container`, `schemeIs`, `data`, `aria`); helpers exist for readability, strings are never second-class.
- `createSystem` is itself evaluated build-time code; its returns are inert typed functions ([dux-patterns.md §1](./dux-patterns.md#1-evaluate-dont-extract-compile-dont-run)).

**Proposed approach.** A generic factory whose type parameters flow from the literal config (`const`-inferred), compiling each authoring call down to substrate primitives. No emitted `.d.ts` artifacts: inference is the codegen.

### 1.1 The happy path: one file

The canonical quickstart — the exact file the README, the Nuxt module docs, and `sandbox/demo-minimal` share:

```TS
// design/system.style.ts
import { createSystem } from '@mszr/vane-dux'
import { presetConditions, presetTokens } from '@mszr/vane-dux/preset'

export const { t, css, recipe, anatomy, port, theme } = createSystem({
  tokens: presetTokens({ brand: '#635bff' }),
  conditions: presetConditions(), // adds breakpoints, container sizes, headless states
})
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
- Numbers take the property's canonical unit where one exists (`padding: 8` → `8px`; unitless properties like `lineHeight`, `opacity`, `zIndex`, `flexGrow` stay unitless); ambiguous cases are a type error asking for a unit. The number→unit table follows the substrate's proven behavior, ships in the manifest, and is locked by the output test plane — it must never be a guess.
- Nesting depth is unlimited; every non-property key is either a known condition, a selector, or an at-rule — anything else errors at the key.

---

## 3. Conditions

The behavior contract lives in [dux-patterns.md §5](./dux-patterns.md#5-conditions); this entry owns the authoring specifics.

- **Bare keys, both directions.** `hover: { … }` and `color: { base, hover }` compile identically; mixing directions in one rule is legal. House style so teams don't relitigate it per PR: group a state's declarations selector-first; reach for property-first when one property varies across three or more states.
- **Conditions compose by nesting:** `open: { motionOk: { animation: … } }` emits the intersection.
- **`base`** is the unconditioned arm of a property-first map; omitting it means "no unconditioned declaration".
- **Container conditions** reference containers declared via `containerName`/`containerType` declarations or the `container()` helper's named handle.

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

**Proposed approach.** lightningcss parses the assembled rules during evaluation in the `/vite` plugin, mapping positions back through the emitter's source map to the `.style.ts` expression.
