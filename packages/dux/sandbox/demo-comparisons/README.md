# demo-comparisons — the Prism comparison matrix

The same components — Button (variants, a toggle), Card (elevation surface, both schemes), Progress (a reactive value) — implemented five times on one page: SFC scoped CSS, Tailwind, Panda, raw vanilla-extract, and vane-dux. Study material and competitive bars, never compatibility targets ([dux-workspace.md §2](../../docs/dux-workspace.md#2-sandbox)).

Every lane derives from [`@prism/domain`](../fixtures/src/index.ts) — the design decisions and demo content as data — so the study compares *authoring models*, never accidentally-different designs. The three components are the deliberate scope: they cover the axes where the models actually differ (tokens and scheme handling, variant authoring, the runtime boundary); Dialog/Tabs-scale anatomy lives in `demo-main`.

```bash
pnpm run demo:comparisons   # from packages/dux/
```

## What to look at

- **Where decisions live.** SFC and Tailwind hand-maintain mirrors of the domain values (`tokens.css`, `@theme`) — the drift risk is the model. Panda and vanilla-extract import them into config/TS. vane-dux *derives* them: one live seed and elevation positions; hovers, tints, pairings, and both schemes fall out.
- **The brand picker.** It re-derives the vane-dux lane at runtime (`applyTheme` — one live write, every surface and pairing follows in the cascade). The other lanes compiled their brand in; recoloring them means a rebuild.
- **The runtime boundary.** One progress bar, five crossings: `v-bind()` (SFC), inline styles (Tailwind, Panda), `createVar` + `assignInlineVars` plumbing (vanilla-extract), a typed `port` + `usePorts` (vane-dux).
- **Layer diplomacy** (`index.html`). Five stacks on one page means cascade-layer order must be pinned once, up front — and shared layer names would interleave frameworks, which is why Panda's layers are renamed by hand here and vane-dux nests everything under its prefix automatically.
