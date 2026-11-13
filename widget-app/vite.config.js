import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// The widget frame is served from the Next app's /public/widget/ folder and
// loaded inside an iframe by the loader script (/api/widget-embed/[widgetId]).
export default defineConfig({
  base: '/widget/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // Stop Vite from picking up the admin app's Tailwind v3 PostCSS config.
  css: { postcss: { plugins: [] } },
  build: {
    outDir: path.resolve(__dirname, '../public/widget'),
    emptyOutDir: true,
    assetsDir: 'assets',
    target: 'es2020',
    cssCodeSplit: false,
  },
  server: {
    port: 5180,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
