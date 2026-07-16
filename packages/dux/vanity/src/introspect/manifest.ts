/**
 * The manifest ([vanity-spec-introspection.md §2]): tokens, recipes, ports,
 * conditions, escapes, and contrast results are all data known at build;
 * projecting them once into one machine-readable artifact gives agents, docs,
 * and design tooling a query surface instead of grep. Built by `/vite` beside
 * the CSS (`.vanity/manifest.json`), regenerated on change in dev.
 *
 * The format is stable and versioned — safe for external tools to build on.
 * `version` bumps only on breaking shape changes.
 */

import type {
  VanityAuditConfig,
  VanityEscapeForm,
  VanityInspectRecord,
  VanityPortRecord,
  VanityRecipeRecord,
  VanitySourceRecord,
  VanityStyleRecord,
  VanityTokenRecord,
} from '../internal/inspect'
import type { VanityAxisRegistryDescription } from '../system/axes'

// ─── The format ──────────────────────────────────────────────────────────────

export interface VanityManifestSource {
  file?: string
  line?: number
  column?: number
}

export type VanityManifestDeclaration = VanityTokenRecord['semantic']['declarations'][number]
export type VanityManifestDependency = VanityTokenRecord['semantic']['dependencies'][number]
export type VanityManifestExpression = VanityTokenRecord['semantic']['expression']

export interface VanityManifestToken extends VanityManifestSource {
  /** Stable semantic address, independent of the current naming policy. */
  path: readonly string[]
  /** The public custom property, absent only for a genuinely nonemitted value token. */
  name?: `--${string}`
  type: VanityTokenRecord['semantic']['type']
  reference: 'val' | 'var'
  emit: boolean
  mutable: boolean
  hasDefault: boolean
  /** References in the emitted CSS outside the token graph itself. */
  usage: number
  expression: VanityManifestExpression
  inference: VanityTokenRecord['semantic']['inference']
  fold: VanityTokenRecord['semantic']['fold']
  dependencies: readonly VanityManifestDependency[]
  support: Omit<VanityTokenRecord['semantic']['support'], 'target'>
  declarations: readonly VanityManifestDeclaration[]
  branches?: VanityTokenRecord['semantic']['branches']
  registration?: VanityTokenRecord['semantic']['registration']
  portability: VanityTokenRecord['semantic']['portability']
  preview:
    | { status: 'resolved', val: string, environment?: Readonly<Record<string, string>>, caveats?: readonly string[] }
    | { status: 'unavailable', reason: string }
  metadata?: Readonly<Record<string, unknown>>
  description?: string
  deprecated?: string
  runtime?: VanityTokenRecord['runtime']
}

export interface VanityManifestRecipe extends VanityManifestSource {
  /** Present on anatomies: the named parts, styled as one unit. */
  parts?: string[]
  /** Variant axis → its declared values. */
  variants: Record<string, string[]>
  toggles: string[]
  defaults: Record<string, string | boolean>
  /** Published port name → its custom-property name (a key into `ports`). */
  ports: Record<string, string>
}

export interface VanityManifestPort extends VanityManifestSource {
  /** The emitted custom property: `--vanity-fraction__h4x`. */
  var: string
  /** Canonical CSS data type used by the common value serializer. */
  type: import('../values/types').VanityCssDataType
  default: string | number
  validation?: import('../ports/types').VanityPortValidationMeta
  description?: string
  deprecated?: string
}

export interface VanityManifestEscape extends VanityManifestSource {
  form: VanityEscapeForm
  /** What the escape holds: the selector, the declaration, or the block's first line. */
  detail: string
  /** The stated intent — always present on `unsafe`. */
  reason?: string
  layer?: string
}

export interface VanityManifestContrast extends VanityManifestSource {
  /** The `legibleOn` token path, or the check's pairing description. */
  pairing: string
  scheme: 'light' | 'dark'
  algorithm: 'apca' | 'wcag2'
  /** The measured contrast: APCA Lc or a WCAG 2 ratio. */
  measured: number
  min: number
  /** True when the threshold was consciously accepted at the definition site. */
  accepted: boolean
}

export interface VanityManifestStyle extends VanityManifestSource {
  name?: string
  /** Token paths referenced by this class's compiled declarations. */
  tokens: string[]
}

