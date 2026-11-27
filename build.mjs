#!/usr/bin/env node
/**
 * CiBé Clinique — générateur de site statique (zéro dépendance).
 *
 *   node build.mjs            → construit le site dans dist/
 *   node build.mjs --serve    → construit puis sert dist/ sur http://localhost:4173
 *   node build.mjs --watch    → reconstruit à chaque modification de src/ (+ serveur)
 *
 * Fonctionnement
 *  - src/site.json           : coordonnées et données globales (téléphone, e-mail, réseaux…)
 *  - src/layout.html         : gabarit commun (<head>, en-tête, pied de page)
 *  - src/partials/*.html     : fragments réutilisables, appelés par {{> nom}}
 *  - src/pages/*.html        : une page = un fichier. Le bloc <!--meta {...} --> en tête
 *                              définit titre, description et entrée de menu active.
 *  - {{site.cle}} / {{page.cle}} sont remplacés par les valeurs correspondantes.
 */
import { readFile, writeFile, mkdir, readdir, cp, rm, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const args = new Set(process.argv.slice(2));

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function render(tpl, ctx, partials, depth = 0) {
  if (depth > 8) throw new Error('Inclusion de partiels trop profonde');
  return tpl
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      if (!(name in partials)) throw new Error(`Partiel introuvable : ${name}`);
      return render(partials[name], ctx, partials, depth + 1);
    })
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
      const v = get(ctx, key);
      return v === undefined ? m : String(v);
    });
}

async function loadPartials() {
  const dir = join(SRC, 'partials');
  const out = {};
  for (const f of await readdir(dir)) {
    if (f.endsWith('.html')) out[f.replace(/\.html$/, '')] = await readFile(join(dir, f), 'utf8');
  }
  return out;
}

/* ---------- Index de recherche ----------
 * Découpe chaque page en blocs « titre h1/h2/h3 + texte qui suit ».
 * Chaque bloc pointe vers l'ancre la plus proche (id du titre, sinon dernier id rencontré). */
const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", rsquo: '’', hellip: '…' };
const toText = (html) =>
  html
    .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, ' ')
    .replace(/<p class="eyebrow">[\s\S]*?<\/p>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? m)
    .replace(/\s+/g, ' ')
    .trim();

function indexPage(html, file, meta) {
  const pageLabel = file === 'index.html' ? 'Accueil' : (meta.title || '').split('|')[0].trim();
  const heads = [...html.matchAll(/<h([1-3])([^>]*)>([\s\S]*?)<\/h\1>/g)];
  return heads
    .map((h, i) => {
      const start = h.index + h[0].length;
      const end = i + 1 < heads.length ? heads[i + 1].index : html.length;
      const ownId = h[2].match(/\bid="([^"]+)"/);
      const ids = [...html.slice(0, h.index).matchAll(/\bid="([^"]+)"/g)];
      const anchor = ownId ? ownId[1] : ids.length ? ids[ids.length - 1][1] : '';
      return {
        page: pageLabel,
        title: toText(h[3]),
        url: file + (anchor && h[1] !== '1' ? `#${anchor}` : ''),
        text: toText(html.slice(start, end)).slice(0, 700),
      };
    })
    .filter((e) => e.title);
}

async function build() {
  const t0 = Date.now();
  const site = JSON.parse(await readFile(join(SRC, 'site.json'), 'utf8'));
  site.year = new Date().getFullYear();
  const layout = await readFile(join(SRC, 'layout.html'), 'utf8');
  const partials = await loadPartials();

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await cp(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });
  for (const f of ['site.webmanifest', 'favicon.svg', 'favicon.ico']) {
    try { await cp(join(SRC, f), join(DIST, f)); } catch { /* facultatif */ }
  }

  const pages = (await readdir(join(SRC, 'pages'))).filter((f) => f.endsWith('.html'));
  const urls = [];
  const searchIndex = [];

  for (const file of pages) {
    const raw = await readFile(join(SRC, 'pages', file), 'utf8');
    const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
    const meta = m ? JSON.parse(m[1]) : {};
    const body = m ? raw.slice(m[0].length) : raw;
    const slug = file === 'index.html' ? '' : file;
    const page = {
      title: meta.title || site.name,
      description: meta.description || site.description,
      nav: meta.nav || '',
      bodyClass: meta.bodyClass || '',
      ogImage: meta.ogImage || site.ogImage,
      url: `${site.url}/${slug}`,
      file,
    };
    const ctx = { site, page };
    let html = render(layout.replace('{{content}}', () => body), ctx, partials);
    if (page.nav) {
      html = html.replaceAll(`data-nav="${page.nav}"`, `data-nav="${page.nav}" aria-current="page"`);
    }
    await writeFile(join(DIST, file), html);
    if (!meta.noindex) {
      urls.push(page.url);
      searchIndex.push(...indexPage(render(body, ctx, partials), file, meta));
    }
  }

  /* Index de recherche : chargé par recherche.html (fonctionne aussi hors serveur, en file://) */
  await writeFile(
    join(DIST, 'assets', 'js', 'search-index.js'),
    `window.SEARCH_INDEX = ${JSON.stringify(searchIndex)};\n`
  );

  const today = new Date().toISOString().slice(0, 10);
  await writeFile(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`
  );
  await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);

  console.log(`✓ ${pages.length} pages construites dans dist/, ${searchIndex.length} entrées de recherche (${Date.now() - t0} ms)`);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

function serve(port = Number(process.env.PORT) || 4173) {
  createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = join(DIST, p);
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'Content-Type': MIME['.html'] });
      res.end(await readFile(join(DIST, '404.html')).catch(() => 'Page introuvable'));
    }
  }).listen(port, () => console.log(`→ http://localhost:${port}`));
}

await build();

if (args.has('--watch')) {
  let timer;
  watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error('✗', e.message)), 120);
  });
  console.log('… surveillance de src/ active');
}
if (args.has('--serve') || args.has('--watch')) serve();
