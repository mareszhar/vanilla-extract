import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

function local(path: string) {
  return fileURLToPath(new URL(path, import.meta.url))
}

export default defineConfig({
  resolve: {
    alias: {
      // Tests import the package exactly the way userland does; the tsconfig
      // `paths` carry the same mapping for the type/editor-DX planes.
      '@test': local('./src/test-support/index.ts'),
      '@mszr/vanity/capabilities': local('./src/capabilities.ts'),
      '@mszr/vanity/runtime': local('./src/runtime.ts'),
      '@mszr/vanity/preset': local('./src/preset.ts'),
      '@mszr/vanity/vite': local('./src/vite.ts'),
      '@mszr/vanity/vue': local('./src/vue.ts'),
      '@mszr/vanity/nuxt': local('./src/nuxt.ts'),
      '@mszr/vanity': local('./src/index.ts'),
    },
  },
  test: {
    globals: true,
    // Selenita spins up a TypeScript language service for the editor-DX suites;
    // CI runners can exceed Vitest's default budgets.
    hookTimeout: 30_000,
    testTimeout: 30_000,
    // Runtime (*.test.ts), editor-DX (*.dx.test.ts), and output (*.out.test.ts)
    // planes all match this.
    include: ['src/**/*.test.ts'],
    typecheck: {
      // The type-shape plane, run via --typecheck (wired into the test scripts).
      // Vitest forces tsc --incremental into a shared cache under vitest/dist;
      // the shim delegates to tsc after stripping those cache flags.
      checker: local('../scripts/vitest-typecheck.cjs'),
      include: ['src/**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
  },
})
