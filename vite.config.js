import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project site: https://<user>.github.io/falcon-launcher/
  base: '/falcon-launcher/',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
});
