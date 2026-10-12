import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The first-screen font: Plus Jakarta Sans (the site typeface, upright).
// Its filename is content-hashed at build time, so it can't be hand-written
// into index.html; this injects <link rel="preload"> for the final name so it
// downloads in parallel with the CSS instead of after it.
const CRITICAL_FONTS = [/plus-jakarta-sans-latin-wght-normal-[\w-]+\.woff2$/]

function preloadCriticalFonts() {
  return {
    name: 'preload-critical-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        return Object.keys(ctx.bundle ?? {})
          .filter((file) => CRITICAL_FONTS.some((re) => re.test(file)))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head',
          }))
      },
    },
  }
}

// `vite preview` behaves like production nginx: "/" gets the prerendered
// index.html, every other page route gets the empty SPA shell (app.html).
function spaShellPreview() {
  return {
    name: 'spa-shell-preview',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url || '/').split('?')[0]
        const wantsHtml = (req.headers.accept || '').includes('text/html')
        if (req.method === 'GET' && wantsHtml && path !== '/' && !path.includes('.')) {
          req.url = '/app.html'
        }
        next()
      })
    },
  }
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss(), preloadCriticalFonts(), spaShellPreview()],

  // The prerender bundle (scripts/prerender.mjs) runs in plain Node ESM.
  // These are bundled into it instead of imported at runtime: react-router-dom
  // has no "exports" map (Node rejects its extensionless subpath imports), and
  // bundling lets the icon and motion packages tree-shake.
  ssr: {
    noExternal: [
      'react-router-dom', 'react-router', '@remix-run/router',
      'motion', 'framer-motion', 'motion-dom', 'motion-utils',
      '@tabler/icons-react',
    ],
  },

  build: isSsrBuild
    ? {
        outDir: 'dist-ssr',
        emptyOutDir: true,
        copyPublicDir: false,
        minify: false,
        target: 'node20',
      }
    : {
        // Every browser that can run React 19 supports ES2020; skipping older
        // syntax transforms keeps the bundle smaller.
        target: 'es2020',
        rollupOptions: {
          output: {
            // React + router change only on a dependency upgrade, so they get
            // their own long-cached chunk; a normal deploy then invalidates app
            // code only. three.js and recharts are already isolated in lazy
            // chunks by the dynamic imports in App.jsx / HomePage.jsx.
            manualChunks(id) {
              if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[\\/]router)[\\/]/.test(id)) {
                return 'vendor-react'
              }
            },
          },
        },
        // The lazy three.js chunk (3D DNA section) is inherently ~900KB minified
        // (~250KB gzip) and loads only on approach; don't warn about it.
        chunkSizeWarningLimit: 1000,
      },

  server: {
    // Forwards API calls to the local FastAPI backend (uvicorn on :8000).
    // Unused while VITE_LB_USE_MOCK_API=true.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}))
