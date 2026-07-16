updated: 2026-07-16
status: approved migration plan; not yet executed

# vanity — dedicated repository migration

Vanity is an independent library and should live in an independent repository. The move is a repository and release-engineering change, not a product rewrite.

## 1. Recommended destination layout

```text
vanity/
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  turbo.json
  tsconfig.base.json
  eslint.config.ts
  docs/
  scripts/
  tests/
  benchmarks/
  sandbox/
  sdk/                  @mszr/vanity
  .github/workflows/
```

Use `sdk/` for the published package. `lib/` can mean source files, runtime code, or a build output directory; `sdk/` clearly names the complete publishable TypeScript surface while leaving room for demos, tooling, and future first-party integrations at the repository root.

## 2. Preserve history

Start from a fresh clone of the current repository after the maintainer has reviewed and committed the final in-fork state. Use `git filter-repo` to retain `packages/dux/` and move its contents to the new root:

```text
git filter-repo \
  --path packages/dux \
  --path-rename packages/dux/: \
  --force
```

Then move the package:

```text
git mv vanity sdk
```

Create a new `.gitignore` and dedicated CI workflows rather than carrying outer-fork exclusions forward. Copy only genuinely Vanity-owned workflow logic; root settings whose only purpose was shielding the outer vanilla-extract workspace are deleted.

## 3. Codex logistics

The migration does not require one task to edit two repositories simultaneously.

1. Finish and verify the source state here.
2. The maintainer commits it.
3. Create the filtered repository locally and connect its dedicated remote.
4. Open that repository as a new Codex task.
5. Continue from this document and the filtered history, which already contains all Vanity files and decisions.

If a cross-check against the old fork is useful, export a small migration manifest before switching: tracked paths, package exports, script names, CI gates, and accepted benchmark numbers. The new task can validate against that manifest without write access to the old repository.

## 4. Mechanical updates in the new repository

- Change every workspace script from `--dir vanity` to `--dir sdk`.
- Update workspace globs, TypeScript paths, ESLint boundaries, benchmark generators, fresh-app scripts, demo dependencies, and documentation links.
- Set the package repository metadata to the dedicated repository with `"directory": "sdk"`.
- Rename the current workflow and remove all fork/rebase/subtree logic.
- Replace subtree publishing with ordinary package publishing from the repository.
- Keep release and benchmark state under `.vanity/`.
- Preserve the package name `@mszr/vanity`, all export subpaths, and runtime schema semantics.
- Regenerate ignored manifests, Nuxt types, comparison codegen, benchmarks, and packed-app fixtures only after paths are final.

## 5. Validation before cutover

The dedicated repository is ready only when:

1. install succeeds from a clean clone;
2. lint, SDK typecheck, all Vitest planes, documentation examples, audits, and benchmark fixture checks are green;
3. both demos typecheck and build;
4. production and development Playwright suites pass;
5. fresh strict Vite and Nuxt apps install the packed tarball and complete type/build/dev lifecycles;
6. package contents and export maps match the in-fork package;
7. npm provenance and CI permissions are configured for the new repository;
8. documentation contains no fork, subtree, old workspace path, or old repository instructions.

## 6. Cutover

- Freeze releases from the fork during the move.
- Push the filtered history to the dedicated repository.
- Enable branch protection, required checks, npm trusted publishing/provenance, and repository secrets.
- Run the full release dry run from the dedicated repository.
- Point package metadata and documentation at the new repository.
- Archive or clearly mark the old development location after the new repository is authoritative.

Do not publish during the same step that performs the filesystem migration. First prove that the new repository reproduces the package and every evidence gate; publish only from a later reviewed state.
