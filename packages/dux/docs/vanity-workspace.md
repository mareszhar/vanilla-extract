updated: 2026-07-16
status: maintainer manual — layout, tooling, testing, fork hygiene, publishing

# vanity — workspace

The maintainer manual for Vanity's current in-fork workspace. User-facing behavior lives in the domain specs; this document describes the infrastructure that keeps it honest until the [dedicated-repository migration](./vanity-repository-migration.md).

## 1. Layout

`packages/dux/` is Vanity's temporary in-fork location. It is a self-contained pnpm + turbo workspace, not a member of the outer pnpm workspace. The boundary prevents accidental local-package coupling and gives Vanity its own manifest, lockfile, install, scripts, and quality gates. The [dedicated-repository migration](./vanity-repository-migration.md) will move these contents to a repository root.

```
packages/dux/
  package.json            orchestrator manifest (vanity-workspace); package + sandbox workspaces
  pnpm-workspace.yaml     vanity-only workspace members
  pnpm-lock.yaml          vanity-only lockfile
  turbo.json              dev / build / typecheck / test pipelines
  tsconfig.base.json      shared compiler options (members extend this)
  eslint.config.ts        @antfu flat config with formatters — the lint authority
  .markdownlint.json      markdown rules for the editor extension
  .vscode/                eslint fix-on-save, no Prettier
  .githooks/pre-commit    lint guard for staged Vanity changes
  scripts/                maintainer scripts (git-hook install, publishing)
  docs/                   vision · language · patterns · domain specs · this manual
  vanity/                 the published package, @mszr/vanity
  sandbox/
    fixtures/             the shared Prism design-system fixtures (@prism/domain)
    demo-main/            the Prism Nuxt demo — the flagship, exercising every domain
    demo-comparisons/     the same Prism components in SFC scoped CSS, Tailwind,
                          Panda, raw vanilla-extract, and vanity
```

### Tooling, and why it differs from the outer repo

