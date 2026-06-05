import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      // REST API
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // WebSocket voice — proxy to backend so Chrome doesn't block cross-origin WS
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
