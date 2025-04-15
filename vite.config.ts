// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0', // Keep listening on local network
    // --- Add HMR configuration ---
    hmr: {
      // Use 'wss' (secure) because you access via https://axiom.trazen.org
      protocol: 'wss',
      // The host the browser should connect to for HMR
      host: 'axiom.trazen.org',
      // Explicitly set client port if needed (usually defaults to server port or 443 for wss)
      // clientPort: 443
    }
    // --- End HMR configuration ---
  }
})
