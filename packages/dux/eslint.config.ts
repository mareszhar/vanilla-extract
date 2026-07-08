import antfu from '@antfu/eslint-config'

const frameworkImports = ['vue', 'nuxt', '@nuxt/*']
const buildImports = ['vite', '@vanilla-extract/vite-plugin']
const substrateImports = ['@vanilla-extract/*']

export default antfu(
  {
    formatters: true,
    typescript: true,
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/.turbo/**',
      '**/.dux/**',
      '**/__references__/**',
      '**/notes/**',
    ],
  },
  {
    files: ['**/*.{json,jsonc,yml,yaml}'],
    rules: {
      'jsonc/sort-array-values': 'off',
      'jsonc/sort-keys': 'off',
      'pnpm/yaml-enforce-settings': 'off',
      'yaml/plain-scalar': 'off',
      'yaml/sort-keys': 'off',
    },
  },
  {
    files: ['**/*.md'],
    rules: {
      'format/prettier': 'off',
    },
  },
  {
    files: ['**/*.md/**'],
    rules: {
      'style/no-multi-spaces': 'off',
      'perfectionist/sort-imports': 'off',
      'import/order': 'off',
      'import/consistent-type-specifier-style': 'off',
      'object-shorthand': 'off',
      'antfu/no-top-level-await': 'off',
      'format/prettier': 'off',
      'unused-imports/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['scripts/**', 'sandbox/**'],
    rules: {
      'no-console': 'off',
      'node/prefer-global/process': 'off',
      'antfu/no-top-level-await': 'off',
    },
  },
  {
    files: [
      'vane-dux/src/index.ts',
      'vane-dux/src/diagnostics.ts',
      'vane-dux/src/tokens/**',
      'vane-dux/src/system/**',
      'vane-dux/src/css/**',
      'vane-dux/src/ports/**',
      'vane-dux/src/internal/**',
    ],
    ignores: ['**/*.test.ts', '**/*.test-d.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...frameworkImports,
          ...buildImports,
          './runtime',
          '../runtime',
          './vue',
          '../vue',
          './nuxt',
          '../nuxt',
        ],
      }],
    },
  },
  {
    files: ['vane-dux/src/runtime.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...frameworkImports,
          ...buildImports,
          ...substrateImports,
        ],
      }],
    },
  },
  {
    files: ['vane-dux/src/vite.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: frameworkImports,
      }],
    },
  },
  {
    files: ['vane-dux/src/vue.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['vite', '@nuxt/*', './vite', './nuxt'],
      }],
    },
  },
  {
    files: ['vane-dux/src/nuxt.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['vue', './vue'],
      }],
    },
  },
  {
    files: ['vane-dux/src/preset.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          './runtime',
          './vite',
          './vue',
          './nuxt',
          './internal/**',
          ...substrateImports,
        ],
      }],
    },
  },
)
