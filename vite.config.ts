import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  ...(isSsrBuild && {
    build: {
      outDir: 'dist/server',
      ssr: true,
    },
  }),
}));
