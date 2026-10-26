import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api requests are proxied to the Express API so the browser needs no CORS setup.
const proxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:4000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy,
    allowedHosts: ['artificial-burn-sensitive-philadelphia.trycloudflare.com','dedicated-elsewhere-matt-rug.trycloudflare.com'],
  },
  // "vite preview" serves the production build (service worker included) with the same proxy.
  preview: { port: 4173, host: true, proxy },
});
