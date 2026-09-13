import { defineConfig } from 'vite'
// transformWithOxc is used by the 'transform-js-as-jsx' plugin below
// to transpile .js files that contain JSX syntax (e.g. legacy files not renamed to .jsx)
import { transformWithOxc } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  envDir: './secret',
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
