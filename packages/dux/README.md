# vanity — maintainer workspace

This is Vanity's current maintainer workspace inside the **vanilla-extract** fork.

**Vanity** (`@mszr/vanity`) is a TypeScript harness for CSS, built on [vanilla-extract](https://vanilla-extract.style)'s compiler substrate. You author design intent—values, tokens, styles, variants, and anatomy—as ordinary typed TypeScript. Vanity projects it into inspectable CSS, while explicitly declared runtime values cross through CSS custom properties. One question drives everything: *what would feel most delightful to use?*

## Repo context

- This repository is a fork of [`vanilla-extract-css/vanilla-extract`](https://github.com/vanilla-extract-css/vanilla-extract), which remains the build substrate and reference context.
- `master` mirrors upstream untouched; the current integration branch is `dux`.
- All Vanity-owned work lives under the temporary `packages/dux/` path. Outside it, a small set of exclusions keeps the outer tooling separate ([docs/vanity-workspace.md §6](./docs/vanity-workspace.md#6-outer-repository-boundary)).

## What's here

- `vanity/` — the publishable package, `@mszr/vanity`
- `docs/` — the vision, language, patterns, domain specs, and maintainer manual that drive it
- `sandbox/demo-main/` — the Prism Nuxt design-system studio (flagship)
- `sandbox/demo-comparisons/` — one parity-friendly dispatch-card workflow in SFC scoped CSS, Tailwind, Panda, raw vanilla-extract, and vanity
- `scripts/` — maintainer automation

## Start here

- **The hub:** [`docs/vanity-vision.md`](./docs/vanity-vision.md) — what Vanity is, its principles, architecture, and documentation map
- **Documentation hub:** [`docs/README.md`](./docs/README.md) — vision, language, specifications, and evidence
- The words: [`docs/vanity-language.md`](./docs/vanity-language.md)
- The cross-cutting law: [`docs/vanity-patterns.md`](./docs/vanity-patterns.md)
- The domains, contract by contract: `docs/vanity-spec-*.md` — [tokens](./docs/vanity-spec-tokens.md) · [css](./docs/vanity-spec-css.md) · [ports](./docs/vanity-spec-ports.md) · [recipes](./docs/vanity-spec-recipes.md) · [vue](./docs/vanity-spec-vue.md) · [preset](./docs/vanity-spec-preset.md) · [introspection](./docs/vanity-spec-introspection.md)
- Maintainer manual: [`docs/vanity-workspace.md`](./docs/vanity-workspace.md)
- Permanent testing and performance gates: [`docs/vanity-testing.md`](./docs/vanity-testing.md)
- Dedicated-repository migration: [`docs/vanity-repository-migration.md`](./docs/vanity-repository-migration.md)
- Package front door: [`vanity/README.md`](./vanity/README.md)

## Top commands

Run from `packages/dux/` (pnpm + turbo):

1. `pnpm install` — resolve the workspace and install git hooks
2. `pnpm exec playwright install chromium` — one-time browser install for the demo regression suite
3. `pnpm run sdk:build` — build `@mszr/vanity`
4. `pnpm run sdk:typecheck` — typecheck the package
5. `pnpm run sdk:test` — every SDK assertion plane (runtime, types, editor DX, emitted CSS)
6. `pnpm run demo:e2e` — build both demos and run their headless browser regressions
7. `pnpm run lint` / `lint:fix` — ESLint across the Vanity workspace
8. `pnpm run demo:main` — the Prism Nuxt demo
9. `pnpm run demo:comparisons` — the five-stack comparison matrix
10. `pnpm run validate` — lint + typecheck + SDK tests + audit + demo browser tests
11. `pnpm run publish:sdk:dry-run` — release gate + packaging rehearsal
