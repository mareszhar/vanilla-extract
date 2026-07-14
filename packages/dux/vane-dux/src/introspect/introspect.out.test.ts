/**
 * The output plane for introspection: the manifest is a stable, versioned
 * artifact external tools build on ([dux-spec-introspection.md §2]) — locked
 * like the CSS it travels with. A shape change here is a format change.
 */

import { createSystem, defineTokens, oklch } from '@mszr/vane-dux'
import { emit } from '@test'
import { describe, expect, it } from 'vitest'
import { collectInspection } from '../internal/inspect'
import { buildManifest } from './manifest'

describe('the manifest artifact', () => {
  it('locks the format: version, layers, conditions, tokens, recipes, ports', () => {
    const { records, result } = collectInspection(() => emit(() => {
      const { t, css, recipe, port } = createSystem({
        tokens: defineTokens({
          color: {
            brand: oklch(0.58, 0.2, 285).live().describe('the seed'),
          },
          space: { sm: '8px' },
        }).derive(({ color }) => ({ color: { brandSoft: color.brand.alpha(0.12) } })),
        conditions: { open: '&[data-state="open"]' },
        baseConditions: false,
      })

      const tint = port(t.color.brand, { label: 'tint' })

      const button = recipe({
        base: { background: tint, padding: t.space.sm },
        variants: { intent: { brand: { color: 'white' }, ghost: {} } },
        toggles: { pill: { borderRadius: '999px' } },
        defaults: { intent: 'brand' },
        ports: { tint },
      }, 'button')

      return { button, chip: css({ background: t.color.brandSoft }, 'chip') }
    }))

    const manifest = buildManifest(records, result.css)
    const stable = JSON.parse(
      JSON.stringify(manifest).replaceAll(/__[\w-]+/g, '__hash'),
    )

    expect(stable).toMatchInlineSnapshot(`
      {
        "conditions": {
          "open": "&[data-state="open"]",
        },
        "contrast": [],
        "escapes": [],
        "layers": [
          "reset",
          "tokens",
          "recipes",
          "utilities",
          "overrides",
        ],
        "ports": {
          "prism.tint": {
            "default": "var(--vane-color-brand)",
            "file": "src/test-support/prism.style.ts",
            "type": "color",
            "var": "--vane-tint__hash",
          },
        },
        "recipes": {
          "button": {
            "defaults": {
              "intent": "brand",
            },
            "file": "src/test-support/prism.style.ts",
            "ports": {
              "tint": "--vane-tint__hash",
            },
            "toggles": [
              "pill",
            ],
            "variants": {
              "intent": [
                "brand",
                "ghost",
              ],
            },
          },
        },
        "styles": {
          "chip__hash": {
            "file": "src/test-support/prism.style.ts",
            "name": "chip",
            "tokens": [
              "color.brandSoft",
            ],
          },
        },
        "tokens": {
          "color.brand": {
            "css": "oklch(0.58 0.2 285)",
            "description": "the seed",
            "file": "src/test-support/prism.style.ts",
            "live": true,
            "mode": "live",
            "requirements": [
              "color-level-4",
            ],
            "usage": 1,
            "value": {
              "dark": "oklch(0.58 0.2 285)",
              "light": "oklch(0.58 0.2 285)",
            },
            "var": "--vane-color-brand",
          },
          "color.brandSoft": {
            "css": "oklch(from var(--vane-color-brand) l c h / 0.12)",
            "file": "src/test-support/prism.style.ts",
            "live": false,
            "mode": "derived",
            "refs": [
              "color.brand",
            ],
            "requirements": [
              "color-level-4",
              "relative-color",
            ],
            "usage": 1,
            "value": {
              "dark": "oklch(0.58 0.2 285 / 0.12)",
              "light": "oklch(0.58 0.2 285 / 0.12)",
            },
            "var": "--vane-color-brand-soft",
          },
          "space.sm": {
            "css": "8px",
            "file": "src/test-support/prism.style.ts",
            "live": false,
            "mode": "static",
            "usage": 1,
            "value": {
              "dark": "8px",
              "light": "8px",
            },
            "var": "--vane-space-sm",
          },
        },
        "version": 1,
      }
    `)
  })
})
