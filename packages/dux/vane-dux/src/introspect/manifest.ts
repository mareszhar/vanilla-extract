/**
 * The manifest ([dux-spec-introspection.md §2]): tokens, recipes, ports,
 * conditions, escapes, and contrast results are all data known at build;
 * projecting them once into one machine-readable artifact gives agents, docs,
 * and design tooling a query surface instead of grep. Built by `/vite` beside
 * the CSS (`.vane/manifest.json`), regenerated on change in dev.
 *
 * The format is stable and versioned — safe for external tools to build on.
 * `version` bumps only on breaking shape changes.
 */

import type { VaneTokenMode } from '../internal/handle'
import type {
  VaneAuditConfig,
  VaneEscapeForm,
  VaneInspectRecord,
  VanePortRecord,
  VaneRecipeRecord,
  VaneTokenRecord,
} from '../internal/inspect'

// ─── The format ──────────────────────────────────────────────────────────────

export interface VaneManifestToken {
  /** The emitted custom property: `--vane-color-brand`. */
  var: string
  /** The built value per scheme — equal strings when the token is scheme-blind. */
  value: { light: string, dark: string }
  /** The emitted CSS value — the live expression when the token stays live. */
  css: string
  mode: VaneTokenMode
  /** Whether `applyTheme` can write it at runtime. */
  live: boolean
  /** References in the emitted CSS outside the token graph itself. */
  usage: number
  /** Token paths this token derives from — the graph edges. */
  refs?: string[]
  description?: string
  deprecated?: string
  file?: string
}

export interface VaneManifestRecipe {
  /** Present on anatomies: the named parts, styled as one unit. */
  parts?: string[]
  /** Variant axis → its declared values. */
  variants: Record<string, string[]>
  toggles: string[]
  defaults: Record<string, string | boolean>
  /** Published port name → its custom-property name (a key into `ports`). */
  ports: Record<string, string>
  file?: string
}

export interface VaneManifestPort {
  /** The emitted custom property: `--vane-fraction__h4x`. */
  var: string
  type: 'number' | 'string' | 'color'
  default: string | number
  /** The unit a number port serializes with, from `port(0, { as: 'deg' })`. */
  unit?: string
  description?: string
  deprecated?: string
  file?: string
}

export interface VaneManifestEscape {
  form: VaneEscapeForm
  /** What the escape holds: the selector, the declaration, or the block's first line. */
  detail: string
  /** The stated intent — always present on `unsafe`. */
  reason?: string
  layer?: string
  file?: string
}

export interface VaneManifestContrast {
  /** The `legibleOn` token path, or the check's pairing description. */
  pairing: string
  scheme: 'light' | 'dark'
  algorithm: 'apca' | 'wcag2'
  /** The measured contrast: APCA Lc or a WCAG 2 ratio. */
  measured: number
  min: number
  /** True when the threshold was consciously accepted at the definition site. */
  accepted: boolean
  file?: string
}

export interface VaneManifest {
  version: 1
  /** Cascade-layer order, as the system declared it. */
  layers: string[]
  /** Condition name → its compiled circumstance, readably serialized. */
  conditions: Record<string, string>
  /** Token path (`color.brand`) → the token. */
  tokens: Record<string, VaneManifestToken>
  /** Export name → the recipe or anatomy (anatomies carry `parts`). */
  recipes: Record<string, VaneManifestRecipe>
  /** `<Component>.<export>` → the port. */
  ports: Record<string, VaneManifestPort>
  escapes: VaneManifestEscape[]
  contrast: VaneManifestContrast[]
  /** The systems' audit promotions, honored by `audit()`. */
  audit?: VaneAuditConfig
}

// ─── The builder ─────────────────────────────────────────────────────────────

/**
 * Project inspection records and the emitted CSS into the manifest. Records
 * arrive in evaluation order; the emitted CSS provides the usage counts —
 * references in style rules, graph-internal edges excluded.
 */
