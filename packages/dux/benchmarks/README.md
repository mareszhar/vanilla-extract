# vane-dux scale benchmarks

The checked-in `generated/` fixtures are deterministic consumer projects for the pre-refactor and next implementations. They keep stable token/module/consumer shapes while the generator's dialect evolves with the public API.

- `small`: 50 tokens, 2 modules, 5 style/recipe consumers.
- `medium`: 500 tokens, 10 modules, 30 consumers.
- `large`: 5,000 tokens, 50 modules, 150 consumers.

Commands:

```sh
pnpm run bench:generate        # rewrite deterministic fixtures
pnpm run bench:fixtures:check  # fail when checked-in fixtures drift
pnpm run bench:baseline        # build SDK and record all current metrics
```

Machine-readable results go to the ignored `.dux/benchmarks/current.json`. Accepted human baselines live in `docs/dux-benchmarks.md`; transient machine and cache noise does not belong in version control.

The current dialect uses the canonical engine/token-module APIs and scales from two to four environmental axes. The corpus includes native color-scheme output, color-agnostic axis fixtures, and sparse cross-axis cases at representative module intervals; editor measurements cover axis and case completion alongside token/style paths. Mutable-runtime and snapshot overhead join these same fixture identities in Phase 5, with earlier baselines retained as “not representable” rather than fabricated as zero.
