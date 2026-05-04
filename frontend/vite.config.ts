import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Group large vendor chunks. Plotly is intentionally omitted: it was
        // unused in the codebase, so listing it here generated an empty chunk
        // and pulled its CSS into the build. Add it back via React.lazy when
        // a heatmap/Plot component is actually used.
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          recharts: ['recharts'],
          pdf: ['html2pdf.js'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
});
