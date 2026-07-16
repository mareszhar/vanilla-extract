import { vanityPlugin } from '@mszr/vanity/vite'
// Five styling stacks, one app: Tailwind rides its Vite plugin, Panda rides
// PostCSS (postcss.config.cjs), and vanityPlugin serves both the vanity
// lane (*.style.ts) and the raw vanilla-extract lane (*.css.ts) — coexistence
// is the point ([vanity-vision.md §7]).
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    AutoImport({
      imports: [
        'vue',
        {
          from: '@mszr/vanity/vue',
          imports: ['propsOf', 'usePorts'],
        },
      ],
      dts: './auto-imports.d.ts',
      vueTemplate: true,
    }),
    vue(),
    tailwindcss(),
    vanityPlugin(),
  ],
})
