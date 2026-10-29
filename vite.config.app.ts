import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * HBuilderX / file:// build.
 *
 * 5+App loads `_www/index.html` from file://; Chromium refuses external module
 * scripts there, so this build inlines JS/CSS into index.html and bundles the
 * catalog JSON into the same script (no fetch at runtime). Images (flags,
 * guilloche) are still separate files and load fine from file://.
 */
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: { __BUNDLE_DATA__: 'true' },
  build: {
    outDir: 'dist-app',
    target: 'es2018',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
