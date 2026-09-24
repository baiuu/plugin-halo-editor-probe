import { fileURLToPath, URL } from 'node:url'

import { viteConfig } from '@halo-dev/ui-plugin-bundler-kit/vite'
import Icons from 'unplugin-icons/vite'

// For more info,
// please see https://github.com/halo-dev/halo/tree/main/ui/packages/ui-plugin-bundler-kit
export default viteConfig({
  // Docsme 通过 window[插件名] 收集编辑器扩展,仅兼容 IIFE 产物,不能使用 ESM
  format: 'iife',
  vite: {
    plugins: [Icons({ compiler: 'vue3' })],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
})
