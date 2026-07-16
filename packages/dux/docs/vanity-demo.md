updated: 2026-07-15
status: maintained showcase and integration-evidence contract

# vanity — flagship and comparison demos

The demos are product evidence. They should make vanity's capabilities tangible, show what delightful daily authoring feels like, and catch real integration failures. They are not the source of architecture and must not force unstable API decisions merely to preserve their current implementation.

## 1. Current role

- `sandbox/demo-main` is the polished design-system studio and flagship integration client.
- `sandbox/demo-comparisons` applies a smaller shared brief across Vanity and maintained peer approaches.
- Behavioral coverage is permanent. Visual concepts and component structure may evolve when a stronger showcase makes the capabilities clearer.
- **Prism** is a presentation choice, not product architecture.

The maintainer-provided prototype at `packages/dux/__references__/ds-demo-template` is visual/interaction inspiration: a control studio beside a credible application canvas. It is gitignored and therefore neither a required source asset nor a normative implementation template. The vanity demo should reach its own sleeker identity and express all styling through the final vanity APIs.

## 2. Flagship experience

The visitor should understand within one minute that one coherent TypeScript design system is driving the entire interface. Controls alter real design decisions, the application canvas reacts as a system rather than as disconnected inline values, and an inspectable view connects each visible change to its token/axis/runtime provenance.

The core studio controls are:

- **Palette/hue:** a live monochromatic or near-monochromatic OKLCH palette whose accent, neutral tint, interaction states, and legible foregrounds derive from one configurable hue/seed rather than a mirrored JavaScript color registry.
- **Appearance:** explicit light, dark, and system modes. System follows the platform preference without a flash; explicit selection wins predictably and survives SSR/hydration.
- **Elevation:** one semantic color-token set produces canvas/surface/raised/overlay roles across schemes. Components consume semantic roles, not parallel light/dark token trees.
- **Radius:** a mutable seed or selectable scale propagates through component recipes while preserving deliberate pill/circle exceptions.
- **Density:** compact, comfortable, and spacious modes affect spacing, control size, layout rhythm, and the density arm of shadow/elevation cases.
- **Shadows:** shadow tokens demonstrate independent scheme and density axes plus sparse exceptional cases, rather than a hand-maintained lookup table.
- **Typography:** configurable font roles/sets demonstrate typed font-family values, font faces, fallbacks, responsive type, and stable layout.
- **Motion:** none, subtle, and springy profiles demonstrate durations/easings/recipes and optional Motion for Vue orchestration. `prefers-reduced-motion` remains authoritative and “none” never depends on JavaScript racing CSS.

The studio includes a randomize action that produces a valid combination while keeping every control independently understandable. The hue control is one scrubber whose track is the hue spectrum; it never renders a second decorative bar beside the actual input.

## 3. CSS and vanity capability proof

The showcase must exercise capabilities because they improve the product, not as a checklist-shaped component gallery:

- modular `de.defineTokens()` inputs composed into one finalized `ds`;
- axes, partial modes, sparse cases, deterministic order, effective roots, and token layers;
- CSS-reactive derived values and runtime-mutable color and non-color tokens;
- `ds.runtime()` with validated setters, `$unset()`, snapshot persistence, SSR projection, and hydration without a theme flash;
- `@property` where it materially enables validation/interpolation, including honest scheme-locality policy;
- recipes, anatomy, ports, atoms/patterns, plugin-defined values or utilities, and standards/raw escape lanes;
- media queries for viewport/user preferences and container queries for independently responsive widgets;
- responsive layouts that visibly reorganize the studio and application canvas, not merely shrink typography;
- selectors, pseudo-classes, focus-visible states, keyframes/transitions, font faces, layers, and custom-property integration;
- manifest/provenance and `ds.explain()` surfaced in an optional inspector that can answer “why does this look this way?” without exposing private slot names;
- build-time CSS output that remains readable and useful in browser DevTools.
- foregrounds derived with `legibleOn()` or an equivalent checked pairing so brand actions remain readable across the supported hue range.

A realistic application canvas is preferred over a disconnected swatch wall. A small token/component specimen area may supplement it when a capability cannot be demonstrated naturally inside the application.

## 4. Implementation boundaries

The flagship remains Nuxt + Vue + Pug + TypeScript unless a later workspace decision explicitly changes the demo convention. vanity owns the styling system.

Vue SFCs use template-first order, `<template lang="pug">`, and `import * as s from './Component.style'`. Nuxt-native Vue helpers stay auto-imported; Vanity application auto-imports are visible opt-ins in `nuxt.config.ts`, never hidden module behavior. Style modules use explicit system imports unless the project visibly enables the separate style-module injection option.

All authored demo colors are OKLCH values or tokens derived from OKLCH values. Hex, RGB, and HSL literals do not enter demo source, including hidden integration fixtures.

