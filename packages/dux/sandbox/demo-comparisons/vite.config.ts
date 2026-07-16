import { vaneDuxPlugin } from '@mszr/vane-dux/vite'
// Five styling stacks, one app: Tailwind rides its Vite plugin, Panda rides
// PostCSS (postcss.config.cjs), and vaneDuxPlugin serves both the vane-dux
// lane (*.style.ts) and the raw vanilla-extract lane (*.css.ts) — coexistence
// is the point ([dux-vision.md §7]).
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
          from: '@mszr/vane-dux/vue',
          imports: ['propsOf', 'usePorts'],
        },
      ],
      dts: './auto-imports.d.ts',
      vueTemplate: true,
    }),
    vue(),
    tailwindcss(),
    vaneDuxPlugin(),
  ],
})
