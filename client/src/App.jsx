import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import Navbar               from './components/layout/Navbar';
import SiteFooter           from './components/layout/SiteFooter';
import RouteLoadingFallback from './components/common/RouteLoadingFallback';
import HomePage             from './pages/HomePage';
import NotFound             from './pages/NotFound';
import { NAV_H }            from './lib/layout';
import { applyRouteMeta }   from './lib/seo';
import { scrollBehavior }   from './lib/scroll';

// Code-split by route: only the home page ships in the entry bundle. Each
// chunk below downloads when its route is first visited.
//
// /demo: the gated analysis dashboard and its sign-in gate (API client,
// recharts, dashboard pages). The gate is lazy too; nothing else uses it.
const DemoAuthGate        = lazy(() => import('./features/liquidbiopsy/auth/DemoAuthGate'));
const LiquidBiopsyDemo    = lazy(() => import('./features/liquidbiopsy'));
// Public booking forms (pull in @emailjs/browser).
const MammogramBooking    = lazy(() => import('./pages/Booking/MammogramBooking'));
const LiquidBiopsyBooking = lazy(() => import('./pages/Booking/LiquidBiopsyBooking'));
// Blog: separate content area, irrelevant to a first-time product visitor.
const Blog     = lazy(() => import('./pages/Blog/Blog'));
const BlogPost = lazy(() => import('./pages/Blog/BlogPost'));

function pageFromPath(pathname) {
  if (pathname === '/')              return 'home';
  if (pathname === '/Book-LB')       return 'lb';
  if (pathname === '/demo')          return 'demo';
  if (pathname === '/mammo-demo')    return 'mammo';
  if (pathname === '/blog' || pathname.startsWith('/blog/')) return 'blog';
  // Unknown path: the Navbar shows its "Back to Home" variant instead of
  // home-section links that would have nothing to scroll to.
  return 'notfound';
}

const ROUTE_FOR = { demo: '/demo', lb: '/Book-LB', mammo: '/mammo-demo', blog: '/blog', home: '/' };

/* React Router matches paths case-insensitively and ignores a trailing slash,
   so /demo/, /book-lb or /Blog render the real page, while pageFromPath and
   applyRouteMeta (exact matches) treat them as unknown: "Page not found"
   meta, noindex, and the site navbar drawn over the /demo dashboard. Such
   variants are redirected to the one canonical spelling instead. A blog slug
   keeps its case (slugs are matched exactly); only the /blog prefix is fixed. */
const CANONICAL_PATHS = ['/Book-LB', '/demo', '/mammo-demo', '/blog'];

function canonicalPath(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const lower = path.toLowerCase();
  if (lower.startsWith('/blog/')) return '/blog' + path.slice('/blog'.length);
  return CANONICAL_PATHS.find((p) => p.toLowerCase() === lower) ?? path;
}

/* Everything below the router. Exported separately so the prerender entry
   (entry-server.jsx) can mount it under a StaticRouter while the browser
   mounts it under BrowserRouter (default export below). */
export function AppRoutes() {
  const { pathname, search, hash } = useLocation();
  const canonical = canonicalPath(pathname);

  // Redirect before anything else renders, so the navbar variant and the
  // route meta only ever see the canonical path.
  if (canonical !== pathname) {
    return <Navigate replace to={{ pathname: canonical, search, hash }} />;
  }
  return <SiteRoutes />;
}

function SiteRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = pageFromPath(location.pathname);

  // Title, description, canonical and robots for the current route.
  useEffect(() => {
    applyRouteMeta(location.pathname);
  }, [location.pathname]);

  const handleNavigate = (to) => {
    if (ROUTE_FOR[to]) {
      navigate(ROUTE_FOR[to]);
      // A new page starts at the top: no animated scroll through it.
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    // Otherwise `to` is a home-page section id.
    if (location.pathname !== '/') {
      navigate(`/?section=${to}`);
    } else {
      requestAnimationFrame(() => {
        document.getElementById(to)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      });
    }
  };

  // The liquid biopsy DASHBOARD (/demo) is a full-screen app with its own fixed
  // sidebar/header and a working "back to site" button (onBack). Keeping the
  // global Navbar mounted there put a z-index:10001 element on top of the
  // dashboard's sidebar, silently intercepting clicks on it. The booking forms
  // are ordinary pages and keep the Navbar and footer.
  const isFullScreenApp = currentPage === 'demo';

  return (
    <div className="ot-site">
      {!isFullScreenApp && <Navbar currentPage={currentPage} onNavigate={handleNavigate} />}

      {/* One boundary for every lazy route (and the footer below them).
          HomePage is a static import, so "/" never shows this fallback. */}
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />

          <Route
            path="/demo"
            element={
              <DemoAuthGate onRequestAccess={() => handleNavigate('lb')}>
                <LiquidBiopsyDemo onBack={() => handleNavigate('home')} />
              </DemoAuthGate>
            }
          />

          <Route
            path="/Book-LB"
            element={
              <div style={{ paddingTop: NAV_H }}>
                <LiquidBiopsyBooking onBack={() => handleNavigate('home')} />
              </div>
            }
          />

          {/* Public booking form, deliberately not behind DemoAuthGate: it exists
              to capture leads from people who don't have access yet. */}
          <Route
            path="/mammo-demo"
            element={
              <div style={{ paddingTop: NAV_H }}>
                <MammogramBooking onBack={() => handleNavigate('home')} />
              </div>
            }
          />

          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          <Route path="*" element={<NotFound onNavigate={handleNavigate} />} />
        </Routes>

        {/* Inside the boundary so it appears together with the page: outside,
            it painted right under the loading placeholder of a lazy route and
            was pushed down when the page arrived (layout shift). */}
        {!isFullScreenApp && <SiteFooter onNavigate={handleNavigate} />}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