The outer repo uses **prettier + oxlint**. Vanity uses **ESLint** (`@antfu/eslint-config`, formatters on — single quotes, no semicolons). The toolchains do not overlap because the outer configs ignore `packages/dux/**` ([§6](#6-outer-repository-boundary)). Markdown code fences use the `TS` language tag so partial snippets stay outside the executable documentation suite ([vanity-language.md §0](./vanity-language.md#0-house-style)).

---

## 2. Sandbox

`sandbox/demo-main/` is the flagship and runnable quickstart: a Nuxt interaction lab built on the **Prism** design system. It demonstrates a live brand seed, elevation-derived surfaces, Button/Card/Dialog/Tabs anatomy, ports-driven progress, environmental axes, runtime persistence, and provenance. Its exact contract lives in [vanity-demo.md](./vanity-demo.md).

`sandbox/demo-comparisons/` implements the same Prism components per competing approach — SFC scoped CSS, Tailwind, Panda, raw vanilla-extract, vanity — on one page, sharing decisions and content from `sandbox/fixtures/` (`@prism/domain`). The deliberate scope is Button, Card, and Progress: the axes where the models actually differ (tokens and schemes, variants, the runtime boundary); anatomy-scale components live in `demo-main`. Comparisons are study material and competitive bars, never compatibility targets.

All are workspace members: one `pnpm install`, one turbo pipeline.

---

## 3. Package mechanics

`@mszr/vanity` is an independent package.

- **Build:** obuild emits ESM-only bundles per entrypoint (`index`, `runtime`, `vite`, `vue`, `nuxt`, `preset`) to `dist/*.mjs` + `*.d.mts`.
- **Exports:** all six subpaths named, `sideEffects: false`.
- **Dependencies:** the vanilla-extract substrate (`@vanilla-extract/css`, integration/vite pieces) as **published versions, never `workspace:*`**. pnpm installs the same package shape a consumer gets, so Vanity cannot depend accidentally on unpublished internals or a local graph that consumers will never receive. The adjacent source is reference material, not runtime linkage. lightningcss and the color-math dependency stay internal to `/vite` and the token compiler.
- **Peers:** `vue` (optional, `/vue`), `nuxt`/`@nuxt/kit` (optional, `/nuxt`), `vite` (optional, `/vite`). The peer rule: needed by everyone → dependency; needed by a subpath → optional peer.
- **Manifest stays npm-only:** no `scripts` in `vanity/package.json`; the orchestrator invokes tools directly (`pnpm --dir vanity exec <tool>`), keeping one place that controls build/lint/test/publish.

---

## 4. Boundaries

The import matrix, enforced by ESLint `no-restricted-imports` in `eslint.config.ts` (principle 8):

| Module | May import | Never imports |
| --- | --- | --- |
| core (`src/tokens`, `src/system`, `src/css`, `src/recipes`, `src/ports`) | substrate internals, csstype | `vue`, `nuxt`, `vite`, `/runtime` DOM helpers |
| `src/runtime` | nothing build-time | the compiler, the substrate, any framework |
| `src/vite` | core, substrate integration, lightningcss | frameworks |
| `src/vue` | core, `src/runtime`, `vue` | `src/vite`, `nuxt` |
| `src/nuxt` | `src/vite`, `@nuxt/kit` | direct framework component code |
| `src/preset` | **the public surface only** | any internal module |

The seam rule rides the same mechanism: substrate types are banned from `src/**/public*` signature files; a lint rule flags any `@vanilla-extract/*` name reaching an exported declaration.

---

## 5. Testing

Two runners, **five assertion planes**, one fixture set (Prism). No integration domain is "done" until its browser plane is green too — a silently-dead control, failed stylesheet request, or first-paint regression is invisible to unit tests.

| Plane | Suffix | Asserts | Tool |
| --- | --- | --- | --- |
| Runtime | `*.test.ts` | evaluation results, recipe resolution, port setters, bound token overrides, snapshots, and mode selection | Vitest |
| Type shapes | `*.test-d.ts` | token graph inference, `VanityProps`, condition typing, branch addressing, and mutable/nonmutable runtime honesty | Vitest `--typecheck` |
| Editor DX | `*.dx.test.ts` | completions and diagnostics land on the intended key with the intended message; hovers stay readable; `VANITY_*` codes stable | [selenita](https://github.com/mareszhar/selenita) on Vitest |
| Output | `*.out.test.ts` | the emitted CSS: liveness compilation (`light-dark()`, relative color), layer order, condition compilation, debug names, build-vs-live color-math agreement | Vitest snapshot over the compiler |
| Browser integration | `tests/*.spec.ts` | production Nuxt/Vite loading, failed requests and console errors, real interactions/geometry, live computed-style changes | Playwright Chromium |

The output plane is this project's addition to the house methodology: **the emitted CSS is a public contract** (principle 6 — boring CSS is the artifact consumers keep), so it gets locked like one. Diagnostic messages are a quality contract per [vanity-patterns.md §10](./vanity-patterns.md#10-diagnostics-are-a-contract): exactly one diagnostic, at the offending key, naming the fix.

The complete permanent matrix, evidence map, performance budgets, packed-app
smoke, and phase-boundary requirements live in
[vanity-testing.md](./vanity-testing.md). This section is the workspace-level summary,
not a second testing policy.

SDK tests collocate beside the code they exercise; browser tests live in `tests/`. Prism fixtures live once in `vanity/src/test-support/` with the larger app-shaped scenarios in `sandbox/fixtures/`. Fewer tests, higher confidence: assert contracts, never implementation details.

Vitest's typecheck runner normally invokes `tsc --incremental` with a shared `tsconfig.tmp.tsbuildinfo` inside `vitest/dist/`. Vanity routes that through `scripts/vitest-typecheck.cjs`, which strips the incremental cache flags before delegating to TypeScript, so the type plane cannot replay stale declarations. Public recursive shapes remain named interfaces where recursion is required because that stays friendlier to TypeScript's resolver.

---

## 6. Outer repository boundary

The temporary `packages/dux/` location sits inside the outer repository's `packages/*` globs, so the exclusions are explicit:

- **`pnpm-workspace.yaml`** — add `'!packages/dux'` to `packages`, so pnpm (and manypkg, which reads it) never treats the orchestrator as a member.
- **root `package.json`** — `preconstruct.packages`: exclude `packages/dux` (negated glob), so the outer build never tries to treat it as a preconstruct package.
- **`.prettierignore`** — add `packages/dux`; Vanity formatting is ESLint's job.
- **`.oxlintrc.json`** — add `packages/dux/**` to `ignorePatterns`.
- **root `vitest.config.ts` / `tsconfig.json`** — exclude `packages/dux` from test collection and `lint:tsc`; Vanity's own CI runs its suites.
- **`.gitignore`** — keep references and generated artifacts out of source control (`__references__`, `.turbo`, `.vanity/`, `.nuxt/`, `.output/`, `coverage`, `dist`, and `*.tsbuildinfo`). The root ignore file is the single authority.
- **`vanity.code-workspace`** (additive, repo root) — opens `packages/dux` as its own VS Code folder, excluded from the root view.
- **`.github/workflows/vanity.yml`** (additive) — validates `packages/dux/` with pnpm.

We do **not** change upstream `packages/*` sources, tests, site code, or release behavior for Vanity. If an outer validation task reaches Vanity files, narrow the exclusion rather than changing upstream behavior.

> **Git hooks.** `scripts/install-git-hooks.ts` points `core.hooksPath` to `packages/dux/.githooks`. The hook lints staged Vanity changes and does nothing when a commit does not touch `packages/dux/`.

### Fork rhythm

`master` mirrors upstream; the current integration branch is `dux`. To sync, fast-forward `master`, merge it into the integration branch, review compiler and integration changes that affect Vanity's substrate seam, then run the full suite. The dedicated repository removes this workflow.

### Substrate dependency rhythm

Updating the fork changes the adjacent vanilla-extract source used for comparison; it does **not** change what `@mszr/vanity` compiles against. The package contract changes only when published vanilla-extract dependencies in `vanity/package.json` and the Vanity lockfile change.

The natural cadence:

1. **On upstream sync:** review changes under the compiler, integration, and relevant bundler packages. If nothing affects the seam, leave the published dependency pins alone.
2. **When an upstream release contains something we need:** bump the published `@vanilla-extract/*` versions from `packages/dux/`, run `pnpm install`, then `pnpm run validate`. This is the normal path.
3. **When an upstream fix is useful but unpublished:** port the idea behind the seam or wait for the release. Temporary local proof may use an explicit throwaway override or packed tarball, but `workspace:*` and `file:` links must not ship in the package or lockfile.
4. **Before a vanity release:** check whether the substrate pins are intentionally current. A stale pin is fine when deliberate; an accidental stale pin is a release smell.

This keeps the fork valuable as a source map without letting local monorepo resolution become part of the public package's behavior.

---

## 7. Scripts

Run from `packages/dux/`.

| Command | Does |
| --- | --- |
| `pnpm install` | resolve the workspace, install git hooks |
| `pnpm run lint` / `lint:fix` | ESLint across the workspace |
| `pnpm run sdk:build` | build `@mszr/vanity` → `dist` |
| `pnpm run sdk:typecheck` | `tsc --noEmit` for the package |
| `pnpm run sdk:test` / `sdk:test:watch` | Vitest, all four planes |
| `pnpm run bench:baseline` | verify generated benchmark fixtures and record the ignored protocol result |
| `pnpm run docs:examples` | parse every TypeScript fence and typecheck canonical package-backed doc fixtures |
| `pnpm run audit` | the introspection audits over a real plugin build of the fixture app — point it at any app with `pnpm run audit -- <dir>` ([vanity-spec-introspection.md §3](./vanity-spec-introspection.md#3-audits)) |
| `pnpm run demo:main` | the Prism Nuxt demo, dev mode |
| `pnpm run demo:comparisons` | the comparison matrix |
| `pnpm run demo:build` / `demo:typecheck` | build or typecheck both demos |
| `pnpm run demo:e2e` | build both demos, then run production/development Playwright and the Nuxt HTTP/HMR process-lifecycle test |
| `pnpm run fresh:smoke` | pack the SDK; install it into fresh strict Vite/Nuxt apps; check types, production, dev HTTP, and port release |
| `pnpm run typecheck` / `test` / `build` | turbo across the workspace |
| `pnpm run validate` / `val` | lint + typecheck + test + audit + demo browser regressions |
| `pnpm run publish:sdk:dry-run` | gate + packaging rehearsal; nothing published |
| `pnpm run publish:sdk:patch` / `:minor` / `:major` | the release ([§8](#8-publishing)) |
| `pnpm run publish:subtree:squash` | re-push the public mirror without a release |

---

## 8. Publishing

Until the dedicated-repository migration, the fork remains the development workspace and the `vanity/` subtree is the publishable package. This section describes that temporary release path.

**The flow** (`pnpm run publish:sdk:<patch|minor|major>`), following the house release machinery:

1. **Shared gate**, once — the complete `pnpm run validate`, including both demo browser modes and Nuxt process lifecycle, with a content-keyed receipt so a resumed release doesn't re-verify unchanged inputs. `VANITY_FORCE_VERIFY=1` ignores the receipt; the deliberately awkward `VANITY_UNSAFE_PUBLISH_SKIP_CHECKS=1` skips the gate outright — no flag for that, on purpose.
2. **Publication smoke:** pack the real tarball, install it into fresh strict Vite and Nuxt apps, run their type/build/dev lifecycles, then inspect `npm pack --dry-run` contents.
3. **npm auth check**, then bump `vanity/package.json` directly (never `npm version` — it would try to reify the outer pnpm workspace).
4. **Build, then `npm publish --access public`.** Failure up to here restores the manifest; nothing is recorded.
5. Once published, the bump is permanent; the remaining steps use a resumable release record under `.vanity/`: registry propagation, release commit and tag, then the current subtree mirror.

The dedicated repository will replace subtree mirroring with ordinary repository publishing; see [vanity-repository-migration.md](./vanity-repository-migration.md).
