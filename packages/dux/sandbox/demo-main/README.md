# Prism interaction lab

The flagship Nuxt demo for `@mszr/vanity`. It is a functional test bench, not a component gallery: every visible control changes state, and every section exercises a distinct library contract.

## Run

From `packages/dux/`:

```sh
pnpm run demo:main
```

Nuxt serves the app at `http://localhost:3000` by default.

## What it proves

- Initial SSR HTML links every generated stylesheet successfully—no missing `.vanity.css` requests or unstyled first paint.
- The brand picker writes one live token; hover colors, surfaces, borders, and inks re-derive through CSS.
- The scheme control persists through the Nuxt module’s cookie recipe, so SSR and hydration agree.
- Button variants resolve to precompiled recipe classes.
- Progress crosses the runtime boundary through one typed port.
- The resizable card exercises a named container condition.
- Tabs and dialog exercise headless states, anatomy, and reduced-motion-aware animation.
- The compact action row themes nested buttons through a published port without selectors or `!important`.

## Files

- `app/design/palette.tokens.ts` — independently buildable brand/elevation graph; every relationship names `color.brand` explicitly.
- `app/design/foundations.tokens.ts` — independently buildable spacing, type, radius, and motion graph.
- `app/design/tokens.style.ts` — composes both modules and owns the final prefix/emission.
- `app/design/system.style.ts` — conditions and authoring functions bound once.
- `app/components/*.style.ts` — recipes, anatomy, ports, and container-query examples.
- `app/app.style.ts` — the demo shell, authored through vanity itself.
