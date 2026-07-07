import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    passWithNoTests: true,
    typecheck: {
      tsconfig: './tsconfig.json',
    },
  },
})
