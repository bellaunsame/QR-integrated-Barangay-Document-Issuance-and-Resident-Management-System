import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.JPG'],
  server: {
    port: 5173,
    host: true,
    https: false, // Enable HTTPS for secure local development (needed for QR scanning/camera)
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Security: Disable sourcemaps in production to hide source code
    rollupOptions: {
      output: {
        manualChunks: {
          // Splitting code into chunks for faster initial page loads
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'utils': ['qrcode.react', 'html5-qrcode', 'jspdf']
        }
      }
    }
  }
})