Headless or narrowly focused helpers are welcome when they improve the result without replacing vanity's role, including VueUse, Pinia, Floating UI, Motion for Vue, Remeda, and accessible headless interaction primitives. Their responsibilities must remain explicit:

- state/persistence libraries manage application state, not a second token registry;
- Floating UI may calculate placement through ports/custom properties, not supply a component theme;
- motion libraries may orchestrate timelines/gestures while vanity owns design decisions, CSS fallbacks, and reduced-motion policy;
- no second CSS-in-TS framework, utility-CSS system, or themed component library styles the flagship.

Inline styles are limited to platform/runtime values whose owning contract explicitly requires them, such as runtime custom-property projection or third-party geometric coordinates. Authored component styling goes through vanity.

## 5. Comparison demo

The comparison demo should answer a narrower question: how do several current styling approaches express the same small, polished, interactive design and design-system change?

- Keep shared content, component behavior, viewport scenarios, and visual acceptance fixtures.
- Use the current official idioms of each maintained lane; do not deliberately hobble peers or hide their strengths.
- Prefer a concept small enough for credible parity—one responsive workspace/card flow with variants, states, tokens, and a theme/density change—rather than cloning the full studio everywhere.
- Measure authoring shape, type/editor behavior, emitted output, runtime cost, and maintenance change scenarios; avoid declaring a winner from line count alone.
- Revisit the lane list before releases so stale or unmaintained comparisons do not masquerade as ecosystem truth.

## 6. Acceptance evidence

The rebuilt flagship is complete only when:

1. every studio control changes the intended system decisions and resets cleanly;
2. light/dark/system, persisted overrides, SSR, hydration, and HMR pass without visual flash or state loss;
3. narrow phone, tablet/widget-container, and wide desktop layouts have deliberate browser-tested compositions;
4. keyboard navigation, focus visibility, landmarks, labels, contrast, reduced motion, and zoom behavior meet the accessibility gate;
5. the browser suite asserts computed design outcomes, not only that the page rendered;
6. the vanity inspector/provenance story can trace representative palette, elevation, density, shadow, and motion results;
7. production CSS survives the supported optimizer/toolchain matrix and the demo introduces no unexplained console/resource errors;
8. the public examples extracted from the demo compile from the packed package rather than workspace-only aliases;
9. the comparison lanes retain behavioral and visual parity for their shared brief; and
10. the source reads as an exemplary vanity codebase a serious adopter would enjoy learning from.

The inspector must render as a complete accessible dialog with a visible overlay, surface, focus treatment, and token context. Portals remain inside the effective Vanity root unless the system explicitly projects the required custom properties to another root.

Visual polish remains a real acceptance criterion, but it follows truthful capability, accessibility, and integration evidence. The flagship should feel aspirational because vanity makes the implementation coherent—not because the demo conceals bespoke styling outside the system.

## 7. Implemented evidence

- [`sandbox/demo-main`](../sandbox/demo-main) is the Nuxt + Vue + Pug Prism system studio. One engine composes palette/effect/foundation modules; public elevation and BEM plugins, scheme/density/elevation/motion axes, sparse shadow cases, mutable hue/radius/font values, typed ports, atoms/patterns, container/media responsiveness, a local custom property, raw `@starting-style`, and build-generated `ds.explain()` facts all style one credible application canvas.
- The studio persists semantic settings in a cookie, projects a runtime snapshot into SSR root props, binds the same snapshot at hydration, and resets through `$unset()`/mode clearing. Private mutable slot names are asserted only at the output boundary; the UI explains semantic paths and branches.
- [`sandbox/demo-comparisons`](../sandbox/demo-comparisons) is the deliberately smaller dispatch-card workflow across scoped SFC CSS, Tailwind, Panda, raw vanilla-extract, and vanity. The peer implementations were refreshed against linked official documentation and share content, state, variants, progress, explicit scheme, and responsive acceptance checks.
- [`tests/demos.spec.ts`](../tests/demos.spec.ts) locks computed runtime decisions, SSR first paint and persistence, keyboard/focus-visible behavior, labels/landmarks, reduced motion, 320px zoom-equivalent/independent-container/desktop compositions, optimizer-preserved light/dark behavior in every comparison lane, runtime isolation, registrations, and console/resource cleanliness.
- [`tests/dev/nuxt-dev.spec.ts`](../tests/dev/nuxt-dev.spec.ts) locks repeated styled first paint, dependency-token HMR without reload, runtime override survival, and exactly one reload for an export-shape change. [`scripts/dev-lifecycle.ts`](../scripts/dev-lifecycle.ts) proves repeated Nuxt start/stop releases both HTTP and HMR ports.

Hidden browser probes preserve difficult cascade and runtime coverage without forcing those mechanics into the visible product story.
