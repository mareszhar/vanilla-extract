import antfu from '@antfu/eslint-config'

const frameworkImports = ['vue', 'nuxt', '@nuxt/*']
const buildImports = ['vite', '@vanilla-extract/vite-plugin']
const substrateImports = ['@vanilla-extract/*']

export default antfu(
  {
    formatters: true,
    typescript: true,
    vue: true,
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/.turbo/**',
      '**/.vanity/**',
      '**/__references__/**',
    ],
  },
  {
    files: ['**/*.vue'],
    rules: {
      // Disable unused-imports linting for Vue files due to Pug template usage detection issues
      'unused-imports/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'off',

      'vue/block-order': ['error', {
        order: ['template[lang="pug"]', 'script[setup][lang="ts"]', 'style'],
      }],
      'vue/define-macros-order': 'off',
      'vue/singleline-html-element-content-newline': 'off',
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
      'vue/padding-line-between-blocks': 'off',
      'vue/singleline-html-element-content-newline': 'off',
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
    files: ['sandbox/demo-comparisons/**/*.vue'],
    rules: {
      'ts/no-use-before-define': 'off',
    },
  },
  {
    files: [
      'vanity/src/index.ts',
      'vanity/src/diagnostics.ts',
      'vanity/src/atoms/**',
      'vanity/src/tokens/**',
      'vanity/src/system/**',
      'vanity/src/css/**',
      'vanity/src/ports/**',
      'vanity/src/recipes/**',
      'vanity/src/internal/**',
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
    files: ['vanity/src/runtime.ts'],
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
    files: ['vanity/src/vite.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: frameworkImports,
      }],
    },
  },
  {
    files: ['vanity/src/vue.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['vite', '@nuxt/*', './vite', './nuxt'],
      }],
    },
  },
  {
    files: ['vanity/src/nuxt.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['vue', './vue'],
      }],
    },
  },
  {
    files: ['vanity/src/preset.ts', 'vanity/src/preset/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          './runtime',
          '../runtime',
          './vite',
          '../vite',
          './vue',
          '../vue',
          './nuxt',
          '../nuxt',
          './internal/**',
          '../internal/**',
          ...substrateImports,
        ],
      }],
    },
  },
)
