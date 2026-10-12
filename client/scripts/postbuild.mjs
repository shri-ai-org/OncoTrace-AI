// Runs after `vite build` (see package.json "build"). Zero dependencies.
//
// 1. Generates dist/sitemap.xml from the public routes + every blog post slug,
//    so publishing a post in blogData.js updates the sitemap automatically.
// 2. Precompresses every compressible file in dist/ to .gz and .br. nginx
//    serves these directly (gzip_static / brotli_static), so production pays
//    zero CPU per request for compression, at maximum compression levels a live
//    server could never afford per request.

import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzip, brotliCompress, constants as zc } from 'node:zlib'
import { promisify } from 'node:util'

const gz = promisify(gzip)
const br = promisify(brotliCompress)

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SITE_URL = 'https://www.oncotrace-ai.org'

// ── 1. sitemap.xml ──────────────────────────────────────────────────────────
// /demo is deliberately absent: it is credential-gated (and disallowed in
// robots.txt).
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  { path: '/Book-LB', priority: '0.7', changefreq: 'monthly' },
  { path: '/mammo-demo', priority: '0.7', changefreq: 'monthly' },
]

async function writeSitemap() {
  const { blogPosts } = await import(pathToFileURL(join(ROOT, 'src/pages/Blog/blogData.js')).href)
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: today })),
    ...blogPosts.map((p) => ({
      path: `/blog/${p.slug}`,
      lastmod: p.date || today,
      priority: '0.6',
      changefreq: 'yearly',
    })),
  ]
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) =>
      `  <url><loc>${SITE_URL}${u.path}</loc><lastmod>${u.lastmod}</lastmod>` +
      `<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`),
    '</urlset>',
    '',
  ].join('\n')
  await writeFile(join(DIST, 'sitemap.xml'), xml)
  console.log(`sitemap.xml: ${urls.length} URLs`)
}

// ── 2. Precompression ───────────────────────────────────────────────────────
// Already-compressed formats (webp, png, jpg, woff2) are skipped: re-compressing
// them gains nothing. .glb (3D model) and .vcf (sample data) are not
// compressed formats and shrink substantially.
const COMPRESSIBLE = new Set([
  '.js', '.mjs', '.css', '.html', '.svg', '.json', '.xml', '.txt',
  '.webmanifest', '.ico', '.glb', '.vcf', '.map',
])
const MIN_BYTES = 1024
const MIN_SAVING = 0.1 // keep a variant only if it is at least 10% smaller

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(p)
    else yield p
  }
}

async function precompress() {
  let files = 0, raw = 0, gzTotal = 0, brTotal = 0
  for await (const file of walk(DIST)) {
    if (!COMPRESSIBLE.has(extname(file).toLowerCase())) continue
    const { size } = await stat(file)
    if (size < MIN_BYTES) continue
    const data = await readFile(file)
    const [g, b] = await Promise.all([
      gz(data, { level: 9 }),
      br(data, {
        params: {
          [zc.BROTLI_PARAM_QUALITY]: 11,
          [zc.BROTLI_PARAM_SIZE_HINT]: size,
        },
      }),
    ])
    let wrote = false
    if (g.length <= size * (1 - MIN_SAVING)) { await writeFile(`${file}.gz`, g); gzTotal += g.length; wrote = true }
    if (b.length <= size * (1 - MIN_SAVING)) { await writeFile(`${file}.br`, b); brTotal += b.length; wrote = true }
    if (wrote) { files++; raw += size }
  }
  const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB'
  console.log(`precompressed ${files} files: ${mb(raw)} raw -> ${mb(gzTotal)} gzip / ${mb(brTotal)} brotli`)
}

await writeSitemap()
await precompress()
