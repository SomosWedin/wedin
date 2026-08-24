import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Vite resuelve un .svg a un string; next/image necesita el objeto con
// dimensiones que genera el import estático de Next.
function staticSvgImports() {
  return {
    name: 'static-svg-imports',
    enforce: 'pre' as const,
    load(id: string) {
      const file = id.split('?')[0]
      if (!file.endsWith('.svg')) return null
      const src = `/${file.split('/').pop()}`
      return `export default ${JSON.stringify({ src, width: 100, height: 100 })}`
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
