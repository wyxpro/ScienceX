import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(() => {
  let backendPort = process.env.BACKEND_PORT || '8787';
  try {
    const portFilePath = path.resolve(__dirname, '../backend/.port');
    if (fs.existsSync(portFilePath)) {
      const savedPort = fs.readFileSync(portFilePath, 'utf8').trim();
      if (savedPort) backendPort = savedPort;
    }
  } catch (_) {}

  return {
    plugins: [react()],
    server: {
      port: Number(process.env.PORT) || 5173,
      strictPort: false,
      proxy: {
        '/api': { target: `http://localhost:${backendPort}`, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: process.env.NODE_ENV !== 'production',
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  };
});

