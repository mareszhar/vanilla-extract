# dux — maintainer workspace

This is the dux maintainer area inside the **vanilla-extract** fork.

**dux** (`@mszr/vane-dux`) is becoming a TypeScript harness for CSS, built on [vanilla-extract](https://vanilla-extract.style)'s compiler. You author design intent — values, tokens, styles, variants, anatomy — as ordinary typed TypeScript; the compiler projects it into boring, inspectable CSS; explicitly declared runtime values cross through CSS custom properties. One question drives everything: *what would feel most delightful to use?*

## Repo context

- This repository is a fork of [`vanilla-extract-css/vanilla-extract`](https://github.com/vanilla-extract-css/vanilla-extract), which remains the build substrate and reference context.
- `master` mirrors upstream untouched; we develop on the `dux` branch.
- All our work lives under this folder, `packages/dux/`. Outside it, only a handful of minimal exclusions keep the outer tooling from reaching in ([docs/dux-workspace.md §6](./docs/dux-workspace.md#6-changes-outside-dux)), so rebasing on upstream stays trivial.

## What's here

- `vane-dux/` — the publishable package, `@mszr/vane-dux`
- `docs/` — the vision, language, patterns, domain specs, and maintainer manual that drive it
- `sandbox/demo-main/` — the Prism Nuxt design-system studio (flagship)
- `sandbox/demo-comparisons/` — one parity-friendly dispatch-card workflow in SFC scoped CSS, Tailwind, Panda, raw vanilla-extract, and vane-dux
- `scripts/` — maintainer automation

## Start here

- **The hub:** [`docs/dux-vision.md`](./docs/dux-vision.md) — what vane-dux is, the principles, the roadmap
- **Documentation hub:** [`docs/README.md`](./docs/README.md) — vision, language, specifications, evidence, and implementation record
- The words: [`docs/dux-language.md`](./docs/dux-language.md)
- The cross-cutting law: [`docs/dux-patterns.md`](./docs/dux-patterns.md)
- The domains, contract by contract: `docs/dux-spec-*.md` — [tokens](./docs/dux-spec-tokens.md) · [css](./docs/dux-spec-css.md) · [ports](./docs/dux-spec-ports.md) · [recipes](./docs/dux-spec-recipes.md) · [vue](./docs/dux-spec-vue.md) · [preset](./docs/dux-spec-preset.md) · [introspection](./docs/dux-spec-introspection.md)
- Maintainer manual: [`docs/dux-workspace.md`](./docs/dux-workspace.md)
- Permanent testing and performance gates: [`docs/dux-testing.md`](./docs/dux-testing.md)
- Completed semantic-foundation implementation record: [`docs/dux-implementation-plan.md`](./docs/dux-implementation-plan.md)
- Package front door: [`vane-dux/README.md`](./vane-dux/README.md)

## Top commands

Run from `packages/dux/` (pnpm + turbo):

1. `pnpm install` — resolve the workspace and install git hooks
2. `pnpm exec playwright install chromium` — one-time browser install for the demo regression suite
3. `pnpm run sdk:build` — build `@mszr/vane-dux`
4. `pnpm run sdk:typecheck` — typecheck the package
5. `pnpm run sdk:test` — every SDK assertion plane (runtime, types, editor DX, emitted CSS)
6. `pnpm run demo:e2e` — build both demos and run their headless browser regressions
7. `pnpm run lint` / `lint:fix` — ESLint across dux
8. `pnpm run demo:main` — the Prism Nuxt demo
9. `pnpm run demo:comparisons` — the five-stack comparison matrix
10. `pnpm run validate` — lint + typecheck + SDK tests + audit + demo browser tests
11. `pnpm run publish:sdk:dry-run` — release gate + packaging rehearsal
