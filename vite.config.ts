import { readFileSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function apiOrigin() {
  try {
    const match = readFileSync('.env', 'utf8').match(/^PORT="?(\d+)"?/m);
    return `http://localhost:${match?.[1] || '3000'}`;
  } catch {
    return 'http://localhost:3000';
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiOrigin(),
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
