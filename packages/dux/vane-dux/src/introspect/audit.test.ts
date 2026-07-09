/**
 * Audits ([dux-spec-introspection.md §3]): drift the build can see and lint
 * can't — unused tokens, near-duplicate raw values, contrast acceptances, the
 * escape inventory, scale strays. Advisory by default, promotable per system.
 */

import { createSystem, legibleOn, oklch, unsafe } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'
import { collectInspection } from '../internal/inspect'
import { audit, formatAuditFindings } from './audit'
import { buildManifest } from './manifest'

/** Build a manifest + CSS from a style-module body, exactly as the plugin would. */
function built(body: () => unknown) {
  const { records, result } = collectInspection(() => emit(body))
  return { manifest: buildManifest(records, result.css), css: result.css }
}

describe('unused tokens', () => {
  it('flags a token nothing references, with the delete-or-deprecate fix', () => {
    const { manifest, css } = built(() => {
      const { t, css: style } = createSystem({ tokens: { space: { sm: '8px', md: '16px' } } })
      return style({ padding: t.space.sm }, 'card')
    })

    const findings = audit(manifest, css)
    const unused = findings.filter(finding => finding.kind === 'unusedTokens')

    expect(unused).toHaveLength(1)
    expect(unused[0].message).toContain('space.md')
    expect(unused[0].fix).toContain('.deprecated(')
  })

  it('a token feeding a used derivation is used; a deprecated token is already handled', () => {
    const { manifest, css } = built(() => {
      const { t, css: style } = createSystem({
        tokens: {
          color: {
            seed: oklch(0.58, 0.2, 285).live(),
            tint: ({ color }: any) => color.seed.alpha(0.12),
            retired: oklch(0.5, 0.1, 100).deprecated('use color.seed'),
          },
        },
      })
      return style({ background: t.color.tint }, 'card')
    })

    const paths = audit(manifest, css)
      .filter(finding => finding.kind === 'unusedTokens')
      .map(finding => finding.message)

    // seed feeds tint (used); retired is deprecated — neither is a finding.
    expect(paths).toEqual([])
  })
})

describe('near-duplicate values', () => {
  it('flags a raw color that reads as an existing token, naming the token', () => {
    const { manifest, css } = built(() => {
      const { css: style } = createSystem({ tokens: { color: { brand: '#635bff' } } })
      return style({ background: '#645cff' }, 'card') // one step off the token
    })

    const findings = audit(manifest, css).filter(finding => finding.kind === 'nearDuplicates')

    expect(findings).toHaveLength(1)
    expect(findings[0].message).toContain('#645cff')
    expect(findings[0].fix).toBe('use t.color.brand')
  })

  it('stays silent on genuinely different colors and var-borne values', () => {
    const { manifest, css } = built(() => {
      const { t, css: style } = createSystem({ tokens: { color: { brand: '#635bff' } } })
      return style({ background: t.color.brand, color: '#11aa22' }, 'card')
    })

    expect(audit(manifest, css).filter(finding => finding.kind === 'nearDuplicates')).toEqual([])
  })
})

describe('contrast acceptances', () => {
  it('surfaces a consciously-accepted threshold so it stays a decision', () => {
    const { manifest, css } = built(() => {
      const { t, css: style } = createSystem({
        tokens: {
          color: {
            mid: oklch(0.6, 0.02, 285),
            onMid: ({ color }: any) => legibleOn(color.mid, { minLc: 40 }),
          },
        },
      })
      return style({ color: t.color.onMid, background: t.color.mid }, 'chip')
    })

    const findings = audit(manifest, css).filter(finding => finding.kind === 'contrast')

    expect(findings).toHaveLength(2) // one per scheme
    expect(findings[0].message).toContain('color.onMid')
    expect(findings[0].message).toContain('APCA Lc 40')
  })
})

describe('the escape inventory', () => {
  it('enumerates css.raw, unsafe values with reasons, foreign globalCss, overrides rules', () => {
    const { manifest, css } = built(() => {
      const { t, css: style, globalCss, defineAtoms } = createSystem({ tokens: { space: { sm: '8px' } } })

      style({ layer: 'overrides', padding: t.space.sm }, 'fix')
      void style.raw`h2 { margin-block: 1rem; }`
      globalCss('body', { margin: 0 })
      globalCss('.cookie-banner', { display: 'none' })

      const atoms = defineAtoms({ properties: { gap: { sm: t.space.sm } } }, 'atoms')
      return atoms({ gap: unsafe.value('37px', 'editorial measure') })
    })

    const messages = audit(manifest, css)
      .filter(finding => finding.kind === 'escapes')
      .map(finding => finding.message)

    expect(messages).toHaveLength(4)
    expect(messages.some(message => message.includes('css.raw'))).toBe(true)
    expect(messages.some(message => message.includes('\'editorial measure\''))).toBe(true)
    expect(messages.some(message => message.includes('.cookie-banner'))).toBe(true)
    expect(messages.some(message => message.includes('overrides-layer'))).toBe(true)
    // body is ordinary global styling, not an escape.
    expect(messages.some(message => message.includes('\'body\''))).toBe(false)
  })
})

describe('scale strays', () => {
  it('flags a literal on a property the tokens already own — z-index anarchy', () => {
    const { manifest, css } = built(() => {
      const { t, css: style } = createSystem({ tokens: { z: { nav: 10, dialog: 20 } } })

      style({ zIndex: t.z.nav }, 'nav')
      style({ zIndex: t.z.dialog }, 'dialog')
      return style({ zIndex: 9999 }, 'toast')
    })

    const findings = audit(manifest, css).filter(finding => finding.kind === 'scaleStrays')

    expect(findings).toHaveLength(1)
    expect(findings[0].message).toContain('z-index: 9999')
    expect(findings[0].message).toContain('2 other z-index declarations ride the tokens')
  })

  it('never lectures a property the system did not tokenize', () => {
    const { manifest, css } = built(() => {
      const { css: style } = createSystem({ tokens: { space: { sm: '8px' } } })
      return style({ zIndex: 9999, lineHeight: 1.5 }, 'toast')
    })

    expect(audit(manifest, css).filter(finding => finding.kind === 'scaleStrays')).toEqual([])
  })
})

describe('promotion and the report', () => {
  it('the system config promotes a lane to error and can silence one', () => {
    const { manifest, css } = built(() => {
      const { css: style } = createSystem({
        tokens: { space: { sm: '8px', md: '16px' } },
        audit: { unusedTokens: 'error', escapes: 'off' },
      })
      return style({ layer: 'overrides', padding: '4px' }, 'fix')
    })

    const findings = audit(manifest, css)

    expect(findings.filter(finding => finding.kind === 'escapes')).toEqual([])
    expect(findings.filter(finding => finding.kind === 'unusedTokens')
      .every(finding => finding.level === 'error')).toBe(true)
  })

  it('formats grouped, deep-linked findings — and a clean pass says so', () => {
    const report = formatAuditFindings([
      { kind: 'unusedTokens', level: 'warn', message: 'space.md is defined but nothing references it', fix: 'delete it', file: 'design/tokens.style.ts' },
      { kind: 'escapes', level: 'error', message: 'css.raw block — h2 { … }' },
    ])

    expect(report).toContain('unused tokens (1)')
    expect(report).toContain('at design/tokens.style.ts')
    expect(report).toContain('fix: delete it')
    expect(report).toContain('escape inventory (1)')
    expect(report).toContain('1 promoted to error')

    expect(formatAuditFindings([])).toBe('✓ audit clean — no findings')
  })
})
