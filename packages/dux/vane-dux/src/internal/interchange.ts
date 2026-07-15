import type { TokenGraph } from '../tokens/graph'
import type { VaneTokenExpressionRecord } from './inspect'

export type VaneJsonValue
  = | string
    | number
    | boolean
    | null
    | readonly VaneJsonValue[]
    | { readonly [key: string]: VaneJsonValue }

/** Optional bridge for an extension whose serializer cannot lower to core IR. */
export interface VaneDtcgCodec {
  /** Stable codec identity stored in authored documents. */
  readonly id: string
  readonly version: string | number
  /** Extension identity this codec makes portable. */
  readonly extension: string
  readonly encode: (input: {
    readonly expression: VaneTokenExpressionRecord
    readonly css: string
  }) => VaneJsonValue
  readonly decode: (input: {
    readonly payload: VaneJsonValue
    readonly css: string
    readonly dependencies: readonly unknown[]
    readonly engine: object
  }) => unknown
}

export const VANE_SYSTEM_INTERCHANGE = Symbol.for('vane.systemInterchange')

export interface VaneSystemInterchange {
  readonly graph: TokenGraph
  readonly codecs: readonly VaneDtcgCodec[]
}

export interface VaneInterchangeSystem {
  readonly [VANE_SYSTEM_INTERCHANGE]: VaneSystemInterchange
}
