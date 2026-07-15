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
        "root": ":root",
        "runtime": {
          "protocol": 1,
          "root": ":root",
          "system": "vane-runtime-1-18v3i6a",
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
            "declarations": [
              {
                "context": {
                  "atRules": [],
                  "root": ":root",
                  "selectors": [],
                },
                "kind": "base",
                "val": "oklch(0.58 0.2 285)",
              },
            ],
            "dependencies": [],
            "description": "the seed",
            "emit": true,
            "expression": {
              "detail": {
                "c": 0.2,
                "h": 285,
                "l": 0.58,
                "operation": "oklch",
              },
              "kind": "color",
              "type": "color",
            },
            "file": "src/test-support/prism.style.ts",
            "fold": {
              "reason": "browser-reactive color semantics",
              "status": "preserved",
            },
            "hasDefault": true,
            "inference": {
              "emit": "engine-default",
              "reasons": [
                "legacy-policy",
              ],
              "reference": "engine-default",
            },
            "mutable": true,
            "name": "--vane-color-brand",
            "path": [
              "color",
              "brand",
            ],
            "portability": {
              "status": "portable",
            },
            "preview": {
              "status": "resolved",
              "val": "oklch(0.58 0.2 285)",
            },
            "reference": "var",
            "support": {
              "requirements": [
                "color-level-4",
              ],
            },
            "type": "color",
            "usage": 1,
          },
          "color.brandSoft": {
            "declarations": [
              {
                "context": {
                  "atRules": [],
                  "root": ":root",
                  "selectors": [],
                },
                "kind": "base",
                "val": "oklch(from var(--vane-color-brand) l c h / 0.12)",
              },
            ],
            "dependencies": [
              {
                "kind": "token",
                "name": "--vane-color-brand",
                "path": "color.brand",
                "resolution": "system",
                "type": "color",
              },
            ],
            "emit": true,
            "expression": {
              "children": [
                {
                  "detail": {
                    "operation": "ref",
                    "path": "color.brand",
                  },
                  "kind": "color",
                  "type": "color",
                },
              ],
              "detail": {
                "amount": 0.12,
                "operation": "alpha",
              },
              "kind": "color",
              "type": "color",
            },
            "file": "src/test-support/prism.style.ts",
            "fold": {
              "reason": "browser-reactive color semantics",
              "status": "preserved",
            },
            "hasDefault": true,
            "inference": {
              "emit": "engine-default",
              "reasons": [
                "legacy-policy",
              ],
              "reference": "engine-default",
            },
            "mutable": false,
            "name": "--vane-color-brand-soft",
            "path": [
              "color",
              "brandSoft",
            ],
            "portability": {
              "status": "portable",
            },
            "preview": {
              "status": "resolved",
              "val": "oklch(0.58 0.2 285 / 0.12)",
            },
            "reference": "var",
            "support": {
              "requirements": [
                "color-level-4",
                "relative-color",
              ],
            },
            "type": "color",
            "usage": 1,
          },
          "space.sm": {
            "declarations": [
              {
                "context": {
                  "atRules": [],
                  "root": ":root",
                  "selectors": [],
                },
                "kind": "base",
                "val": "8px",
              },
            ],
            "dependencies": [],
            "emit": true,
            "expression": {
              "detail": {
                "val": "8px",
              },
              "kind": "literal",
              "type": "unknown",
            },
            "file": "src/test-support/prism.style.ts",
            "fold": {
              "status": "folded",
              "val": "8px",
            },
            "hasDefault": true,
            "inference": {
              "emit": "engine-default",
              "reasons": [
                "legacy-policy",
              ],
              "reference": "engine-default",
            },
            "mutable": false,
            "name": "--vane-space-sm",
            "path": [
              "space",
              "sm",
            ],
            "portability": {
              "status": "portable",
            },
            "preview": {
              "status": "resolved",
              "val": "8px",
            },
            "reference": "var",
            "support": {
              "requirements": [],
            },
            "type": "unknown",
            "usage": 1,
          },
        },
        "version": 2,
      }
    `)
  })
})
