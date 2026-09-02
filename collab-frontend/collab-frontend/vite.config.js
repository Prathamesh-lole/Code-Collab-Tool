import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Vite 8 / Rolldown requires manualChunks as a function
        manualChunks(id) {
          if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
            return 'vendor-monaco';
          }
          if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
            return 'vendor-socket';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('react-router-dom')) {
            return 'vendor-react';
          }
        },
      },
    },

    minify: true, // uses Oxc (Vite 8 default — faster than esbuild)
    sourcemap: false,
    target: 'es2020',
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'socket.io-client'],
  },
})
