// Prerenders the homepage into dist/index.html. Runs after the client build
// and the SSR build, before postbuild.mjs (which compresses the result).
//
//   dist/index.html  "/" with its full server-rendered markup (hydrated)
//   dist/app.html    the empty SPA shell, served by nginx for every other
//                    route (/blog, /Book-LB, /mammo-demo, /demo, 404s)
//
// Fails the build loudly instead of shipping a broken or partial page.

import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// Overridable for the development-mode hydration check:
//   node scripts/prerender.mjs --dist dist-dev --ssr dist-dev-ssr
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : fallback
}
const DIST = join(ROOT, arg('--dist', 'dist'))
const SSR = join(ROOT, arg('--ssr', 'dist-ssr'))
const SITE_URL = 'https://www.oncotrace-ai.org'

const fail = (msg) => {
  console.error(`\nprerender failed: ${msg}\n`)
  process.exit(1)
}

// React is external to the SSR bundle; pick its production build before it
// is first imported.
process.env.NODE_ENV ??= 'production'
const { render } = await import(pathToFileURL(join(SSR, 'entry-server.js')).href)

const template = await readFile(join(DIST, 'index.html'), 'utf8')
const MARK = '<div id="root"></div>'
if (template.split(MARK).length !== 2) fail('dist/index.html must contain exactly one empty <div id="root"></div> (already prerendered?)')

const first = render('/')
if (render('/') !== first) fail('two renders of "/" differ: something in render is non-deterministic (Date, Math.random, window...)')

// A Suspense boundary that fell back on the server means a component threw
// or suspended during the render: renderToString would otherwise silently
// prerender the "Loading..." fallback.
if (first.includes('<!--$!-->')) fail('a Suspense boundary fell back during prerender (render error or lazy component reached)')
if (/<script\b/i.test(first)) fail('rendered markup contains <script>: the CSP (script-src self) would block it')
if (!first.includes('id="home"')) fail('homepage markup missing (no id="home")')
if (first.includes('data-lb-theme')) fail('the client-only sample report leaked into the prerendered HTML')

// React 19 emits <link rel="preload"> tags for eager images ahead of the
// markup. Hoist them into <head>, skipping ones index.html already has.
const lead = first.match(/^(?:<link\b[^>]*>)+/)?.[0] ?? ''
const body = first.slice(lead.length)
const hrefOf = (tag) => tag.match(/\shref="([^"]+)"/)?.[1]
const existing = new Set([...template.matchAll(/<link\b[^>]*rel="preload"[^>]*>/g)].map((m) => hrefOf(m[0])))
const hoisted = [...lead.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((tag) => !existing.has(hrefOf(tag)))

const NOSCRIPT = /\s*<noscript>[\s\S]*?<\/noscript>/

// Shell for every other route: the template as-is, keeping <noscript>.
await writeFile(join(DIST, 'app.html'), template)

// Homepage: real markup, static canonical, no "needs JavaScript" notice
// (the content is right there). No whitespace may be added inside #root:
// React's hydration markers are comments that must line up exactly.
const indexHtml = template
  .replace(NOSCRIPT, '')
  .replace('</head>', () => `${hoisted.join('')}<link rel="canonical" href="${SITE_URL}/" />\n  </head>`)
  .replace(MARK, () => `<div id="root">${body}</div>`)
await writeFile(join(DIST, 'index.html'), indexHtml)

console.log(`prerendered "/" (${(body.length / 1024).toFixed(1)} KB markup${hoisted.length ? `, ${hoisted.length} preload hoisted` : ''}) + app.html shell`)
