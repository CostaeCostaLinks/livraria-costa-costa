import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          if (id.includes('/@supabase/')) {
            return 'vendor-supabase';
          }

          if (id.includes('/@tanstack/react-query/')) {
            return 'vendor-query';
          }

          if (id.includes('/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  server: {
    host: true,
  }
});