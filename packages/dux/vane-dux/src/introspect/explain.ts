import type { VaneTokenRecord } from '../internal/inspect'
import type { TokenGraph } from '../tokens/graph'
import type { VaneTokenHandleAny } from '../tokens/types'
import { tokenInspectionOf } from '../tokens/graph'

export interface VaneTokenExplanation {
  readonly path: readonly string[]
  readonly source?: { readonly file?: string, readonly line?: number, readonly column?: number }
  readonly name?: `--${string}`
  readonly type: VaneTokenRecord['semantic']['type']
  readonly expression: VaneTokenRecord['semantic']['expression']
  readonly dependencies: VaneTokenRecord['semantic']['dependencies']
  readonly reference: 'val' | 'var'
  readonly emit: boolean
  readonly mutable: boolean
  readonly hasDefault: boolean
  readonly inference: VaneTokenRecord['semantic']['inference']
  readonly fold: VaneTokenRecord['semantic']['fold']
  readonly preview:
    | { readonly status: 'resolved', readonly val: string, readonly environment: Readonly<Record<string, string>> }
    | { readonly status: 'unavailable', readonly reason: string }
  readonly support: VaneTokenRecord['semantic']['support']
  readonly declarations: VaneTokenRecord['semantic']['declarations']
  readonly branches: VaneTokenRecord['semantic']['branches']
  readonly registration?: VaneTokenRecord['semantic']['registration']
  readonly runtime?: VaneTokenRecord['runtime']
  readonly portability: VaneTokenRecord['semantic']['portability']
  readonly metadata: Readonly<Record<string, unknown>>
  readonly description?: string
  readonly deprecated?: string
}

/** One stable structured answer from authored decision to every CSS context. */
export function explainToken(graph: TokenGraph, handle: VaneTokenHandleAny): VaneTokenExplanation {
  const token = tokenInspectionOf(graph, handle as any)
  return Object.freeze({
    path: Object.freeze(token.path.split('.')),
    source: Object.freeze({
      ...(token.file === undefined ? {} : { file: token.file }),
      ...(token.line === undefined ? {} : { line: token.line }),
      ...(token.column === undefined ? {} : { column: token.column }),
    }),
    name: token.semantic.emit || token.semantic.reference === 'var' ? token.var as `--${string}` : undefined,
    type: token.semantic.type,
    expression: token.semantic.expression,
    dependencies: token.semantic.dependencies,
    reference: token.semantic.reference,
    emit: token.semantic.emit,
    mutable: token.semantic.mutable,
    hasDefault: token.semantic.hasDefault,
    inference: token.semantic.inference,
    fold: token.semantic.fold,
    preview: explanationPreview(token, graph),
    support: token.semantic.support,
    declarations: token.semantic.declarations,
    branches: token.semantic.branches,
    ...(token.semantic.registration === undefined ? {} : { registration: token.semantic.registration }),
    ...(token.runtime === undefined ? {} : { runtime: token.runtime }),
    portability: token.semantic.portability,
    metadata: token.semantic.metadata,
    ...(token.description === undefined ? {} : { description: token.description }),
    ...(token.deprecated === undefined ? {} : { deprecated: token.deprecated }),
  })
}

function explanationPreview(token: VaneTokenRecord, graph: TokenGraph): VaneTokenExplanation['preview'] {
  const environment = Object.freeze(Object.fromEntries((graph.axes?.order ?? []).flatMap((axis) => {
    const mode = graph.axes!.definitions[axis]!.defaultMode
    return mode === undefined ? [] : [[axis, mode]]
  })))
  let val: string | number | undefined = token.preview.status === 'available'
    ? (environment.scheme === 'dark' ? token.preview.dark : token.preview.light)
    : undefined
  for (const axis of graph.axes?.order ?? []) {
    const branch = token.semantic.branches.find(entry => entry.address.kind === 'axis'
      && entry.address.axis === axis && entry.address.mode === environment[axis])
    if (branch && branch.val !== null)
      val = branch.val
  }
  for (const branch of token.semantic.branches) {
    if (branch.address.kind === 'case'
      && Object.entries(branch.address.when).every(([axis, mode]) => environment[axis] === mode)
      && branch.val !== null) {
      val = branch.val
    }
  }
  if (val === undefined)
    return token.preview.status === 'unavailable' ? token.preview : { status: 'unavailable', reason: 'no value in the default environment' }
  if (String(val).includes('var('))
    return { status: 'unavailable', reason: 'the selected environment contains a runtime token/custom-property dependency' }
  return { status: 'resolved', val: String(val), environment }
}
