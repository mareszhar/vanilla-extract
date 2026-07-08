/**
 * Diagnostics are a contract ([dux-patterns.md §10]): exactly one per mistake,
 * naming the offending key and the fix. Stable `VANE_*` codes are asserted
 * by the editor-DX suites; renaming one is a breaking change.
 */

export type VaneDiagnosticCode
  = | 'VANE_TOKENS_CYCLE'
    | 'VANE_TOKENS_CONTRAST'
    | 'VANE_TOKENS_INVALID_COLOR'
    | 'VANE_TOKENS_INVALID_OVERRIDE'
    | 'VANE_TOKENS_UNKNOWN_REF'
    | 'VANE_SYSTEM_CONDITION_COLLISION'
    | 'VANE_SYSTEM_INVALID_CONDITION'
    | 'VANE_SYSTEM_UNKNOWN_LAYER'
    | 'VANE_CSS_INVALID_KEY'
    | 'VANE_CSS_INVALID_RAW'
    | 'VANE_CSS_INVALID_SELECTOR'
    | 'VANE_CSS_INVALID_VALUE'
    | 'VANE_CSS_UNKNOWN_CONDITION'
    | 'VANE_CSS_UNKNOWN_PROPERTY'
    | 'VANE_PORT_INVALID_DEFAULT'
    | 'VANE_RECIPE_INVALID_KEY'
    | 'VANE_RECIPE_UNKNOWN_VARIANT'
    | 'VANE_RECIPE_UNKNOWN_VALUE'
    | 'VANE_ANATOMY_UNKNOWN_PART'
    | 'VANE_ANATOMY_INVALID_CONDITION'
    | 'VANE_VITE_PLUGIN_MISSING'

export interface VaneDiagnostic {
  code: VaneDiagnosticCode
  /** The headline: what is wrong, naming the offending key or token path. */
  message: string
  /** Supporting detail lines (resolved values, comparisons). */
  detail?: string[]
  /** The dot path of the offending key, e.g. `color.onBrand`. */
  path?: string
  /** The style module being evaluated, when known. */
  file?: string
  /** The suggested fix. */
  fix?: string
}

function formatDiagnostic(diagnostic: VaneDiagnostic): string {
  const lines = [`✖ ${diagnostic.code}  ${diagnostic.message}`]

  for (const detail of diagnostic.detail ?? [])
    lines.push(`    ${detail}`)

  if (diagnostic.file)
    lines.push(`    at ${diagnostic.file}`)

  if (diagnostic.fix)
    lines.push(`  fix: ${diagnostic.fix}`)

  return lines.join('\n')
}

export class VaneError extends Error {
  readonly diagnostics: readonly VaneDiagnostic[]
  readonly code: VaneDiagnosticCode

  constructor(diagnostics: VaneDiagnostic | readonly VaneDiagnostic[]) {
    const all = Array.isArray(diagnostics) ? diagnostics as readonly VaneDiagnostic[] : [diagnostics as VaneDiagnostic]
    super(all.map(formatDiagnostic).join('\n\n'))
    this.name = 'VaneError'
    this.diagnostics = all
    this.code = all[0].code
  }
}

/** `did you mean 'md'?` — the enumerable-fix suggestion, shared by overrides and checks. */
export function didYouMean(input: string, candidates: readonly string[]): string | undefined {
  let best: { candidate: string, distance: number } | undefined

  for (const candidate of candidates) {
    const distance = editDistance(input, candidate)

    if (distance <= Math.max(2, Math.floor(candidate.length / 3)) && (!best || distance < best.distance))
      best = { candidate, distance }
  }

  return best?.candidate
}

function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = Array.from<number>({ length: b.length + 1 }).fill(0)
    row[0] = i
    return row
  })

  for (let j = 0; j <= b.length; j++)
    rows[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }

  return rows[a.length][b.length]
}
