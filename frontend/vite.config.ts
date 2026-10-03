import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function getBackendPort(): string {
  let backendPort = process.env.BACKEND_PORT || '8787';
  try {
    const portFilePath = path.resolve(__dirname, '../backend/.port');
    if (fs.existsSync(portFilePath)) {
      const savedPort = fs.readFileSync(portFilePath, 'utf8').trim();
      if (savedPort && /^\d+$/.test(savedPort)) {
        backendPort = savedPort;
      }
    }
  } catch (_) {}
  return backendPort;
}

export default defineConfig(() => {
  const initialPort = getBackendPort();

  return {
    plugins: [react()],
    server: {
      port: Number(process.env.PORT) || 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${initialPort}`,
          changeOrigin: true,
          router: () => {
            const currentPort = getBackendPort();
            return `http://127.0.0.1:${currentPort}`;
          },
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.warn(`[Vite Proxy Error] ${req.method} ${req.url} -> ${err.message}`);
              if (!res.headersSent && typeof (res as any).writeHead === 'function') {
                const currentPort = getBackendPort();
                (res as any).writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
                (res as any).end(
                  JSON.stringify({
                    code: 50002,
                    message: `后端服务未响应，请检查后端服务是否在端口 ${currentPort} 正常运行`,
                    data: {},
                    timestamp: new Date().toISOString(),
                  })
                );
              }
            });
          },
        },
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

