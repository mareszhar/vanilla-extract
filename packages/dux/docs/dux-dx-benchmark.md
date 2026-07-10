updated: 2026-07-10
status: maintained comparative gate — recheck before every release

# vane-dux — DX benchmark

“Best DX” is meaningful only when the user, moment, and tradeoff are named. vane-dux’s claim is deliberately narrower than “best CSS library”: **for TypeScript-first authors building a design system—especially in Vue/Nuxt—vane-dux aims to provide the strongest end-to-end path from typed design relationships to static CSS, intentional runtime values, diagnostics, refactors, and provenance.**

The peers here are the closest current compiled-TypeScript systems, not straw men. The comparison uses their official documentation and vane’s executable release evidence. Recheck links and conclusions before a release; a competitor improving is useful product input, not a threat to hide.

## Comparative surface

| Moment | vane-dux | vanilla-extract | Panda CSS | StyleX |
| --- | --- | --- | --- | --- |
| Authoring model | Executes ordinary TypeScript in `*.style.ts`; imported helpers and generated data are valid | TypeScript styles evaluated by the mature substrate vane builds on | AST extraction plus generated `styled-system`; runtime/config recipes need statically generated coverage | Ahead-of-time static analysis; raw styles exclude arbitrary function calls, imported values, and object spreads |
| Design tokens | Exact staged graph; derived edges are property references; independently buildable modules compose without losing inference | Typed theme contracts and variables; derivation/composition remains user architecture | Raw/semantic config tokens; semantic edges use `{colors.path}` strings; separate-file token creators are supported | Typed variable groups; compile-time derived callbacks and missing/cycle checks; variable files have strict export rules |
| Refactors | Native TypeScript plus a graph-origin-aware rename bridge across definition, derivation, composition, and consumers | Excellent native refactors wherever relationships are TypeScript references | Generated token completion is strong; string token paths are not native symbol references | Strong property/symbol refactors within statically analyzable groups |
| Runtime values | Only declared live token roots and ports cross runtime; dependent colors remain CSS graph expressions with no JS recomputation | `@vanilla-extract/dynamic` assigns variables/contracts; full contracts require every variable | Runtime functions look up generated classes; semantic conditions are generated CSS; arbitrary values use escape syntax/config | Dynamic style functions compile to CSS variables and a small runtime; advanced and intentionally constrained |
| Component contracts | Recipes, toggles, compound variants, anatomy parts, published typed ports, and Vue prop projection share one system | Mature optional Recipes/Sprinkles; framework projection is userland | Rich recipes, patterns, JSX/style-prop ecosystem, generated types | Highly composable atomic styles and typed style props; framework-neutral, React-shaped application API |
| CSS reach | Open-valued CSS, selectors, at-rules, raw scoped CSS, and global CSS; grammar checked at build | Full CSS through the substrate APIs | Broad utility/object syntax; strict modes use `[value]` escape syntax | Broad modern CSS inside the static analyzer’s accepted grammar |
| Explanation loop | Stable diagnostic codes with exact source; manifest maps class→call→tokens and token graph edges; live DevTools plus audits | Readable debug identifiers and source-oriented CSS; ecosystem tooling is mature | Generated specs document tokens, recipes, conditions, patterns, and examples | Readable development output and compiler/type diagnostics; no vane-shaped design graph audit |
| Vue/Nuxt path | First-class Vue composables, Nuxt auto-imports/SSR scheme/DevTools, and dev/FOUC/HMR browser locks | Framework-agnostic Vite integration; Vue conventions are assembled by the app | Official Vue integration and broad framework guides | Vue works with custom configuration; official docs say JS-authored UI is the ideal fit |
| Ecosystem/integrations | Vite and Nuxt only for v0; intentionally narrow | Clear leader: many bundlers and an established extension ecosystem | Broad framework/CLI/PostCSS ecosystem and powerful generator hooks | Broad compiler integrations and an atomic model proven for very large applications |
| Output scaling | Non-atomic component rules by design; boring cascade/layers and zero authoring runtime | Non-atomic core plus optional atomic Sprinkles | Atomic-first output and generated runtime; stronger deduplication at large scale | Atomic collision-free output; strongest explicit large-codebase CSS-size story |

Official peer references: [vanilla-extract overview](https://vanilla-extract.style/), [Sprinkles](https://vanilla-extract.style/documentation/sprinkles-api/), [Recipes](https://vanilla-extract.style/documentation/packages/recipes/), [dynamic theming](https://vanilla-extract.style/documentation/packages/dynamic/), [Panda’s architecture](https://panda-css.com/docs/concepts/styled-system), [Panda tokens](https://panda-css.com/docs/theming/tokens), [Panda recipes](https://panda-css.com/docs/concepts/recipes), [Panda strict values](https://panda-css.com/docs/concepts/writing-styles), [StyleX overview](https://stylexjs.com/docs/learn/), [StyleX variables](https://stylexjs.com/docs/learn/theming/defining-variables/), [StyleX static constraints](https://stylexjs.com/docs/learn/styling-ui/defining-styles/).

## Where the claim is earned

vane-dux’s differentiated bundle is not one clever API. It is the conjunction competitors make users assemble themselves:

1. design relationships are executable TypeScript references, including derived and composed token modules;
2. live changes cross one typed boundary and continue through the browser’s CSS dependency graph;
3. recipes/anatomy/ports expose both finite and continuous component styling contracts;
4. compiler and language-service feedback cover build errors, completions, and graph-aware refactors;
5. emitted classes remain traceable to exact calls and token decisions;
6. Vue/Nuxt behavior is product-level tested: SSR first paint, virtual CSS URLs, HMR, interactions, accessibility, and process cleanup.

Each assertion maps to the [release initiative](./dux-release-initiative.md). If one of those gates is red, the comparative claim is red.

## Where competitors remain better

- Choose vanilla-extract when bundler breadth, maturity, or its extension ecosystem matters more than an integrated design-system graph.
- Choose Panda when atomic utilities, generated JSX/style props, generator hooks, or broad framework recipes are the product center.
- Choose StyleX when atomic deduplication at very large scale and conditional style composition matter more than arbitrary TypeScript execution or Vue-first ergonomics.
- Choose plain CSS when a typed design-system engine adds no value to the project. vane-dux must never make itself the answer by hiding its cost.

These are not temporary embarrassments. A delightful SDK has a crisp scope edge. vane-dux should surpass peers inside its declared problem, interoperate outside it, and borrow any better idea that survives the vision’s principles.

## Release questions

Before repeating “best DX,” answer all of these with current evidence:

- Does the exact quickstart compile from the packed artifact at the advertised minimum TypeScript version?
- Do definition and consumer renames cross composed modules without touching unrelated graphs?
- Can a valid modern CSS value survive every supported optimizer without warning?
- Does Nuxt paint styled SSR HTML and update dependency CSS without state loss?
- Can a rendered class be traced to its authoring call and token dependencies?
- Do focus, contrast, unused-token, stray-scale, and escape guarantees produce actionable findings rather than noise?
- Is a peer now better at one of vane’s differentiating moments? If yes, update the product or narrow the claim before publishing.
