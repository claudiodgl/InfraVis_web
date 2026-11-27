import { defineConfig } from 'vite';

// The story and site serve ../static as their public root (as the Amazon
// viewer serves ../tiles): logos, portraits, the baked map and the few 3D
// models, all produced by pipeline/*.
export default defineConfig({
  publicDir: '../static',
  base: './',
  server: { port: 5180, open: false },
  build: {
    target: 'es2022',
    outDir: 'dist',
    // three.js arrives in its own chunk, fetched only when a 3D scene is near
    chunkSizeWarningLimit: 800,
  },
});