export function buildManifest(records: readonly VaneInspectRecord[], css: string): VaneManifest {
  const manifest: VaneManifest = {
    version: 1,
    layers: [],
    conditions: {},
    tokens: {},
    recipes: {},
    ports: {},
    escapes: [],
    contrast: [],
  }

  const tokenRecords: VaneTokenRecord[] = []
  let audit: VaneAuditConfig | undefined

  for (const record of records) {
    switch (record.kind) {
      case 'system':
        manifest.layers = record.layers
        manifest.conditions = record.conditions
        if (record.audit)
          audit = { ...audit, ...record.audit }
        break
      case 'token':
        tokenRecords.push(record)
        break
      case 'recipe':
      case 'anatomy':
        if (record.name !== undefined)
          manifest.recipes[record.name] = recipeEntry(record)
        break
      case 'port':
        manifest.ports[portKey(record)] = portEntry(record)
        break
      case 'escape':
        manifest.escapes.push({
          form: record.form,
          detail: record.detail,
          ...(record.reason === undefined ? {} : { reason: record.reason }),
          ...(record.layer === undefined ? {} : { layer: record.layer }),
          ...(record.file === undefined ? {} : { file: record.file }),
        })
        break
      case 'contrast':
        manifest.contrast.push({
          pairing: record.pairing,
          scheme: record.scheme,
          algorithm: record.algorithm,
          measured: record.measured,
          min: record.min,
          accepted: record.accepted,
          ...(record.file === undefined ? {} : { file: record.file }),
        })
        break
    }
  }

  // Usage: references in the emitted CSS, minus the graph's own edges — the
  // token values (and contrast upgrades) re-reference their inputs in `:root`.
  const internal = new Map<string, number>()

  for (const token of tokenRecords) {
    for (const other of tokenRecords) {
      const inValues = countVarRefs(`${other.css} ${other.upgrade ?? ''}`, token.var)

      if (inValues > 0)
        internal.set(token.path, (internal.get(token.path) ?? 0) + inValues)
    }
  }

  for (const token of tokenRecords) {
    manifest.tokens[token.path] = {
      var: token.var,
      value: { light: token.light, dark: token.dark },
      css: token.css,
      mode: token.mode,
      live: token.mode === 'live',
      usage: Math.max(0, countVarRefs(css, token.var) - (internal.get(token.path) ?? 0)),
      ...(token.refs.length === 0 ? {} : { refs: token.refs }),
      ...(token.description === undefined ? {} : { description: token.description }),
      ...(token.deprecated === undefined ? {} : { deprecated: token.deprecated }),
      ...(token.file === undefined ? {} : { file: token.file }),
    }
  }

  if (audit)
    manifest.audit = audit

  return manifest
}

function recipeEntry(record: VaneRecipeRecord): VaneManifestRecipe {
  return {
    ...(record.parts === undefined ? {} : { parts: record.parts }),
    variants: record.variants,
    toggles: record.toggles,
    defaults: record.defaults,
    ports: record.ports,
    ...(record.file === undefined ? {} : { file: record.file }),
  }
}

/** `Progress.fraction` — the owning style module's basename plus the export name. */
function portKey(record: VanePortRecord): string {
  const base = record.file?.split('/').pop()?.replace(/\.style\.\w+$/, '')
  const label = record.label ?? record.meta.name
  return base === undefined ? label : `${base}.${label}`
}

function portEntry(record: VanePortRecord): VaneManifestPort {
  const { meta } = record

  return {
    var: meta.name,
    type: meta.kind as VaneManifestPort['type'],
    default: meta.defaultValue,
    ...(meta.unit === undefined ? {} : { unit: meta.unit }),
    ...(meta.description === undefined ? {} : { description: meta.description }),
    ...(meta.deprecated === undefined ? {} : { deprecated: meta.deprecated }),
    ...(record.file === undefined ? {} : { file: record.file }),
  }
}

/** Occurrences of `var(--name)` / `var(--name,` — the parenthesis keeps prefixes apart. */
export function countVarRefs(text: string, name: string): number {
  let count = 0

  for (const terminator of [')', ',']) {
    const needle = `var(${name}${terminator}`
    let index = text.indexOf(needle)

    while (index !== -1) {
      count++
      index = text.indexOf(needle, index + needle.length)
    }
  }

  return count
}
