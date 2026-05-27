import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { visualizer } from "rollup-plugin-visualizer"

async function devPlugins(mode: string) {
  if (mode === 'production') {
    return [];
  }

  const { inspectAttr } = await import('kimi-plugin-inspect-react');
  return [inspectAttr()];
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => ({
  base: '/',
  plugins: [
    ...(await devPlugins(mode)),
    react(),
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  server: {
    port: 3000,
    proxy: {
      // Forward /api/* to the Express backend during local development
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
