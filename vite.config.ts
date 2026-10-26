import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: '.cache/vite',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001', '/arena/socket.io': { target: 'http://127.0.0.1:3001', ws: true } },
  },
  build: { outDir: 'dist/client', emptyOutDir: true },
});
