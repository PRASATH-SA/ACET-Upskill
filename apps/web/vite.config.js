import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api requests are proxied to the Express API so the browser needs no CORS setup.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
