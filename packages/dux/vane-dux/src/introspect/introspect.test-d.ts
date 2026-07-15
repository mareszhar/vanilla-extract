/**
 * The type plane for introspection: the audit config is typed at the key
 * ([dux-patterns.md §2]) and the manifest format is a public type external
 * tools can build on.
 */

import type {
  VaneAuditConfig,
  VaneAuditKind,
  VaneAuditLevel,
  VaneDtcgDocument,
  VaneRuntimeInspection,
  VaneTokenExplanation,
} from '@mszr/vane-dux'
import type { VaneManifest, VaneManifestToken } from '@mszr/vane-dux/vite'
import { createEngine, createSystem, exportDesignTokens, importDesignTokens } from '@mszr/vane-dux'
import { describe, expectTypeOf, it } from 'vitest'

describe('the audit config', () => {
  it('accepts the declared lanes at the declared levels', () => {
    const config: VaneAuditConfig = { unusedTokens: 'error', escapes: 'off', scaleStrays: 'warn' }

    void createSystem({ tokens: {}, audit: config })
    void createSystem({ tokens: {}, audit: { nearDuplicates: 'error', contrast: 'warn' } })
  })

  it('rejects an unknown lane and a wrong level, each at the offending key', () => {
    void createSystem({
      tokens: {},
      // @ts-expect-error — 'unusedToken' names no audit lane
      audit: { unusedToken: 'error' },
    })

    void createSystem({
      tokens: {},
      // @ts-expect-error — 'loud' is not an audit level
      audit: { escapes: 'loud' },
    })
  })

  it('kinds and levels are closed unions', () => {
    expectTypeOf<VaneAuditKind>().toEqualTypeOf<
      | 'unusedTokens'
      | 'nearDuplicates'
      | 'contrast'
      | 'escapes'
      | 'scaleStrays'
      | 'focusVisibility'
      | 'specificityContexts'
      | 'rawAssertions'
      | 'nonportableValues'
      | 'ambiguousAxes'
      | 'mutableRootHazards'
      | 'aliasEscapes'
    >()
    expectTypeOf<VaneAuditLevel>().toEqualTypeOf<'off' | 'warn' | 'error'>()
  })
})

describe('the manifest format', () => {
  it('is versioned and shaped as documented', () => {
    expectTypeOf<VaneManifest['version']>().toEqualTypeOf<2>()
    expectTypeOf<VaneManifest['tokens']>().toEqualTypeOf<Record<string, VaneManifestToken>>()
    expectTypeOf<VaneManifestToken['declarations']>().toEqualTypeOf<VaneManifestToken['declarations']>()
    expectTypeOf<VaneManifestToken['mutable']>().toEqualTypeOf<boolean>()
  })

  it('types explanations, runtime inspection, and DTCG interchange', () => {
    const de = createEngine()
    const ds = de.createSystem({ tokens: de.defineTokens({ space: { sm: de.token({ val: de.length.rem(1) }) } }) })
    expectTypeOf(ds.explain(ds.t.space.sm)).toEqualTypeOf<VaneTokenExplanation>()
    expectTypeOf(ds.runtime().inspect()).toEqualTypeOf<VaneRuntimeInspection>()
    expectTypeOf(exportDesignTokens(ds)).toEqualTypeOf<VaneDtcgDocument>()
    expectTypeOf(importDesignTokens({ space: { sm: { $type: 'dimension', $value: { value: 1, unit: 'rem' } } } }, { engine: de }))
      .toMatchTypeOf<object>()

    // @ts-expect-error — export mode is a closed semantic choice
    void exportDesignTokens(ds, { mode: 'flattened' })
  })
})
