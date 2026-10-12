/* Route-level document metadata for the SPA.

   index.html carries the home page's static tags (what non-JS crawlers and
   link-preview scrapers see). On client-side navigation nothing resets them,
   so without this a visitor returning from a blog post kept that post's title,
   and a single hardcoded canonical would tell search engines every route is a
   duplicate of the home page. */

// Canonical origin. Hardcoded rather than window.location.origin so the site
// still canonicalizes to the real domain when reached via IP or a staging host.
export const SITE_URL = "https://www.oncotrace-ai.org";

const DEFAULT_TITLE = "OncoTrace-AI — Liquid Biopsy Intelligence";
const DEFAULT_DESCRIPTION =
  "Open-source, AI-powered mammogram and liquid biopsy analysis, with lung cancer CT imaging in development. Powered by Senus Healthcare Research Institute, USA.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

const ROUTE_META = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    // Same share text as the static tags in index.html.
    ogTitle: "OncoTrace-AI — Real-time Precision Monitoring of Oncology",
    ogDescription: "Open-source, AI-powered mammogram and liquid biopsy analysis, with lung cancer CT imaging in development. From a routine blood draw to an evidence-linked clinical report.",
  },
  "/Book-LB": {
    title: "Book a Liquid Biopsy Demo | OncoTrace-AI",
    description: "Request a guided demo of OncoTrace-AI's AI-powered liquid biopsy analysis for your clinic, lab or research team.",
  },
  "/mammo-demo": {
    title: "Book a Mammogram AI Demo | OncoTrace-AI",
    description: "Request a guided demo of OncoTrace-AI's mammogram risk analysis for your clinic, lab or research team.",
  },
  "/demo": {
    title: "Liquid Biopsy Demo | OncoTrace-AI",
    description: DEFAULT_DESCRIPTION,
    noindex: true, // credential-gated; nothing useful for a search result
  },
};

const isBlogRoute = (path) => path === "/blog" || path.startsWith("/blog/");

function upsert(selector, create, attr, value) {
  let el = document.head.querySelector(selector);
  if (value == null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setMeta(key, name, value) {
  upsert(`meta[${key}="${name}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute(key, name);
    return m;
  }, "content", value);
}

function setLink(rel, href) {
  upsert(`link[rel="${rel}"]`, () => {
    const l = document.createElement("link");
    l.setAttribute("rel", rel);
    return l;
  }, "href", href);
}

export function applyRouteMeta(pathname) {
  const url = SITE_URL + pathname;
  const known = ROUTE_META[pathname];
  const notFound = !known && !isBlogRoute(pathname);

  // Canonical/og:url never include query strings (?section=... is UI state).
  setLink("canonical", notFound ? null : url);
  setMeta("property", "og:url", url);
  // nginx answers unknown paths with index.html (200) so client routing works;
  // mark them noindex so they can't be indexed as soft-404 duplicates.
  setMeta("name", "robots", notFound || known?.noindex ? "noindex" : null);

  // Blog pages set their own title, description and social tags.
  if (isBlogRoute(pathname)) return;

  const meta = known ?? { title: "Page not found | OncoTrace-AI", description: DEFAULT_DESCRIPTION };
  document.title = meta.title;
  setMeta("name", "description", meta.description);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:title", meta.ogTitle ?? meta.title);
  setMeta("property", "og:description", meta.ogDescription ?? meta.description);
  setMeta("property", "og:image", DEFAULT_IMAGE);
  setMeta("name", "twitter:title", meta.ogTitle ?? meta.title);
  setMeta("name", "twitter:description", meta.ogDescription ?? meta.description);
  setMeta("name", "twitter:image", DEFAULT_IMAGE);
}

/* Social preview tags for pages that manage their own metadata (blog). The
   blog index calls this so a post's og:* values don't linger after navigating
   back to it. */
export function setSocialMeta({ title, description, type = "website", image = DEFAULT_IMAGE }) {
  setMeta("property", "og:type", type);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:image", image);
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", image);
}
