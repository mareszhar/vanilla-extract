import type { VanityManifest } from './manifest'

export interface VanityAgentContext {
  readonly manifestVersion: VanityManifest['version']
  readonly system: {
    readonly root?: string
    readonly tokenLayer?: string
    readonly layers: readonly string[]
  }
  readonly environment: {
    readonly axes: readonly {
      readonly name: string
      readonly modes: readonly string[]
      readonly defaultMode?: string
    }[]
    readonly conditions: Readonly<Record<string, string>>
  }
  readonly tokens: readonly {
    readonly path: string
    readonly type: string
    readonly reference: 'val' | 'var'
    readonly mutable: boolean
    readonly dependencies: readonly string[]
    readonly contexts: readonly string[]
    readonly description?: string
  }[]
  readonly policy: {
    readonly rawAssertions: number
    readonly aliasEscapes: number
    readonly nonportableTokens: readonly string[]
  }
}

/** Compact machine context derived entirely from the versioned manifest. */
export function buildAgentContext(manifest: VanityManifest): VanityAgentContext {
  return Object.freeze({
    manifestVersion: manifest.version,
    system: Object.freeze({
      ...(manifest.root === undefined ? {} : { root: manifest.root }),
      ...(manifest.tokenLayer === undefined ? {} : { tokenLayer: manifest.tokenLayer }),
      layers: Object.freeze([...manifest.layers]),
    }),
    environment: Object.freeze({
      axes: Object.freeze((manifest.axes?.order ?? []).map(name => Object.freeze({
        name,
        modes: Object.freeze([...(manifest.axes!.definitions[name]?.modeOrder ?? [])]),
        ...(manifest.axes!.definitions[name]?.defaultMode === undefined
          ? {}
          : { defaultMode: manifest.axes!.definitions[name]!.defaultMode }),
      }))),
      conditions: Object.freeze({ ...manifest.conditions }),
    }),
    tokens: Object.freeze(Object.entries(manifest.tokens).map(([path, token]) => Object.freeze({
      path,
      type: token.type,
      reference: token.reference,
      mutable: token.mutable,
      dependencies: Object.freeze(token.dependencies.flatMap(edge => edge.path ?? [])),
      contexts: Object.freeze([...new Set(token.declarations.map(declaration => [
        `root ${declaration.context.root}`,
        declaration.context.layer === undefined ? undefined : `@layer ${declaration.context.layer}`,
        ...declaration.context.atRules,
        ...declaration.context.selectors,
      ].filter(Boolean).join(' ')))]),
      ...(token.description === undefined ? {} : { description: token.description }),
    }))),
    policy: Object.freeze({
      rawAssertions: manifest.escapes.filter(escape => escape.form === 'css.raw' || escape.form === 'unsafe').length,
      aliasEscapes: manifest.escapes.filter(escape => escape.form === 'css.standard').length,
      nonportableTokens: Object.freeze(Object.entries(manifest.tokens)
        .filter(([, token]) => token.portability.status === 'nonportable')
        .map(([path]) => path)),
    }),
  })
}

/** Human orientation for an agent prompt; facts remain sourced from the manifest. */
export function generateAgentContext(manifest: VanityManifest): string {
  const context = buildAgentContext(manifest)
  const lines = [
    '# vanity system context',
    '',
    `Manifest v${context.manifestVersion}; root ${context.system.root ?? '(unspecified)'}.`,
    `Cascade layers: ${context.system.layers.join(' → ') || '(none)'}.`,
  ]
  if (context.environment.axes.length > 0) {
    lines.push('', 'Environmental axes:')
    for (const axis of context.environment.axes)
      lines.push(`- ${axis.name}: ${axis.modes.join(', ')}${axis.defaultMode === undefined ? '' : ` (default ${axis.defaultMode})`}`)
  }
  lines.push('', 'Token vocabulary:')
  for (const token of context.tokens) {
    const contexts = token.contexts.length === 0 ? '' : `; emits ${token.contexts.join(' | ')}`
    lines.push(`- ${token.path}: <${token.type}>, ${token.reference}${token.mutable ? ', runtime-mutable' : ''}${token.description ? ` — ${token.description}` : ''}${contexts}`)
  }
  lines.push('', 'Authoring policy:')
  lines.push('- Prefer declared tokens and conditions; emitted contexts above are the cascade contract.')
  lines.push(`- Raw assertions recorded: ${context.policy.rawAssertions}; aliases-only escapes: ${context.policy.aliasEscapes}.`)
  lines.push(`- Nonportable authored-interchange values: ${context.policy.nonportableTokens.join(', ') || 'none'}.`)
  return lines.join('\n')
}
