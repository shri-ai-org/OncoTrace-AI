// Build-time prerender entry (scripts/prerender.mjs). Renders the homepage
// with the same provider tree as main.jsx. renderToString is synchronous,
// emits no inline <script> (the CSP forbids them) and never waits for
// lazy() components: the sample report and 3D section stay client-only.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import Root from './Root.jsx'
import { AppRoutes } from './App.jsx'

export function render(url) {
  return renderToString(
    <Root>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </Root>,
  )
}
