import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    // TanStack Router code-gen — must come before react()
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // Chunk splitting for better caching and faster first-load interactions.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor';
          }

          if (id.includes('@tanstack/react-query') || id.includes('@tanstack/react-router')) {
            return 'tanstack-vendor';
          }

          if (id.includes('/recharts/')) {
            return 'chart-vendor';
          }

          const reactPdfPkg = id.match(/node_modules\/@react-pdf\/([^/]+)/)?.[1];
          if (reactPdfPkg) {
            return `react-pdf-${reactPdfPkg}`;
          }

          if (id.includes('/yoga-layout/')) {
            return 'react-pdf-yoga';
          }

          if (id.includes('/queue/')) {
            return 'react-pdf-queue';
          }

          if (
            id.includes('/pdfkit/') ||
            id.includes('/fontkit/') ||
            id.includes('/linebreak/') ||
            id.includes('/unicode-properties/') ||
            id.includes('/png-js/') ||
            id.includes('/brotli/') ||
            id.includes('/pako/')
          ) {
            return 'pdfkit-vendor';
          }

          return undefined;
        },
      },
    },
  },
});