export interface VanityManifest {
  version: 2
  /** Final system identity and ordinary token emission location. */
  root?: string
  tokenLayer?: string
  engine?: string
  /** CSS support target inherited by token support records. */
  supportTarget?: string
  runtime?: {
    readonly protocol: number
    readonly system: string
    readonly root: string
  }
  /** Cascade-layer order, as the system declared it. */
  layers: string[]
  /** Condition name → its compiled circumstance, readably serialized. */
  conditions: Record<string, string>
  /** Environmental vocabulary, precedence, and per-trigger locality. */
  axes?: VanityAxisRegistryDescription
  /** Environment inherited by resolved previews that omit an override. */
  previewEnvironment?: Readonly<Record<string, string>>
  /** Token path (`color.brand`) → the token. */
  tokens: Record<string, VanityManifestToken>
  /** Export name → the recipe or anatomy (anatomies carry `parts`). */
  recipes: Record<string, VanityManifestRecipe>
  /** Emitted class → its authored call site and token dependencies. */
  styles: Record<string, VanityManifestStyle>
  /** `<Component>.<export>` → the port. */
  ports: Record<string, VanityManifestPort>
  escapes: VanityManifestEscape[]
  contrast: VanityManifestContrast[]
  /** The systems' audit promotions, honored by `audit()`. */
  audit?: VanityAuditConfig
}

// ─── The builder ─────────────────────────────────────────────────────────────

/**
 * Project inspection records and the emitted CSS into the manifest. Records
 * arrive in evaluation order; the emitted CSS provides the usage counts —
 * references in style rules, graph-internal edges excluded.
 */
export function buildManifest(records: readonly VanityInspectRecord[], css: string): VanityManifest {
  const manifest: VanityManifest = {
    version: 2,
    layers: [],
    conditions: {},
    tokens: {},
    recipes: {},
    styles: {},
    ports: {},
    escapes: [],
    contrast: [],
  }

  const tokenRecords: VanityTokenRecord[] = []
  const styleRecords: VanityStyleRecord[] = []
  let audit: VanityAuditConfig | undefined

  for (const record of records) {
    switch (record.kind) {
      case 'system':
        manifest.layers = record.layers
        manifest.conditions = record.conditions
        if (record.axes !== undefined)
          manifest.axes = record.axes
        if (record.root !== undefined) {
          manifest.root = record.root
        }
        if (record.tokenLayer !== undefined) {
          manifest.tokenLayer = record.tokenLayer
        }
        if (record.engine !== undefined)
          manifest.engine = record.engine
        if (record.supportTarget !== undefined)
          manifest.supportTarget = record.supportTarget
        if (record.runtime !== undefined)
          manifest.runtime = record.runtime
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
      case 'style':
        styleRecords.push(record)
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
          ...manifestSource(record),
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
          ...manifestSource(record),
        })
        break
    }
  }

  // Usage: references in the emitted CSS, minus the graph's own edges — the
  // token values (and contrast upgrades) re-reference their inputs in `:root`.
  const internal = new Map<string, number>()
  const pathsByVar = new Map(tokenRecords.map(token => [token.var, token.path]))
  const cssReferences = countAllVarRefs(css)
  const previewEnvironment = defaultPreviewEnvironment(manifest.axes)
  if (Object.keys(previewEnvironment).length > 0)
    manifest.previewEnvironment = previewEnvironment

  for (const other of tokenRecords) {
    for (const [name, count] of countAllVarRefs(`${other.css} ${other.upgrade ?? ''}`)) {
      const path = pathsByVar.get(name)
      if (path !== undefined)
        internal.set(path, (internal.get(path) ?? 0) + count)
    }
  }

  for (const token of tokenRecords) {
    const semantic = token.semantic
    const support: VanityManifestToken['support'] = {
      requirements: semantic.support.requirements,
      ...(semantic.support.fallback === undefined ? {} : { fallback: semantic.support.fallback }),
      ...(semantic.support.enhancement === undefined ? {} : { enhancement: semantic.support.enhancement }),
    }
    manifest.tokens[token.path] = {
      path: token.path.split('.'),
      ...(semantic.emit || semantic.reference === 'var' ? { name: token.var as `--${string}` } : {}),
      type: semantic.type,
      reference: semantic.reference,
      emit: semantic.emit,
      mutable: semantic.mutable,
      hasDefault: semantic.hasDefault,
      usage: Math.max(0, (cssReferences.get(token.var) ?? 0) - (internal.get(token.path) ?? 0)),
      expression: semantic.expression,
      inference: semantic.inference,
      fold: semantic.fold,
      dependencies: semantic.dependencies,
      support,
      declarations: semantic.declarations,
      ...(semantic.branches.length === 0 ? {} : { branches: semantic.branches }),
      ...(semantic.registration === undefined ? {} : { registration: semantic.registration }),
      portability: semantic.portability,
      preview: manifestPreview(token, manifest.axes),
      ...(Object.keys(semantic.metadata).length === 0 ? {} : { metadata: semantic.metadata }),
      ...(token.description === undefined ? {} : { description: token.description }),
      ...(token.deprecated === undefined ? {} : { deprecated: token.deprecated }),
      ...(token.runtime === undefined ? {} : { runtime: token.runtime }),
      ...manifestSource(token),
    }
  }

  for (const style of styleRecords) {
    manifest.styles[style.class] = {
      ...(style.name === undefined ? {} : { name: style.name }),
      tokens: style.vars.flatMap(variable => pathsByVar.get(variable) ?? []),
      ...manifestSource(style),
    }
  }

  if (audit)
    manifest.audit = audit

  return manifest
}

