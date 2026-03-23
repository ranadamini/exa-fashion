import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config()

const ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/synthesize': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: () => '/v1/messages',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.setHeader('x-api-key', ANTHROPIC_KEY);
            proxyReq.setHeader('anthropic-version', '2023-06-01');
          });
        },
      },
    },
  },
})