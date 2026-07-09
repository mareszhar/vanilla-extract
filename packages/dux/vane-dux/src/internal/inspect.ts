/**
 * The introspection channel ([dux-spec-introspection.md]): build-time factories
 * record what they defined — tokens with resolved per-scheme values, systems,
 * recipes, ports, escapes, contrast results — and the build plane drains the
 * records into the manifest. The channel lives on `globalThis` under a
 * registered symbol because a style-module bundle carries its own copy of this
 * module ([vite.ts]): the two copies must observe one store.
 *
 * Recording is a no-op unless a collector is open, so authoring calls outside
 * the plugin (tests, the emit harness) pay one guarded push at most.
 */

import type { VaneTokenMode } from './handle'

// ─── Records ─────────────────────────────────────────────────────────────────

export interface VaneTokenRecord {
  kind: 'token'
  /** The style module that defined it, root-relative. */
  file?: string
  /** The dot path in the graph: `color.brand`. */
  path: string
  /** The emitted custom property: `--vane-color-brand`. */
  var: string
  mode: VaneTokenMode
  /** The built value per scheme — equal strings when the token is scheme-blind. */
  light: string
  dark: string
  /** The emitted CSS value — the live form when the token stays live. */
  css: string
  /** The `contrast-color()` upgrade a live legible pairing declares, if any. */
  upgrade?: string
  /** Token paths this token's definition references — the graph edges. */
  refs: string[]
  description?: string
  deprecated?: string
}

export interface VaneSystemRecord {
  kind: 'system'
  file?: string
  prefix: string
  layers: string[]
  /** Condition name → its compiled arms, serialized readably. */
  conditions: Record<string, string>
  audit?: VaneAuditConfig
}

export interface VaneRecipeRecord {
  kind: 'recipe' | 'anatomy'
  file?: string
  /** The export name, via the debug-name transform; unnamed recipes stay out of the manifest. */
  name?: string
  parts?: string[]
  variants: Record<string, string[]>
  toggles: string[]
  defaults: Record<string, string | boolean>
  /** Published port name → the port's own custom-property name. */
  ports: Record<string, string>
}

export interface VanePortRecord {
  kind: 'port'
  file?: string
  /** The export name, via the debug-name transform; manual labels pass through too. */
  label?: string
  /** The live declaration record — read at manifest time so late `.describe()` calls still land. */
  meta: {
    name: string
    kind: string
    defaultValue: string | number
    unit?: string
    description?: string
    deprecated?: string
  }
}

export type VaneEscapeForm = 'css.raw' | 'unsafe' | 'globalCss' | 'overrides'

export interface VaneEscapeRecord {
  kind: 'escape'
  form: VaneEscapeForm
  file?: string
  /** What the escape holds: the selector, the declaration, or the block's first line. */
  detail: string
  /** The stated intent — required on `unsafe`, absent elsewhere. */
  reason?: string
  layer?: string
}

export interface VaneContrastRecord {
  kind: 'contrast'
  file?: string
  /** The token path (a `legibleOn` value) or the check's pairing description. */
  pairing: string
  scheme: 'light' | 'dark'
  algorithm: 'apca' | 'wcag2'
  /** The measured contrast: APCA Lc or a WCAG ratio. */
  measured: number
  min: number
  /** True when the threshold was consciously accepted at the definition site. */
  accepted: boolean
}

export type VaneInspectRecord
  = | VaneTokenRecord
    | VaneSystemRecord
    | VaneRecipeRecord
    | VanePortRecord
    | VaneEscapeRecord
    | VaneContrastRecord

// ─── Audit configuration (recorded by the system, applied by the audit) ──────

export type VaneAuditKind = 'unusedTokens' | 'nearDuplicates' | 'contrast' | 'escapes' | 'scaleStrays'

export type VaneAuditLevel = 'off' | 'warn' | 'error'

/**
 * Per-audit promotion, declared on the system so the quality bar travels with
 * the design system ([dux-spec-introspection.md §3]): none is a hard gate by
 * default; `error` promotes one, `off` silences one.
 */
export type VaneAuditConfig = Partial<Record<VaneAuditKind, VaneAuditLevel>>

// ─── The channel ─────────────────────────────────────────────────────────────

const CHANNEL = Symbol.for('vane.inspection')

interface Channel {
  current: VaneInspectRecord[] | undefined
}

function channel(): Channel {
  const host = globalThis as { [CHANNEL]?: Channel }
  return host[CHANNEL] ??= { current: undefined }
}

/** Record one introspection fact; a no-op unless a collector is open. */
export function record(entry: VaneInspectRecord): void {
  channel().current?.push(entry)
}

/** Whether a collector is open — guards record preparation that isn't free. */
export function inspecting(): boolean {
  return channel().current !== undefined
}

/**
 * Run a build-time evaluation and return what it recorded. Evaluation is
 * synchronous end-to-end (the same guarantee the css adapter rides), so one
 * `current` slot suffices — collectors never interleave.
 */
export function collectInspection<T>(run: () => T): { result: T, records: VaneInspectRecord[] } {
  const store = channel()
  const previous = store.current
  const records: VaneInspectRecord[] = []
  store.current = records

  try {
    return { result: run(), records }
  }
  finally {
    store.current = previous
  }
}
