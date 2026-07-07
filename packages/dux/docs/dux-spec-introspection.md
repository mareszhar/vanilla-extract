updated: 2026-07-06
status: spec — contracts settled, implementation pending

# vane-dux — spec: introspection

The system explains itself: provenance from pixels back to decisions, a machine-readable manifest, and audits that keep the system honest. Phase 8 of the roadmap. The rationale is [dux-patterns.md §11](./dux-patterns.md#11-agent-legibility): agents and 11pm-you want the same thing.

## Implementation status

| # | Contract | Status |
| --- | --- | --- |
| 1 | Provenance | ☐ |
| 2 | The manifest | ☐ |
| 3 | Audits | ☐ |
| 4 | Agent context | manifest-first; generator deferred |

---

## 1. Provenance

**Why.** Hashed class soup with no origin is the TS-styling horror on the *output* side. Every rendered rule must lead back to the decision that produced it (gauntlet moment 10).

**Contract details.**

- Dev class names are stable and legible: `Button_root__h4x`, `Dialog_content--size-lg__h4x` — component, part, variant, then hash.
- Emitted dev CSS carries source maps and origin comments; a devtools rule points to the `.style.ts` line.
- Token attribution survives to dev output: a declaration produced by `t.space.md` says so (`/* ← t.space.md */`), so "why is this 16px" reads as *scale unit 4 × 4*.
- Production emits minified boring CSS — provenance is a dev-build artifact with zero shipped cost.

**Proposed approach.** Debug identifiers ride the substrate's identifier machinery (`/vite` sets the debug-id mode); token attribution is emitted by the token proxy during evaluation.

---

## 2. The manifest

**Why.** Tokens, recipes, ports, and conditions are all data known at build; projecting them once into a machine-readable artifact gives agents, docs, and design tooling one query surface instead of grep.

**Usage.** Built by `/vite` alongside the CSS (`.vane/manifest.json`), regenerated on change in dev.

```JSON
{
  "tokens": {
    "color.brand": {
      "var": "--prism-color-brand",
      "value": { "light": "oklch(0.58 0.2 285)", "dark": "oklch(0.58 0.2 285)" },
      "live": true,
      "description": "Primary brand hue. Marketing owns this.",
      "usage": 41
    }
  },
  "recipes": {
    "button": { "variants": { "intent": ["brand", "ghost", "danger"], "size": ["sm", "md"] }, "toggles": ["pill"] }
  },
  "ports": {
    "Progress.fraction": { "type": "number", "default": 0 }
  }
}
```

**Contract details.**

- Contents: every token (var name, per-scheme values, liveness, metadata, usage count), every recipe/anatomy (variant space, parts), every port (type, default, description), conditions, layers, and the escape inventory (§3).
- The manifest is a **stable format** — versioned, documented, safe for external tools to build on. An MCP server over it is a deferred intention ([dux-vision.md §8](./dux-vision.md#8-deferred-intentions)).

---

## 3. Audits

**Why.** The build knows enough to flag drift that lint can't see. Each finding is a warning with a fix-it — delight dies where lint becomes moralizing.

**Contract details.**

- **Unused tokens:** defined, never referenced (module-graph + manifest usage counts). Fix-it: delete or mark `.deprecated()`.
- **Near-duplicate values:** a raw value within a perceptual epsilon of an existing token (`#1f2937 appears 3×; t.color.gray800 is ΔE-identical — suggest`).
- **Contrast findings:** the check results in one place, including consciously-accepted overrides ([dux-spec-tokens.md §5](./dux-spec-tokens.md#5-contrast-and-checks)).
- **Escape inventory:** every `css.raw`, `unsafe.value(…, reason)`, third-party-targeting `globalCss`, and `overrides`-layer rule, with its reason and location — exceptional CSS made findable, reviewable, removable.
- **Scale strays:** values outside a declared scale (z-index anarchy).

Audits run as part of `pnpm run validate` and print grouped, deep-linked findings; none is a hard gate by default, and each can be promoted to one per system config.

---

## 4. Agent context

**Why.** An agent asked for "a new card variant matching house style" should succeed without reading the docs site (gauntlet moment 11). Conventions must be explicit and queryable, not tribal.

**Contract details.**

- **The manifest is the agent interface** (§2): stable, versioned, machine-readable, and always current because the build emits it. An agent that reads it plus the types has everything the delight gauntlet demands; diagnostics remain the correction loop — `tsc` and the build referee ([dux-patterns.md §11](./dux-patterns.md#11-agent-legibility)).
- A prose **agent-context generator** (manifest → oriented markdown with escape policy and audit-derived "don't" guidance) is a deferred intention with a named trigger — a real agent consumer whose needs the raw manifest demonstrably doesn't meet ([dux-vision.md §8](./dux-vision.md#8-deferred-intentions)). Building prose nobody consumes would spend implementation budget the call sites need more.
