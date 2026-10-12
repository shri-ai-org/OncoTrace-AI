import { StrictMode } from 'react'
import { LazyMotion, MotionConfig } from 'motion/react'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'

// Motion's animation features (~15 KB gz) load after the page is
// interactive; until then `m` components render as plain elements.
const loadMotionFeatures = () => import('./lib/motionFeatures.js').then((mod) => mod.default)

const crashFallback = (
  <div className="ot-site flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
    <h1 className="ot-h3">Something went wrong</h1>
    <p className="ot-small max-w-md">
      Please refresh the page. If the problem continues, try again in a few minutes.
    </p>
    <button type="button" className="ot-btn ot-btn-primary" onClick={() => window.location.reload()}>
      Reload
    </button>
  </div>
)

/* The provider tree shared by the browser entry (main.jsx) and the
   prerender entry (entry-server.jsx). Both must render the exact same tree
   above the router, or hydration ids (useId) would not line up. */
export default function Root({ children }) {
  return (
    <StrictMode>
      <ErrorBoundary fallback={crashFallback}>
        <LazyMotion features={loadMotionFeatures} strict>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
      </ErrorBoundary>
    </StrictMode>
  )
}
