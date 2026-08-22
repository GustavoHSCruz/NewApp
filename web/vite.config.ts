import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Front e API são processos separados. Portas fixas acordadas no CONTRATO-API.md.
export default defineConfig({
  plugins: [react()],
  server: { port: 5177, strictPort: true, host: '127.0.0.1' },
  preview: { port: 5177, strictPort: true, host: '127.0.0.1' },
  build: { outDir: 'dist', sourcemap: false },
})
