// vite.config.js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// Importamos el plugin que acabamos de instalar
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    vue(),
    // Activamos los polyfills para que el navegador "entienda" librerías de Node
    nodePolyfills({
      protocolImports: true, 
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    // Parche para librerías antiguas que usan la variable 'global'
    global: 'globalThis',
  },
})