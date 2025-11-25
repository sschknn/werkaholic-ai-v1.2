import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // DEBUG: Log für Vite-Konfiguration
    console.log(`[DEBUG] Vite Config - Mode: ${mode}`);
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // MIME-Type Einstellungen
      mimeTypes: {
        'js': 'application/javascript',
        'mjs': 'application/javascript',
        'jsx': 'application/javascript',
        'ts': 'application/typescript',
        'tsx': 'application/typescript'
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Mobile-Optimierungen
      build: {
        target: 'esnext',
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: mode === 'production', // Entferne Console Logs in Production
            drop_debugger: mode === 'production'
          }
        },
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              lucide: ['lucide-react'],
              utils: ['jspdf', 'jszip', 'file-saver'],
              ai: ['@google/genai']
            }
          }
        },
        // Production optimiert für Netlify
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: mode !== 'production',
        // Asset handling
        assetsInlineLimit: 4096,
        // CSS code splitting
        cssCodeSplit: true
      }
    };
});
