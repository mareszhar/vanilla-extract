updated: 2026-07-10
status: active release gate — publication is blocked until every required row is green

# vane-dux v0 release initiative

The execution ledger for the pre-publication push. The vision ranks decisions; the specs state contracts; this file records what still prevents the first release. A checked row means the implementation and its proportionate evidence both exist.

## Definition of ready

v0 is ready when a fresh adopter can define any design system from config-agnostic foundations or take the preset, receives exact TypeScript guidance through authoring and refactors, gets deterministic CSS in dev and production without flashes/errors, and can prove the result through the same public build paths the package ships. “Best DX” is a maintained comparative claim, not a slogan: the [DX benchmark](./dux-dx-benchmark.md) stays current and every delight-gauntlet moment has executable evidence or an explicit red gate.

## Workstreams

| Workstream | Gate | State |
| --- | --- | --- |
| Token authoring | exact staged refs; no `undefined`; typo/duplicate locality; topological graph; immutable branching; preset composed through public API | ☑ |
| Token modules | independently buildable graphs compose with exact inference, graph-aware refactors, duplicate locality, and deterministic order | ☑ |
| Token refactors | graph-aware rename from definition or consumer; separate graphs never cross; Nuxt zero-config; plain TS one-line opt-in | ☑ |
| Value foundation | composable math, dimensions, nested precedence, min/max/clamp, Grid values, broad color spaces, general relative OKLCH; accepted by every authoring lane | ☑ |
| Preset boundary | no palette/elevation opinions in core; preset is a public builder over core primitives; extension is typed | ☑ |
| Nuxt production | virtual styles 200; no stylesheet/console/page errors; first styled paint stable | ☑ |
| Nuxt development | repeated reloads; dependency CSS HMR; export-shape reload exactly once; clean start/stop; HTTP/HMR ports released | ☑ |
| CSS toolchains | relative-color syntax survives supported Nuxt/Vite production pipelines without incompatible optimizer warnings | ☑ |
| Source transforms | export discovery and debug-name injection use syntax trees, with alias/destructure/re-export/comment adversarial fixtures | ☑ |
| Diagnostics | every promised diagnostic carries stable code, exact path, source file and trustworthy line/column where the compiler owns the source | ☑ |
| Packaging | build, declaration identity, exports, tarball contents, optional peers, side-effects claim, fresh install smoke | ☐ |
| Fresh apps | plain Vite and Nuxt copy-paste apps; strict TS; dev + production; no repository path aliases | ☐ |
| Browser matrix | Chromium minimum; reload/interaction/responsive/accessibility assertions; no request or console errors | ☑ |
| Docs | README/spec snippets compile; every demo has README; status language matches evidence; migration from hail-styl is explicit | ☑ |
| Delight gauntlet | all twelve moments walked and linked to evidence | ☐ |

## Delight-gauntlet evidence

This is the release walk, not a marketing checklist. “Automated” means the named public behavior fails a maintained fixture; “pending” keeps the whole gauntlet red.

| # | Moment | Evidence | State |
| --- | --- | --- | --- |
| 1 | Rename a token across a graph | [`tokens.rename.test.ts`](../vane-dux/src/tokens/tokens.rename.test.ts) covers definition→consumers, consumer→definition, composed modules, and graph isolation through the shipped TypeScript bridge | ☑ |
| 2 | Add dark mode without component edits | [`preset.out.test.ts`](../vane-dux/src/preset/preset.out.test.ts) locks paired scheme output from one graph; components consume the unchanged handle | ☑ |
| 3 | Live brand drives surfaces, hover, and pairings | [`demos.spec.ts`](../tests/demos.spec.ts) changes the brand in-browser and asserts the vane button plus hover recompute with no browser errors | ☑ |
| 4 | Override component padding once | [`port.test-d.ts`](../vane-dux/src/ports/port.test-d.ts) and [`port.out.test.ts`](../vane-dux/src/ports/port.out.test.ts) lock typed subtree writes and emitted fallbacks; [`audit.test.ts`](../vane-dux/src/introspect/audit.test.ts) covers override inventory | ☑ |
| 5 | Style headless states | [`preset.dx.test.ts`](../vane-dux/src/preset/preset.dx.test.ts) locks typed headless conditions; the tabs/dialog demo exercises emitted state selectors | ☑ |
| 6 | Bind reactive progress | [`vue.test.ts`](../vane-dux/src/vue.test.ts) and [`vue.test-d.ts`](../vane-dux/src/vue.test-d.ts) lock `usePorts`; both browser demos assert a visible live progressbar | ☑ |
| 7 | Animate while respecting reduced motion | [`conveniences.test.ts`](../vane-dux/src/preset/conveniences.test.ts) and the dialog anatomy lock the `motionOk` contract | ☑ |
| 8 | Reach an unknown CSS feature | [`css.test.ts`](../vane-dux/src/css/css.test.ts) locks selectors/raw parsing and [`audit.test.ts`](../vane-dux/src/introspect/audit.test.ts) locks escape visibility | ☑ |
| 9 | Delete dead styles/tokens safely | TypeScript owns dead exports; [`audit.test.ts`](../vane-dux/src/introspect/audit.test.ts) locks unused-token findings and fixes | ☑ |
| 10 | Trace a rendered value to its decision | [`vite.test.ts`](../vane-dux/src/vite.test.ts) locks emitted class → exact style call → referenced token paths and exact token definition positions | ☑ |
| 11 | Let an agent self-correct | [`introspect.out.test.ts`](../vane-dux/src/introspect/introspect.out.test.ts) locks the manifest; every editor-DX suite locks typo locality before review | ☑ |
| 12 | Copy the quickstart into fresh Nuxt | [`preset.dx.test.ts`](../vane-dux/src/preset/preset.dx.test.ts) compiles the verbatim README; [`fresh-smoke.ts`](../scripts/fresh-smoke.ts) proves the packed tarball’s strict types and production build. Packed Nuxt dev remains pending one unsandboxed watcher run | ☐ |

## Locked token authoring decision

```TS
export const t = defineTokens({
  color: { brand: oklch(0.58, 0.2, 285).live() },
  space: scale.linear({ unit: 4, steps: { sm: 2, md: 4 } }),
})
  .derive(({ color }) => ({
    color: { brandSoft: alpha(color.brand, 0.12) },
  }))
  .derive(({ color }) => ({
    text: { small: { color: color.brandSoft.var } },
  }))
  .build()
```

The one-call recursive object was dropped because TypeScript cannot know sibling keys while contextually typing that same object. Stages expose information exactly when it exists: later callbacks receive an exact accumulated graph; same-stage/future references are absent. `createSystem` accepts the unfinished builder and finalizes it, preserving the one-file quickstart.

Native TypeScript does not connect an object-literal key to properties synthesized by a mapped return type for rename-symbol. Polluting final handles with their authoring values would make hovers and available methods dishonest, so the language-service bridge is the smaller correct layer. It adds locations only when literal token path and traced graph origin both match.

## Validation cadence

During implementation, run the narrowest relevant runtime/type/editor/output suite. Before changing a gate to checked, run its real integration path. Before release, run in this order:

1. lint and SDK typecheck;
2. all runtime/type/editor/output tests;
3. SDK build and package dry-run;
4. both demo typechecks and production builds;
5. dev/HMR matrix;
6. Playwright browser matrix;
7. fresh-app tarball smoke;
8. audit and delight-gauntlet ledger.

No gate turns green from a manual glance alone.
