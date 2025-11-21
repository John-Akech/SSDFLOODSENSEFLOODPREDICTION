import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const DEFAULT_API_URL = 'http://localhost:8000/api/v1';

const escapeForRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildApiRuntimePatterns = () => {
  const patterns: RegExp[] = [/\/api\/.*$/];
  const rawApiUrl = process.env.VITE_API_URL || DEFAULT_API_URL;

  try {
    const apiUrl = new URL(rawApiUrl);
    const normalizedBase = `${apiUrl.origin}${apiUrl.pathname.replace(/\/$/, '')}`;
    patterns.push(new RegExp(`^${escapeForRegex(normalizedBase)}`));
  } catch {
    // Ignore non-absolute URLs for runtime caching
  }

  return patterns;
};

const createApiCachingEntry = (pattern: RegExp) => ({
  urlPattern: pattern,
  handler: 'NetworkFirst' as const,
  options: {
    cacheName: 'api-cache',
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 60 * 60 * 24 // 24 hours
    },
    cacheableResponse: {
      statuses: [0, 200]
    }
  }
});

const apiRuntimeCaching = buildApiRuntimePatterns().map(createApiCachingEntry);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'images/**/*', 'offline.html'],
      manifest: {
        name: 'FloodSense - AI Flood Prediction for South Sudan',
        short_name: 'FloodSense',
        description: 'Award-winning AI-powered flood prediction and early warning system',
        theme_color: '#0891b2',
        background_color: '#f0f9ff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/images/FloodSenseLogo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/FloodSenseLogo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
        runtimeCaching: [
          ...apiRuntimeCaching,
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'animation-vendor': ['framer-motion']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
});
