import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Mirrors next/image's static import shape so components that render an
// imported .svg can be asserted on by filename and intrinsic size.
function staticSvgImports() {
  return {
    name: 'static-svg-imports',
    enforce: 'pre' as const,
    load(id: string) {
      const file = id.split('?')[0]
      if (!file.endsWith('.svg')) return null
      const source = fs.readFileSync(file, 'utf8')
      const width = Number(source.match(/width="(\d+(?:\.\d+)?)"/)?.[1] ?? 0)
      const height = Number(source.match(/height="(\d+(?:\.\d+)?)"/)?.[1] ?? 0)
      const asset = {
        src: `/_next/static/media/${path.basename(file)}`,
        width,
        height,
        blurWidth: 0,
        blurHeight: 0,
      }
      return `export default ${JSON.stringify(asset)}`
    },
  }
}

export default defineConfig({
  plugins: [staticSvgImports(), react()],
  resolve: {
    alias: {
      // next-auth importa 'next/server' sin extensión y Vite no lo resuelve.
      'next/server': fileURLToPath(
        new URL('./node_modules/next/server.js', import.meta.url)
      ),
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    clearMocks: true,
    server: {
      // next-auth importa 'next/server' sin extensión; hay que procesarlo con
      // Vite para que el alias de arriba tenga efecto.
      deps: { inline: ['next-auth', '@auth/core'] },
    },
    setupFiles: ['./tests/setup/dom.ts'],
  },
})
