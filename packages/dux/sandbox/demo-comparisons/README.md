# Prism controlled comparison

Button, Card, and Progress implemented five ways on one page: Vue SFC scoped CSS, Tailwind, Panda, raw vanilla-extract, and vane-dux. Every lane receives the same state and content from `@prism/domain`, so the comparison is about authoring models—not accidental visual drift.

## Run

From `packages/dux/`:

```sh
pnpm run demo:comparisons
```

Vite serves the app at `http://localhost:5173` by default. This demo uses Vite while `demo-main` uses Nuxt intentionally: the matrix isolates framework-independent compilation; the flagship verifies Nuxt SSR and module integration.

## Test it

- Change intent, size, and pill: every lane resolves the same finite variant choice.
- Move progress: SFC uses `v-bind()`, Tailwind and Panda use inline style, vanilla-extract uses `createVar` plumbing, and vane-dux uses a typed port.
- Click every Refract and card action button: the shared status and per-lane count confirm that each demo control is functional.
- Change scheme: all lanes follow the same platform `color-scheme` axis.
- Change brand: only the vane-dux lane changes by design. Its live brand input re-derives hover, surface, border, and ink values in CSS; the other lanes compiled their palettes.
- Inspect `index.html`: cascade-layer order is declared before any stylesheet because five styling systems share the page.

## Study map

- `src/lanes/sfc` — variables and variants maintained in SFC styles.
- `src/lanes/tailwind` — theme variables and utility maps.
- `panda.config.ts`, `src/lanes/panda` — config/codegen and generated `css()` calls.
- `src/lanes/extract` — vanilla-extract tokens, recipes, and dynamic variables.
- `src/lanes/vane` — a typed graph, recipe, and port. The elevation helper names `color.brand` explicitly instead of reading hidden global color controls.
- `src/shell.css` — comparison chrome only; no lane depends on it for component styling.
