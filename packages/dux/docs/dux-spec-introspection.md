updated: 2026-07-15
status: canonical implemented specification

# vane-dux — spec: introspection

The system explains itself: provenance from pixels back to authored decisions,
a stable machine-readable manifest, structured token/runtime explanations, and
audits that keep the design system honest. The rationale is
[dux-patterns.md §11](./dux-patterns.md#11-agent-legibility): agents and
11pm-you need the same explicit context.

## 1. Provenance

- Development class names include the authored export/debug identity plus the
  substrate hash; production can choose short identifiers.
- The Vite integration injects debug names and records exact style/token source
  locations during the same build-time evaluation that emits CSS.
- Token references remain visible as custom-property references, so DevTools
  connects a declaration to its design-system decision instead of showing only
  a folded literal.
- Manifest style records map emitted classes to source and referenced token
  paths. Token records carry their own source and dependency edges.

Provenance is metadata about authored and emitted artifacts. It is not a
license to patch compiled stylesheets at runtime.

## 2. Manifest v2

The Vite plugin writes `.vane/manifest.json`, refreshes it during development,
and serves the current projection at `/__vane/manifest.json`. `/__vane/`
renders the same data as a development browser.

`VaneManifest` is exported from `@mszr/vane-dux/vite`. Its version-2 contract
contains:

- system identity, support target, root, token layer, cascade-layer order,
  conditions, axes, and runtime protocol/schema identity;
- every token's semantic path, CSS type, `reference`/`emit`/`mutable` traits,
  authored expression, inference reasons, fold decision, support requirements,
  dependencies, declarations, branches/cases, registration, portability,
  resolved preview, metadata, and runtime slot addresses;
- emitted style provenance and token usage;
- recipe/anatomy variants, toggles, defaults, parts, and published ports;
- port type/default/validation metadata;
- contrast results, labeled escape records, and audit policy.

Manifest custom-property names and private runtime slots describe one finalized
build. Semantic token and branch coordinates are the stable addresses used by
runtime snapshots and interchange.

`buildManifest(records, css)` is public from `/vite` for integrations that own
the evaluation pipeline. Ordinary applications consume the artifact written by
the plugin.

## 3. Structured explanation

The finalized system explains a token without requiring emitted-CSS archaeology:

```TS
const explanation = ds.explain(ds.t.color.brand)

explanation.path
explanation.expression
explanation.inference
explanation.dependencies
explanation.declarations
explanation.preview
```

An explanation covers authored expression, why the token became a value or
custom-property reference, folding/support decisions, dependencies, preview,
and each emitted root/condition/axis/case context. Expression-emitted tokens
retain a resolved preview where the build can compute one.

A bound runtime has a separate, read-only operational view:

```TS
const state = runtime.inspect()
```

It reports the bound system/root, explicit overrides, selected modes, runtime
addresses, and reconciliation diagnostics. It never pretends to reproduce the
browser's full computed cascade.

## 4. Audits

`audit(manifest, css, config?)` and `formatAuditFindings()` are exported from
`@mszr/vane-dux/vite`. The implemented lanes are:

- `unusedTokens`;
- `nearDuplicates`;
- `contrast` acceptances;
- `escapes`;
- `scaleStrays`;
- `focusVisibility`;
- `specificityContexts`;
- `rawAssertions`;
- `nonportableValues`;
- `ambiguousAxes`;
- `mutableRootHazards`;
- `aliasEscapes`.

Every lane warns by default. A system carries its own promotion policy:

```TS
const ds = de.createSystem({
  tokens,
  audit: {
    unusedTokens: 'error',
    escapes: 'off',
  },
})
```

Audits diagnose drift that the system's own data can establish and include a
repair direction. They do not turn aesthetic preference into universal law.

## 5. Agent context

The manifest is the primary agent/tool interface. `/vite` also exports:

```TS
import { buildAgentContext, generateAgentContext } from '@mszr/vane-dux/vite'
```

`buildAgentContext(manifest)` creates structured, bounded context;
`generateAgentContext(manifest)` renders the same facts as oriented Markdown.
The projection includes the system vocabulary, preferred token paths,
conditions/axes, recipes/ports, and audit-derived cautions. It derives from the
manifest rather than maintaining a second source of design-system truth.

## 6. Interchange

DTCG import/export is specified with the token language in
[dux-spec-tokens.md §14](./dux-spec-tokens.md#14-dtcg-interchange).
Resolved export favors broad interoperability. Authored export preserves
vane-specific graph/branch/plugin metadata in the versioned
`com.mszr.vane-dux` extension; plugins participate only through explicit,
stable codecs. A document exported in authored mode by vane-dux must import
losslessly when the required engine plugins/codecs are present.

## 7. Evidence

The introspection test planes cover manifest shape and stability, explanations,
runtime inspection/reconciliation, every audit lane, DTCG round trips, plugin
codec failure modes, agent-context bounds, Vite artifact emission, and
source/debug provenance. Permanent gate ownership lives in
[dux-testing.md](./dux-testing.md).