function recipeEntry(record: VanityRecipeRecord): VanityManifestRecipe {
  return {
    ...(record.parts === undefined ? {} : { parts: record.parts }),
    variants: record.variants,
    toggles: record.toggles,
    defaults: record.defaults,
    ports: record.ports,
    ...manifestSource(record),
  }
}

/** `Progress.fraction` — the owning style module's basename plus the export name. */
function portKey(record: VanityPortRecord): string {
  const base = record.file?.split('/').pop()?.replace(/\.style\.\w+$/, '')
  const label = record.label ?? record.meta.name
  return base === undefined ? label : `${base}.${label}`
}

function portEntry(record: VanityPortRecord): VanityManifestPort {
  const { meta } = record

  return {
    var: meta.name,
    type: meta.type,
    default: meta.defaultValue,
    ...(meta.validation === undefined ? {} : { validation: meta.validation }),
    ...(meta.description === undefined ? {} : { description: meta.description }),
    ...(meta.deprecated === undefined ? {} : { deprecated: meta.deprecated }),
    ...manifestSource(record),
  }
}

function manifestSource(record: VanitySourceRecord): VanityManifestSource {
  return {
    ...(record.file === undefined ? {} : { file: record.file }),
    ...(record.line === undefined ? {} : { line: record.line }),
    ...(record.column === undefined ? {} : { column: record.column }),
  }
}

function manifestPreview(
  token: VanityTokenRecord,
  axes: VanityAxisRegistryDescription | undefined,
): VanityManifestToken['preview'] {
  const environment = defaultPreviewEnvironment(axes)
  let selected: string | number | undefined = token.preview.status === 'available'
    ? (environment.scheme === 'dark' ? token.preview.dark : token.preview.light)
    : undefined
  for (const axis of axes?.order ?? []) {
    const mode = environment[axis]
    const branch = token.semantic.branches.find(entry => entry.address.kind === 'axis'
      && entry.address.axis === axis && entry.address.mode === mode)
    if (branch && branch.val !== null)
      selected = branch.val
  }
  for (const branch of token.semantic.branches) {
    if (branch.address.kind === 'case'
      && Object.entries(branch.address.when).every(([axis, mode]) => environment[axis] === mode)
      && branch.val !== null) {
      selected = branch.val
    }
  }
  if (selected === undefined)
    return token.preview.status === 'unavailable' ? token.preview : { status: 'unavailable', reason: 'no value in the default environment' }
  if (String(selected).includes('var(')) {
    return {
      status: 'unavailable',
      reason: 'the selected environment contains a runtime token/custom-property dependency',
    }
  }
  const scheme = environment.scheme
  const val = String(selected)
  const caveats = token.preview.status !== 'available' || token.preview.light === token.preview.dark
    ? undefined
    : scheme === undefined
      ? ['the color preview has scheme branches; selected light because the axis has no declared default']
      : undefined

  return {
    status: 'resolved',
    val,
    ...(caveats === undefined ? {} : { caveats }),
  }
}

function defaultPreviewEnvironment(axes: VanityAxisRegistryDescription | undefined): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(Object.entries(axes?.definitions ?? {}).flatMap(([axis, definition]) =>
    definition.defaultMode === undefined ? [] : [[axis, definition.defaultMode]],
  )))
}

/** Occurrences of `var(--name)` / `var(--name,` — the parenthesis keeps prefixes apart. */
export function countVarRefs(text: string, name: string): number {
  return countAllVarRefs(text).get(name) ?? 0
}

function countAllVarRefs(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const match of text.matchAll(/var\((--[-\w]+)/g)) {
    const name = match[1]!
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return counts
}
