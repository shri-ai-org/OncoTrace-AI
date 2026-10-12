import { createRoot, hydrateRoot } from 'react-dom/client'
import './styles/fonts.css'
import './index.css'
import App from './App.jsx'
import Root from './Root.jsx'
import { markHydrating } from './lib/hydration.js'

// After a deploy, a tab opened before it still references the previous
// build's chunk filenames. If one of those lazy chunks is gone, reload once to
// pick up the new build instead of falling through to the crash screen. The
// timestamp guard stops a reload loop if the chunk is genuinely unreachable.
// It is kept in sessionStorage, or in window.name where storage throws
// (blocked site data, some privacy modes): like sessionStorage, window.name
// survives a reload of the same tab.
const CHUNK_RELOAD_KEY = 'oncotrace-chunk-reload'

function lastChunkReload() {
  let stored = 0
  try {
    stored = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
  } catch { /* storage blocked: window.name below */ }
  const [key, stamp] = window.name.split('=')
  return Math.max(stored, key === CHUNK_RELOAD_KEY ? Number(stamp) || 0 : 0)
}

function markChunkReload() {
  const now = String(Date.now())
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, now)
  } catch {
    window.name = `${CHUNK_RELOAD_KEY}=${now}`
  }
}

window.addEventListener('vite:preloadError', (event) => {
  if (Date.now() - lastChunkReload() < 10_000) return
  markChunkReload()
  event.preventDefault()
  window.location.reload()
})

const container = document.getElementById('root')
const app = (
  <Root>
    <App />
  </Root>
)

// Only "/" is prerendered (dist/index.html); every other route is served the
// empty shell (dist/app.html). The pathname check also covers the moment
// during a deploy when an old nginx config could still serve index.html for
// another path: that falls back to a normal client render instead of a
// mismatched hydration.
if (container.firstElementChild && window.location.pathname === '/') {
  markHydrating()
  hydrateRoot(container, app, {
    onRecoverableError: (error, info) => {
      console.error('[hydration]', error, info?.componentStack ?? '')
    },
  })
} else {
  container.replaceChildren()
  createRoot(container).render(app)
}
