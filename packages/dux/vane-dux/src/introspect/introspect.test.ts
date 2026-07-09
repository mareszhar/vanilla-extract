/**
 * The manifest ([dux-spec-introspection.md §2]): one machine-readable
 * projection of everything the build knows — tokens with per-scheme values
 * and usage, recipes with their variant spaces, ports, escapes, contrast
 * results. Locked over the Prism fixtures through the same collection channel
 * the `/vite` plugin drives.
 */

import { createSystem, unsafe } from '@mszr/vane-dux'
import { definePrismSystem, emit } from '@test'
import { describe, expect, it } from 'vitest'
import { collectInspection } from '../internal/inspect'
import { buildManifest, countVarRefs } from './manifest'

/** Prism plus a representative styled surface, collected as the plugin would. */
function prismManifest() {
  const { records, result } = collectInspection(() => emit(() => {
    const { t, css, recipe, port, globalCss, defineAtoms } = definePrismSystem()

    const fraction = port(0, { label: 'fraction' })

    const button = recipe({
      base: { display: 'inline-flex', gap: t.space.xs, borderRadius: t.radius.sm },
      variants: {
        intent: {
          brand: { background: t.color.brand, color: t.color.onBrand },
          ghost: { background: 'transparent', hover: { background: t.color.brandSoft } },
        },
        size: { sm: { paddingInline: t.space.sm }, md: { paddingInline: t.space.md } },
      },
      toggles: { pill: { borderRadius: t.radius.pill } },
      defaults: { intent: 'brand', size: 'md' },
      ports: { fraction },
    }, 'button')

    const fill = css({ inlineSize: `calc(${fraction} * 100%)`, background: t.color.brand }, 'fill')
    const promo = css({ layer: 'overrides', padding: t.space.lg }, 'promo')
    const prose = css.raw`h2 { margin-block: 0.5rem; }`

    globalCss('body', { color: t.color.ink })
    globalCss('.third-party-widget', { borderRadius: t.radius.md })

    const atoms = defineAtoms({ properties: { gap: { sm: t.space.sm } } }, 'atoms')
    const escaped = atoms({ gap: unsafe.value('37px', 'editorial measure') })

    return { button, fill, promo, prose, escaped }
  }))

  return { manifest: buildManifest(records, result.css), css: result.css, records }
}

describe('the manifest', () => {
  const { manifest, css } = prismManifest()

  it('is versioned and carries the system: layers in order, conditions serialized', () => {
    expect(manifest.version).toBe(1)
    expect(manifest.layers).toEqual(['reset', 'tokens', 'recipes', 'utilities', 'overrides'])
    expect(manifest.conditions.open).toBe('&[data-state="open"]')
    expect(manifest.conditions.md).toBe('@media (min-width: 768px)')
    expect(manifest.conditions.hover).toBe('&:hover')
    // A two-arm condition serializes both circumstances.
    expect(manifest.conditions.dark).toContain('[data-scheme=\'dark\']')
    expect(manifest.conditions.dark).toContain('@media (prefers-color-scheme: dark)')
  })

  it('projects every token: var, per-scheme values, mode, liveness, description', () => {
    const brand = manifest.tokens['color.brand']

    expect(brand.var).toBe('--vane-color-brand')
    expect(brand.mode).toBe('live')
    expect(brand.live).toBe(true)
    expect(brand.value.light).toBe('oklch(0.58 0.2 285)')
    expect(brand.description).toBe('Primary brand hue. Marketing owns this.')

    // An elevation token folds per scheme; it is scheme-varied, not runtime data.
    const surface = manifest.tokens['color.surface']
    expect(surface.mode).toBe('scheme')
    expect(surface.live).toBe(false)
    expect(surface.value.light).not.toBe(surface.value.dark)

    // A derivation keeps its graph edges visible.
    expect(manifest.tokens['color.brandSoft'].refs).toEqual(['color.brand'])
    expect(manifest.tokens['color.onBrand'].refs).toEqual(['color.brand'])
  })

  it('counts usage from the emitted CSS, graph-internal edges excluded', () => {
    // brand: used by fill + button_intent_brand — its brandSoft/onBrand edges don't count.
    expect(manifest.tokens['color.brand'].usage).toBe(2)
    // canvas: defined, never referenced anywhere.
    expect(manifest.tokens['color.canvas'].usage).toBe(0)
    // ink: used once, by the body globalCss.
    expect(manifest.tokens['color.ink'].usage).toBe(1)
  })

  it('projects recipes: variant space, toggles, defaults, published ports', () => {
    expect(manifest.recipes.button).toMatchObject({
      variants: { intent: ['brand', 'ghost'], size: ['sm', 'md'] },
      toggles: ['pill'],
      defaults: { intent: 'brand', size: 'md' },
    })
    expect(manifest.recipes.button.ports.fraction).toMatch(/^--vane-fraction/)
  })

  it('projects ports under Component.export names, typed by their defaults', () => {
    expect(manifest.ports['prism.fraction']).toMatchObject({ type: 'number', default: 0 })
    expect(manifest.ports['prism.fraction'].var).toMatch(/^--vane-fraction/)
  })

  it('inventories every escape: css.raw, unsafe, foreign globalCss, overrides layer', () => {
    const forms = manifest.escapes.map(escape => escape.form)

    expect(forms).toContain('css.raw')
    expect(forms).toContain('unsafe')
    expect(forms).toContain('overrides')
    expect(forms.filter(form => form === 'globalCss')).toHaveLength(2)

    const unsafeEscape = manifest.escapes.find(escape => escape.form === 'unsafe')!
    expect(unsafeEscape.detail).toBe('gap: 37px')
    expect(unsafeEscape.reason).toBe('editorial measure')
  })

  it('carries the contrast results — the legibleOn pairing measured per scheme', () => {
    const onBrand = manifest.contrast.filter(entry => entry.pairing === 'color.onBrand')

    expect(onBrand.map(entry => entry.scheme).sort()).toEqual(['dark', 'light'])
    expect(onBrand.every(entry => entry.algorithm === 'apca' && entry.measured >= entry.min)).toBe(true)
    expect(onBrand.every(entry => !entry.accepted)).toBe(true)
  })

  it('the emitted CSS itself still carries every reference the counts claim', () => {
    expect(countVarRefs(css, '--vane-color-brand')).toBeGreaterThanOrEqual(2)
    expect(countVarRefs('var(--vane-a) var(--vane-a, 1px) var(--vane-a-b)', '--vane-a')).toBe(2)
  })
})

describe('the audit config', () => {
  it('rides the system record into the manifest', () => {
    const { records, result } = collectInspection(() => emit(() =>
      createSystem({ tokens: { space: { sm: '8px' } }, audit: { unusedTokens: 'error' } })))

    expect(buildManifest(records, result.css).audit).toEqual({ unusedTokens: 'error' })
  })
})
