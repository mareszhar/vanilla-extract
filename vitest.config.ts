import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';

const testExclude = [
  ...configDefaults.exclude,
  '.pnpm-store/**',
  'packages/dux/**',
];

export default defineConfig(async () => {
  const plugins: PluginOption[] = [];

  try {
    const { vanillaExtractPlugin } = await (
      new Function('specifier', 'return import(specifier)') as (
        specifier: string,
      ) => Promise<typeof import('@vanilla-extract/vite-plugin')>
    )('@vanilla-extract/vite-plugin');

    plugins.push(
      vanillaExtractPlugin({
        unstable_mode: 'transform',
      }),
    );
  } catch (error) {
    if (!isRunMode()) {
      return {
        resolve: {
          alias: sourceAliases,
        },
        plugins,
        test: {
          exclude: testExclude,
        },
      };
    }

    console.warn(
      [
        '[vitest.config] Skipping @vanilla-extract/vite-plugin because its workspace build output is unavailable.',
        'Run `pnpm dev` or `pnpm build` from the repository root before running the full root Vitest suite.',
        error instanceof Error ? error.message : String(error),
      ].join('\n'),
    );
  }

  return {
    resolve: {
      alias: sourceAliases,
    },
    plugins,
    test: {
      exclude: testExclude,
    },
  };
});

function local(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

function isRunMode() {
  return process.argv.includes('run') || process.argv.includes('--run');
}

const sourceAliases = {
  '@vanilla-extract/babel-plugin-debug-ids': local(
    './packages/babel-plugin-debug-ids/src/index.ts',
  ),
  '@vanilla-extract/compiler': local('./packages/compiler/src/index.ts'),
  '@vanilla-extract/css/adapter': local('./packages/css/src/adapter.ts'),
  '@vanilla-extract/css/fileScope': local('./packages/css/src/fileScope.ts'),
  '@vanilla-extract/css/functionSerializer': local(
    './packages/css/src/functionSerializer.ts',
  ),
  '@vanilla-extract/css/recipe': local('./packages/css/src/recipe.ts'),
  '@vanilla-extract/css/transformCss': local(
    './packages/css/src/transformCss.ts',
  ),
  '@vanilla-extract/css': local('./packages/css/src/index.ts'),
  '@vanilla-extract/css-utils': local('./packages/utils/src/index.ts'),
  '@vanilla-extract/dynamic': local('./packages/dynamic/src/index.ts'),
  '@vanilla-extract/integration': local('./packages/integration/src/index.ts'),
  '@vanilla-extract/private': local('./packages/private/src/index.ts'),
  '@vanilla-extract/recipes/createRuntimeFn': local(
    './packages/recipes/src/createRuntimeFn.ts',
  ),
  '@vanilla-extract/recipes': local('./packages/recipes/src/index.ts'),
  '@vanilla-extract/sprinkles/createRuntimeSprinkles': local(
    './packages/sprinkles/src/createRuntimeSprinkles.ts',
  ),
  '@vanilla-extract/sprinkles/createUtils': local(
    './packages/sprinkles/src/createUtils.ts',
  ),
  '@vanilla-extract/sprinkles': local('./packages/sprinkles/src/index.ts'),
  '@vanilla-extract/vite-plugin': local('./packages/vite-plugin/src/index.ts'),
};
