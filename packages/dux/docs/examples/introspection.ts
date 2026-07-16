import { createEngine, exportDesignTokens, importDesignTokens } from '@mszr/vanity'

const de = createEngine().axes(({ scheme }) => ({ scheme: scheme({ locality: 'root' }) }))
const tokens = de.defineTokens({
  color: {
    brand: de.token.color({
      val: de.oklch(0.58, 0.2, 285),
      axes: { scheme: { dark: de.oklch(0.72, 0.14, 285) } },
    }),
  },
})
const ds = de.createSystem({
  tokens,
  audit: { unusedTokens: 'warn', escapes: 'error' },
  prefix: 'introspection-doc',
})

void ds.explain(ds.t.color.brand)
const resolved = exportDesignTokens(ds, { mode: 'resolved', environment: { scheme: 'dark' } })
const authored = exportDesignTokens(ds, { mode: 'authored' })
void importDesignTokens(resolved, { engine: de })
void importDesignTokens(authored, { engine: de })
