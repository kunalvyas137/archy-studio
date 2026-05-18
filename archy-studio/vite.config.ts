import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative paths so assets work when loaded from file:// in Electron
  // AND when served from the Express static server in production
  base: './',
  build: {
    // Warn at a slightly higher threshold; the bundle is large due to CodeMirror + ReactFlow
    chunkSizeWarningLimit: 1500,
  },
})
