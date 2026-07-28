import { defineConfig } from 'vite'
import { transformWithOxc } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'transform-js-as-jsx',
      enforce: 'pre',
      async transform(code, id) {
        if (id.endsWith('.js') && code.includes('</')) {
          const result = await transformWithOxc(code, id, { lang: 'jsx' })
          return { code: result.code, map: result.map }
        }
      }
    },
    react(),
  ],
})
