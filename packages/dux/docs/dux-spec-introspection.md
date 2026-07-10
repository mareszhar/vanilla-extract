updated: 2026-07-09
status: spec — contracts settled, implemented (phase 8)

# vane-dux — spec: introspection

The system explains itself: provenance from pixels back to decisions, a machine-readable manifest, and audits that keep the system honest. Phase 8 of the roadmap. The rationale is [dux-patterns.md §11](./dux-patterns.md#11-agent-legibility): agents and 11pm-you want the same thing.

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | Provenance | ☑ |
| 2 | The manifest | ☑ |
| 3 | Audits | ☑ |
| 4 | Agent context | ☑ manifest-first; generator deferred |

---

## 1. Provenance

**Why.** Hashed class soup with no origin is the TS-styling horror on the *output* side. Every rendered rule must lead back to the decision that produced it (gauntlet moment 10).

**Contract details.**

- Dev class names are stable and legible: `button__h4x`, `button_intent_ghost__h4x`, `dialog_content__h4x` — export name, then arm, then hash. The `/vite` debug-name transform injects the names from the declarations, so rename-symbol renames the emitted identifiers too.
- A devtools rule leads to its source in one hop: dev CSS is served under a virtual file named for its style module (`…/AppButton.style.ts.vane.css`) and opens with an origin banner (`/* app/components/AppButton.style.ts · vane-dux */`).
- Token attribution survives to dev output structurally: a token reference is never folded at its usage site, so a declaration decided by `t.space.md` reads `var(--vane-space-md)` in devtools — the name *is* the attribution, and the computed value sits beside it.
- Production emits minified boring CSS — provenance is a dev-build artifact with zero shipped cost.

**Implementation.** Debug identifiers ride the substrate's identifier machinery (`/vite` sets the debug-id mode and injects declaration names); the origin banner is prepended when the dev server stores a virtual stylesheet. The same AST pass records exact call/property positions. The manifest’s class-provenance table maps each emitted `css()` class to its `.style.ts` line/column and referenced token paths, while tokens and recipes carry their own definition positions. Line-level generated-CSS source maps stay off the contract because this route is more direct: rendered class → authored call → graph decisions, without asking users to navigate compiler output.

---

## 2. The manifest

**Why.** Tokens, recipes, ports, and conditions are all data known at build; projecting them once into a machine-readable artifact gives agents, docs, and design tooling one query surface instead of grep.

**Usage.** Built by `/vite` beside the CSS — `.vane/manifest.json`, regenerated (debounced) on change in dev, written once per build. Dev also serves it live at `/__vane/manifest.json`, and `/__vane/` renders it as the token/recipe/port browser the Nuxt module embeds as its DevTools tab ([dux-spec-vue.md §4](./dux-spec-vue.md#4-the-nuxt-module)).

```JSON
{
  "version": 1,
  "layers": ["reset", "tokens", "recipes", "utilities", "overrides"],
  "conditions": { "open": "&[data-state=\"open\"]", "md": "@media (min-width: 768px)" },
  "tokens": {
    "color.brand": {
      "var": "--vane-color-brand",
      "value": { "light": "oklch(0.58 0.2 285)", "dark": "oklch(0.58 0.2 285)" },
      "css": "oklch(0.58 0.2 285)",
      "mode": "live",
      "live": true,
      "usage": 41,
      "description": "Primary brand hue. Marketing owns this.",
      "file": "design/palette.tokens.ts",
      "line": 4,
      "column": 12
    }
  },
  "styles": {
    "card__h4x": { "name": "card", "tokens": ["color.brand"], "file": "components/Card.style.ts", "line": 6, "column": 21 }
  },
  "recipes": {
    "button": { "variants": { "intent": ["brand", "ghost"] }, "toggles": ["pill"], "defaults": { "intent": "brand" }, "ports": { "gap": "--vane-gap__h4x" } }
  },
  "ports": {
    "Progress.fraction": { "var": "--vane-fraction__h4x", "type": "number", "default": 0 }
  },
  "escapes": [],
  "contrast": []
}
```

**Contract details.**

- Contents: every token (var name, per-scheme built values, emitted CSS value, mode/liveness, graph edges under `refs`, metadata, usage count — references in emitted CSS, graph-internal edges excluded), every `css()` class (authored name, exact source, referenced token paths), every recipe/anatomy (variant space, toggles, defaults, parts, published ports), every port (`Component.export` key, type, default, unit, description), conditions and layers, the escape inventory (§3), and every contrast result — passes and accepted thresholds alike.
- The manifest is a **stable format** — versioned (`version: 1`, bumped only on breaking shape changes), typed (`VaneManifest` from `/vite`), safe for external tools to build on. An MCP server over it is a deferred intention ([dux-vision.md §8](./dux-vision.md#8-deferred-intentions)).

**Implementation.** Build-time factories record what they define into an inspection channel (`internal/inspect.ts`, shared across module instances via `globalThis`); the plugin drains it per evaluation, replaces each file's records, and projects the whole store through `buildManifest` (exported from `/vite`).

---

## 3. Audits

**Why.** The build knows enough to flag drift that lint can't see. Each finding is a warning with a fix-it — delight dies where lint becomes moralizing.

**Contract details.**

- **Unused tokens:** defined, never referenced — not in the emitted CSS, and not (transitively) feeding a token that is. Deprecated tokens are exempt (deprecation *is* the fix-it). Fix-it: delete or mark `.deprecated()`.
- **Near-duplicate values:** a raw color within a perceptual epsilon (ΔEok) of an existing token — `'#645cff' appears 3× as a raw value — t.color.brand is visually the same color`. Fix-it: use the token.
- **Contrast findings:** the consciously-accepted `legibleOn` thresholds, surfaced per scheme so acceptance stays a decision ([dux-spec-tokens.md §5](./dux-spec-tokens.md#5-contrast-and-checks)); the full result set (passes included) lives in the manifest.
- **Escape inventory:** every `css.raw`, `unsafe.value(…, reason)` with its reason, class/id-targeting `globalCss`, and `overrides`-layer rule, with its location — exceptional CSS made findable, reviewable, removable.
- **Scale strays:** a literal value for a property the system already styles through tokens (z-index anarchy). Data-driven: a property lane only speaks when tokenized declarations dominate it, so a system that never tokenized a property is never lectured about it.
- **Focus visibility:** a class or global subject that removes its outline without supplying a visible `:focus-visible` outline. Fix-it: spread `focusRing()` or add an equivalent `focusVisible` rule; class findings point back through manifest provenance.

Audits run as part of `pnpm run validate` (`pnpm run audit`, which builds the fixture app through the real plugin and audits its manifest + CSS; point it at any Vite-rooted style app with `pnpm run audit -- <dir>`). Findings print grouped and deep-linked; none is a hard gate by default, and each lane can be promoted (or silenced) per system: `createSystem({ audit: { unusedTokens: 'error', escapes: 'off' } })` — the config rides the manifest, so any audit runner honors it.

**Implementation.** `audit(manifest, css, config?)` and `formatAuditFindings` are exported from `/vite`; both operate on build artifacts only, so they run anywhere the manifest and CSS exist.

---

## 4. Agent context

**Why.** An agent asked for "a new card variant matching house style" should succeed without reading the docs site (gauntlet moment 11). Conventions must be explicit and queryable, not tribal.

**Contract details.**

- **The manifest is the agent interface** (§2): stable, versioned, machine-readable, and always current because the build emits it. An agent that reads it plus the types has everything the delight gauntlet demands; diagnostics remain the correction loop — `tsc` and the build referee ([dux-patterns.md §11](./dux-patterns.md#11-agent-legibility)).
- A prose **agent-context generator** (manifest → oriented markdown with escape policy and audit-derived "don't" guidance) is a deferred intention with a named trigger — a real agent consumer whose needs the raw manifest demonstrably doesn't meet ([dux-vision.md §8](./dux-vision.md#8-deferred-intentions)). Building prose nobody consumes would spend implementation budget the call sites need more.
