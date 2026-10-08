/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// `base: './'` hace que el build funcione en cualquier carpeta
// (GitHub Pages, un servidor interno, o abriendo el preview local).
// `--mode preview-web` arma una versión sin service worker, para visores que no los permiten.
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version.replace(/\.0$/, '')),
  },
  plugins: [
    react(),
    mode !== 'preview-web' &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Mis tareas',
          short_name: 'Mis tareas',
          description:
            'Tareas rápidas, proyectos con subtareas y un balde donde cada tarea terminada cae como una mojarrita.',
          lang: 'es',
          start_url: '.',
          scope: '.',
          display: 'standalone',
          background_color: '#dcf0f6',
          theme_color: '#8ecae6',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
  ],
  build: { chunkSizeWarningLimit: 700 },
  test: {
    environment: 'node',
  },
}));
