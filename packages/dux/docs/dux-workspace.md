updated: 2026-07-07
status: maintainer manual — layout, tooling, testing, fork hygiene, publishing

# vane-dux — workspace

The maintainer manual: how the dux workspace is laid out, built, linted, tested, kept aligned with upstream vanilla-extract, and shipped. User-facing behavior lives in the domain specs; this documents the infrastructure that keeps it honest.

## Implementation status

| Phase | Scope | Status |
| --- | --- | --- |
| W0 | Workspace scaffold: orchestrator manifest, tooling, package skeleton, outer-repo exclusions, docs | ☐ |
| W1 | Test foundations: vitest planes, selenita wiring, Prism fixtures, CSS-output snapshots | ☐ |
| W2 | Per-domain suites land with each roadmap phase | ☐ |
| W3 | Sandbox: Nuxt demo + comparison matrix | ☐ |
| W4 | Publishing pipeline: subtree to `mareszhar/vane-dux`, `@mszr` scope | ☐ |

---

## 1. Layout

`packages/dux/` is a self-contained **orchestrator workspace** — pnpm + turbo — that owns everything we maintain. It is *not* a member of the outer pnpm workspace: the outer repo never reaches in ([§6](#6-changes-outside-dux)), and we never depend on outer workspace links. It has its own manifest, workspace file, lockfile, install, and scripts; the package manager matches upstream for disk/cache friendliness, while the workspace boundary keeps dux isolated.

```
packages/dux/
  package.json            orchestrator manifest (vane-dux-workspace); package + sandbox workspaces
  pnpm-workspace.yaml     dux-only workspace members
  pnpm-lock.yaml          dux-only lockfile
  turbo.json              dev / build / typecheck / test pipelines
  tsconfig.base.json      shared compiler options (members extend this)
  eslint.config.ts        @antfu flat config with formatters — the single lint authority for dux
  .markdownlint.json      markdown rules for the editor extension
  .vscode/                eslint fix-on-save, no Prettier
  .githooks/pre-commit    lint guard for staged dux changes
  .gitignore              dux-internal ignores (.turbo, .dux/, dist)
  scripts/                maintainer scripts (git-hook install, publishing)
  docs/                   vision · language · patterns · domain specs · this manual
  vane-dux/               the published package, @mszr/vane-dux
  sandbox/
    fixtures/             the shared Prism design-system fixtures (@prism/domain)
    demo-minimal/         the quickstart, runnable — kept in lockstep with the README
    demo-main/            the Prism Nuxt demo — the flagship, exercising every domain
    demo-comparisons/     the same Prism components in SFC scoped CSS, Tailwind,
                          Panda, raw vanilla-extract, and vane-dux
  __references__/         gitignored research material (deleted eventually)
```

### Tooling, and why it differs from the outer repo

The outer repo uses **prettier + oxlint**. Inside `packages/dux/` we use **ESLint** (`@antfu/eslint-config`, formatters on — single quotes, no semicolons), the stack the maintainer standardizes across every dux project. The two never fight because the outer configs ignore `packages/dux/**` ([§6](#6-changes-outside-dux)). Markdown code fences use the `TS` language tag so partial doc snippets stay unlinted ([dux-language.md §0](./dux-language.md#0-house-style)).

---

## 2. Sandbox

`sandbox/demo-minimal/` is the quickstart made runnable: the exact files from the README's "Start here" and [dux-spec-css.md §1.1](./dux-spec-css.md#11-the-happy-path-one-file) — one system file, one styled button, both schemes. It is the ground truth for gauntlet moment 12: if the README's code and this demo ever diverge, one of them is wrong, and CI treats it that way.

`sandbox/demo-main/` is the flagship: a Nuxt app built on the **Prism** fixture design system (tokens with a live brand seed, elevation surfaces, Button/Card/Dialog/Tabs anatomy, a ports-driven Progress, the theme-picker moment from the delight gauntlet). It is the proof that the contracts hold in a real app, and the walking ground for the gauntlet ([dux-vision.md §6](./dux-vision.md#6-the-delight-gauntlet)).

`sandbox/demo-comparisons/` implements the same Prism components per competing approach — SFC scoped CSS, Tailwind, Panda, raw vanilla-extract, vane-dux — sharing fixtures from `sandbox/fixtures/` (`@prism/domain`). Comparisons are study material and competitive bars, never compatibility targets.

Both are workspace members: one `pnpm install`, one turbo pipeline.

---

## 3. Package mechanics

`@mszr/vane-dux` is an independent package.

- **Build:** obuild emits ESM-only bundles per entrypoint (`index`, `runtime`, `vite`, `vue`, `nuxt`, `preset`) to `dist/*.mjs` + `*.d.mts`.
- **Exports:** all six subpaths named, `sideEffects: false`.
- **Dependencies:** the vanilla-extract substrate (`@vanilla-extract/css`, integration/vite pieces) as **published versions, never `workspace:*`** — pnpm installs the same package shape a consumer gets, so dux can't accidentally depend on unpublished internals or a local package graph that the public package will never see. The fork adjacency is for reading and porting, not runtime linking ([dux-vision.md §10](./dux-vision.md#10-how-vane-dux-stays-alive)). lightningcss and the color-math dependency stay internal to `/vite` and the token compiler.
- **Peers:** `vue` (optional, `/vue`), `nuxt`/`@nuxt/kit` (optional, `/nuxt`), `vite` (optional, `/vite`). The peer rule: needed by everyone → dependency; needed by a subpath → optional peer.
- **Manifest stays npm-only:** no `scripts` in `vane-dux/package.json`; the orchestrator invokes tools directly (`pnpm --dir vane-dux exec <tool>`), keeping one place that controls build/lint/test/publish.

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

One runner (Vitest), **four assertion planes**, one fixture set (Prism). No domain is "done" until all four are green — a silently-dead completion or a drifted CSS snapshot is invisible to the others.

| Plane | Suffix | Asserts | Tool |
| --- | --- | --- | --- |
| Runtime | `*.test.ts` | evaluation results, recipe resolution, port setters, `applyTheme`, theme scoping | Vitest |
| Type shapes | `*.test-d.ts` | token graph inference, `VaneProps`, condition typing, liveness honesty (`applyTheme` rejecting static keys) | Vitest `--typecheck` |
| Editor DX | `*.dx.test.ts` | completions and diagnostics land on the intended key with the intended message; hovers stay readable; `VANE_*` codes stable | [selenita](https://github.com/mareszhar/selenita) on Vitest |
| Output | `*.out.test.ts` | the emitted CSS: liveness compilation (`light-dark()`, relative color), layer order, condition compilation, debug names, build-vs-live color-math agreement | Vitest snapshot over the compiler |

The output plane is this project's addition to the house methodology: **the emitted CSS is a public contract** (principle 6 — boring CSS is the artifact consumers keep), so it gets locked like one. Diagnostic messages are a quality contract per [dux-patterns.md §10](./dux-patterns.md#10-diagnostics-are-a-contract): exactly one diagnostic, at the offending key, naming the fix.

Tests collocate beside the code they exercise; Prism fixtures live once in `vane-dux/src/test-support/` with the larger app-shaped scenarios in `sandbox/fixtures/`. Fewer tests, higher confidence: assert contracts, never implementation details.

---

## 6. Changes outside dux

`packages/dux/` sits *inside* the outer repo's `packages/*` globs, so — unlike dux forks whose folder falls outside upstream tooling — the exclusions must be explicit. Each edit is minimal, reversible, and grouped for rebase hygiene:

- **`pnpm-workspace.yaml`** — add `'!packages/dux'` to `packages`, so pnpm (and manypkg, which reads it) never treats the orchestrator as a member.
- **root `package.json`** — `preconstruct.packages`: exclude `packages/dux` (negated glob), so the outer build never tries to treat it as a preconstruct package.
- **`.prettierignore`** — add `packages/dux`; dux formatting is ESLint's job.
- **`.oxlintrc.json`** — add `packages/dux/**` to `ignorePatterns`.
- **root `vitest.config.ts` / `tsconfig.json`** — exclude `packages/dux` from test collection and `lint:tsc`, so outer CI never typechecks or runs dux suites (dux CI does).
- **`.gitignore`** — the existing dux group (`__references__`, `!packages/dux/README.md`) plus nothing else; dux-internal ignores live in `packages/dux/.gitignore`.
- **`vane-dux.code-workspace`** (additive, repo root) — opens `packages/dux` as its own VS Code folder, excluded from the root view.
- **`.github/workflows/dux.yml`** (additive) — lint + typecheck + test `packages/dux/` with pnpm on the `dux` branch.

We do **not** touch upstream `packages/*` sources, `tests/`, `site/`, or the changesets/release pipeline. If an outer `validate` job still trips on dux files after the exclusions, the fix is a narrower exclusion — never a change to upstream behavior.

> **Git hooks.** `scripts/install-git-hooks.ts` (postinstall) points `core.hooksPath` → `packages/dux/.githooks`; the hook lints staged dux changes and no-ops for commits that don't touch `packages/dux/`.

### Fork rhythm

`master` mirrors upstream; development happens on `dux`. Upstream sync = fast-forward `master`, merge into `dux`, review the compiler/integration diff for portable changes, run the full suite. The tiny outer-edit surface above is the whole conflict zone.

### Substrate dependency rhythm

Rebasing updates the adjacent vanilla-extract source we read, compare against, and port from; it does **not** update what `@mszr/vane-dux` compiles against. The package contract moves when we bump the published vanilla-extract dependencies in `vane-dux/package.json` and refresh the dux lockfile.

The natural cadence:

1. **On upstream sync:** review changes under the compiler, integration, and relevant bundler packages. If nothing affects the seam, leave the published dependency pins alone.
2. **When an upstream release contains something we need:** bump the published `@vanilla-extract/*` versions from `packages/dux/`, run `pnpm install`, then `pnpm run validate`. This is the normal path.
3. **When an upstream fix is useful but unpublished:** port the idea behind our seam or wait for the release. Temporary local proof is allowed with an explicit throwaway override or packed tarball, but `workspace:*` and `file:` links must not ship in the dux package or lockfile.
4. **Before a vane-dux release:** check whether the substrate pins are intentionally current. A stale pin is fine when deliberate; an accidental stale pin is a release smell.

This keeps the fork valuable as a source map without letting local monorepo resolution become part of the public package's behavior.

---

## 7. Scripts

Run from `packages/dux/`.

| Command | Does |
| --- | --- |
| `pnpm install` | resolve the workspace, install git hooks |
| `pnpm run lint` / `lint:fix` | ESLint across dux |
| `pnpm run sdk:build` | build `@mszr/vane-dux` → `dist` |
| `pnpm run sdk:typecheck` | `tsc --noEmit` for the package |
| `pnpm run sdk:test` / `sdk:test:watch` | Vitest, all four planes |
| `pnpm run audit` | the introspection audits over the Prism fixtures ([dux-spec-introspection.md §3](./dux-spec-introspection.md#3-audits)) |
| `pnpm run demo:minimal` | the runnable quickstart |
| `pnpm run demo:main` | the Prism Nuxt demo, dev mode |
| `pnpm run demo:comparisons` | the comparison matrix |
| `pnpm run typecheck` / `test` / `build` | turbo across the workspace |
| `pnpm run validate` / `val` | lint + typecheck + test + audit |
| `pnpm run publish:sdk:dry-run` | gate + packaging rehearsal; nothing published |
| `pnpm run publish:sdk:patch` / `:minor` / `:major` | the release ([§8](#8-publishing)) |
| `pnpm run publish:subtree:squash` | re-push the public mirror without a release |

---

## 8. Publishing

The public `mareszhar/vane-dux` repo is the package + docs face, not the development home — development stays in this fork so the substrate source and comparison sandbox remain adjacent. Releases push the `vane-dux/` subtree to the public repo as a single squashed commit and publish `@mszr/vane-dux` to npm.

**The flow** (`pnpm run publish:sdk:<patch|minor|major>`), following the house release machinery:

1. **Shared gate**, once — build · lint · typecheck · test · audit, with a content-keyed receipt so a resumed release doesn't re-verify unchanged inputs. `VANE_FORCE_VERIFY=1` ignores the receipt; the deliberately awkward `VANE_UNSAFE_PUBLISH_SKIP_CHECKS=1` skips the gate outright — no flag for that, on purpose.
2. **npm auth check**, then bump `vane-dux/package.json` directly (never `npm version` — it would try to reify the outer pnpm workspace).
3. **Build, then `npm publish --access public`.** Failure up to here restores the manifest; nothing is recorded.
4. Once published, the bump is permanent; the remaining steps are guarded by a resumable release record (gitignored under `.dux/`): registry propagation wait → commit `🔖 release v<version>` + tag → subtree squash-push with the same message.

The gitmoji convention, squash-to-public-repo model, and resumable release-state machinery follow the same maintainer mechanics as every dux fork.
