updated: 2026-07-14
status: target showcase brief — Phase 8; implementation intentionally deferred until the public surface is stable

# vane-dux next — flagship and comparison demo brief

The demos are product evidence. They should make vane-dux's capabilities tangible, show what delightful daily authoring feels like, and catch real integration failures. They are not the source of architecture and must not force unstable API decisions merely to preserve their current implementation.

## 1. Rebuild mandate

The Phase 8 work is a deliberate rebuild, not a mechanical migration of the current demos.

- `sandbox/demo-main` keeps serving as a regression fixture until its replacement reaches parity, then becomes a polished design-system studio/showcase.
- `sandbox/demo-comparisons` is redesigned around a smaller concept that can be implemented honestly across every maintained peer lane.
- Existing behavioral coverage is preserved or replaced before old screens are removed; visual concepts and component structure carry no compatibility promise.
- The working name may remain **Prism**, but naming and art direction are presentation choices, not architecture.

The maintainer-provided prototype at `packages/dux/__references__/ds-demo-template` is visual/interaction inspiration: a control studio beside a credible application canvas. It is gitignored and therefore neither a required source asset nor a normative implementation template. The vane demo should reach its own sleeker identity and express all styling through the final vane APIs.

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

Presets may compose those decisions into named personalities and a “surprise me” interaction may generate valid combinations, but every control remains independently understandable.

## 3. CSS and vane capability proof

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

A realistic application canvas is preferred over a disconnected swatch wall. A small token/component specimen area may supplement it when a capability cannot be demonstrated naturally inside the application.

## 4. Implementation boundaries

The flagship remains Nuxt + Vue + Pug + TypeScript unless a later workspace decision explicitly changes the demo convention. vane-dux owns the styling system.

Headless or narrowly focused helpers are welcome when they improve the result without replacing vane's role, including VueUse, Pinia, Floating UI, Motion for Vue, Remeda, and accessible headless interaction primitives. Their responsibilities must remain explicit:

- state/persistence libraries manage application state, not a second token registry;
- Floating UI may calculate placement through ports/custom properties, not supply a component theme;
- motion libraries may orchestrate timelines/gestures while vane owns design decisions, CSS fallbacks, and reduced-motion policy;
- no second CSS-in-TS framework, utility-CSS system, or themed component library styles the flagship.

Inline styles are limited to platform/runtime values whose owning contract explicitly requires them, such as runtime custom-property projection or third-party geometric coordinates. Authored component styling goes through vane.

## 5. Comparison demo

The comparison demo should answer a narrower question: how do several current styling approaches express the same small, polished, interactive design and design-system change?

- Keep shared content, component behavior, viewport scenarios, and visual acceptance fixtures.
- Use the current official idioms of each maintained lane; do not deliberately hobble peers or hide their strengths.
- Prefer a concept small enough for credible parity—one responsive workspace/card flow with variants, states, tokens, and a theme/density change—rather than cloning the full studio everywhere.
- Measure authoring shape, type/editor behavior, emitted output, runtime cost, and maintenance change scenarios; avoid declaring a winner from line count alone.
- Revisit the lane list during Phase 8 so stale/unmaintained comparisons do not masquerade as ecosystem truth.

## 6. Acceptance evidence

The rebuilt flagship is complete only when:

1. every studio control changes the intended system decisions and resets cleanly;
2. light/dark/system, persisted overrides, SSR, hydration, and HMR pass without visual flash or state loss;
3. narrow phone, tablet/widget-container, and wide desktop layouts have deliberate browser-tested compositions;
4. keyboard navigation, focus visibility, landmarks, labels, contrast, reduced motion, and zoom behavior meet the accessibility gate;
5. the browser suite asserts computed design outcomes, not only that the page rendered;
6. the vane inspector/provenance story can trace representative palette, elevation, density, shadow, and motion results;
7. production CSS survives the supported optimizer/toolchain matrix and the demo introduces no unexplained console/resource errors;
8. the public examples extracted from the demo compile from the packed package rather than workspace-only aliases;
9. the comparison lanes retain behavioral and visual parity for their shared brief; and
10. the source reads as an exemplary vane codebase a serious adopter would enjoy learning from.

Visual polish remains a real acceptance criterion, but it follows truthful capability, accessibility, and integration evidence. The flagship should feel aspirational because vane makes the implementation coherent—not because the demo conceals bespoke styling outside the system.
