/* ACV X GCUF — static file explorer. No build step, no framework. */
'use strict';

const CONTENT = 'files';            // folder in the repo that holds everything
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nat = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
const ext = n => { const i = n.lastIndexOf('.'); return i > 0 ? n.slice(i + 1).toLowerCase() : ''; };
const fileUrl = p => CONTENT + '/' + p.map(encodeURIComponent).join('/');
const absUrl = p => new URL(fileUrl(p), location.href).href;
const hashFor = p => '#/' + p.map(encodeURIComponent).join('/');
const fmtSize = b => {
  if (b < 1024) return b + ' B';
  const u = ['KB', 'MB', 'GB']; let i = -1;
  do { b /= 1024; i++; } while (b >= 1024 && i < 2);
  return (b < 10 ? b.toFixed(1) : Math.round(b)) + ' ' + u[i];
};
const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDate = iso => { const d = iso && new Date(iso); return d && !isNaN(d) ? dateFmt.format(d) : ''; };

/* ---------- icons ---------- */
const I = {
  folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.3l2 2.2h8.7A1.5 1.5 0 0 1 21 9.7v8.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"/></svg>',
  open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
};
const fileGlyph = name => { const e = ext(name).slice(0, 4); return `<span class="fi" aria-hidden="true">${esc(e || 'file')}</span>`; };
const glyph = n => n.dir ? `<span class="folder-ico">${I.folder}</span>` : fileGlyph(n.name);

/* ---------- file types that can be previewed ---------- */
const KINDS = {
  pdf: ['pdf'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'],
  video: ['mp4', 'webm', 'mov', 'm4v', 'ogv'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
  markdown: ['md', 'markdown'],
  office: ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'odp', 'ods'],
  text: ['txt', 'csv', 'tsv', 'json', 'xml', 'yml', 'yaml', 'toml', 'ini', 'log', 'tex', 'sql', 'sh', 'bat', 'ps1',
    'py', 'ipynb', 'js', 'mjs', 'ts', 'jsx', 'tsx', 'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'java', 'kt', 'go', 'rs', 'rb', 'php',
    'swift', 'r', 'm', 'jl', 'lua', 'pl', 'hs', 'asm', 's', 'v', 'sv', 'vhd', 'html', 'htm', 'css', 'scss', 'gitignore', 'makefile'],
};
const kindOf = name => {
  const e = ext(name) || name.toLowerCase();
  return Object.keys(KINDS).find(k => KINDS[k].includes(e)) || null;
};
const TEXT_LIMIT = 1.5 * 1024 * 1024;

/* ---------- lazy library loader (only fetched when needed) ---------- */
const scripts = {};
const loadScript = src => scripts[src] || (scripts[src] = new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load a helper library. Check your connection.'));
  document.head.appendChild(s);
}));
const LIBS = {
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  marked: 'https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js',
  purify: 'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js',
};

/* ---------- data ---------- */
let ROOT = null, INDEX = [];
const BY_KEY = new Map();

function hydrate(raw, parent = null, path = []) {
  const n = { name: raw.n, dir: raw.t === 'd', parent, path, size: raw.s || 0, mtime: raw.m || '', children: [], files: 0, folders: 0 };
  if (n.dir) {
    n.children = (raw.c || []).map(c => hydrate(c, n, [...path, c.n]))
      .sort((a, b) => (b.dir - a.dir) || nat(a.name, b.name));
    for (const c of n.children) {
      n.size += c.size;
      if (c.dir) { n.folders++; n.files += c.files; } else n.files++;
      if (c.mtime > n.mtime) n.mtime = c.mtime;
    }
  }
  return n;
}
function index(n) {
  for (const c of n.children) { INDEX.push(c); BY_KEY.set(c.path.join('/'), c); if (c.dir) index(c); }
}
const resolve = segs => segs.reduce((n, s) => n && n.dir ? n.children.find(c => c.name === s) : null, ROOT);

/* Fallback when manifest.json is missing: read the tree from the GitHub API (60 requests/hour per visitor IP). */
async function fromGitHub() {
  const host = location.hostname;
  if (!host.endsWith('.github.io')) throw new Error('manifest.json not found');
  const owner = host.split('.')[0], repo = host;
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
  if (!r.ok) throw new Error('GitHub API returned ' + r.status);
  const { tree } = await r.json();
  const root = { n: '', t: 'd', c: [] };
  const dirs = { '': root };
  for (const item of tree) {
    if (!item.path.startsWith(CONTENT + '/')) continue;
    const parts = item.path.slice(CONTENT.length + 1).split('/');
    const name = parts.pop();
    if (name.startsWith('.')) continue;
    const parentKey = parts.join('/');
    const parent = dirs[parentKey];
    if (!parent) continue;
    if (item.type === 'tree') { const d = { n: name, t: 'd', c: [] }; parent.c.push(d); dirs[item.path.slice(CONTENT.length + 1)] = d; }
    else if (item.type === 'blob') parent.c.push({ n: name, t: 'f', s: item.size || 0 });
  }
  return root;
}
async function loadTree() {
  try {
    const r = await fetch('manifest.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error();
    return (await r.json()).root;
  } catch { return fromGitHub(); }
}

/* ---------- state ---------- */
const state = { open: new Set(), sort: { key: 'name', dir: 1 }, token: 0, returnHash: '#/' };
const pageEl = $('#page'), treeEl = $('#tree'), mainEl = $('#main'), searchEl = $('#search');

/* ---------- sidebar tree ---------- */
function renderTree(currentDir, auto = true) {
  const curKey = currentDir ? currentDir.path.join('/') : null;
  if (auto) for (let n = currentDir; n && n.parent; n = n.parent) state.open.add(n.path.join('/'));
  const item = n => {
    const key = n.path.join('/'), subs = n.children.filter(c => c.dir), open = state.open.has(key), cur = key === curKey;
    return `<li><div class="tn${cur ? ' is-current' : ''}">
      ${subs.length ? `<button class="tn-toggle" data-key="${esc(key)}" aria-expanded="${open}" aria-label="${open ? 'Collapse' : 'Expand'} ${esc(n.name)}">${I.chevron}</button>` : '<span class="tn-spacer"></span>'}
      <a href="${hashFor(n.path)}"${cur ? ' aria-current="page"' : ''}>${I.folder}<span>${esc(n.name)}</span></a></div>
      ${subs.length && open ? `<ul>${subs.map(item).join('')}</ul>` : ''}</li>`;
  };
  const home = currentDir === ROOT && !location.hash.startsWith('#?');
  treeEl.innerHTML = `<ul><li><div class="tn${home ? ' is-current' : ''}"><span class="tn-spacer"></span>
    <a href="#/"${home ? ' aria-current="page"' : ''}>${I.folder}<span>All semesters</span></a></div></li>
    ${ROOT.children.filter(c => c.dir).map(item).join('')}</ul>`;
}
treeEl.addEventListener('click', e => {
  const b = e.target.closest('.tn-toggle'); if (!b) return;
  const k = b.dataset.key; state.open.has(k) ? state.open.delete(k) : state.open.add(k);
  const y = $('#sidebar').scrollTop; renderTree(currentDirFromHash(), false); $('#sidebar').scrollTop = y;
  const nb = treeEl.querySelector(`.tn-toggle[data-key="${CSS.escape(k)}"]`); nb && nb.focus();
});

/* ---------- shared bits ---------- */
function crumbs(node) {
  const parts = [`<li><a href="#/">Home</a></li>`];
  node.path.forEach((seg, i) => {
    const last = i === node.path.length - 1;
    parts.push(last ? `<li><span aria-current="page">${esc(seg)}</span></li>` : `<li><a href="${hashFor(node.path.slice(0, i + 1))}">${esc(seg)}</a></li>`);
  });
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${parts.join('')}</ol></nav>`;
}
function summary(n) {
  const bits = [];
  if (n.folders) bits.push(plural(n.folders, n.parent === ROOT ? 'course' : 'folder'));
  bits.push(plural(n.files, 'file'));
  if (n.size) bits.push(fmtSize(n.size));
  return bits.join(', ');
}
const setTitle = t => { document.title = t ? `${t} · ACV X GCUF` : 'ACV X GCUF · BS Computer Science 2025–2029'; };
const currentDirFromHash = () => {
  const h = location.hash;
  if (!h.startsWith('#/')) return h.startsWith('#?') ? null : ROOT;
  const n = resolve(parseHash());
  return n ? (n.dir ? n : n.parent) : ROOT;
};
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (!h) return [];
  try { return h.split('/').filter(Boolean).map(decodeURIComponent); } catch { return []; }
}
const rowActions = n => n.dir
  ? `<button class="icon-btn row-act" data-zip="${esc(n.path.join('/'))}" aria-label="Download ${esc(n.name)} as zip" title="Download folder as zip">${I.download}</button>`
  : `<a class="icon-btn row-act" href="${fileUrl(n.path)}" download="${esc(n.name)}" aria-label="Download ${esc(n.name)}" title="Download">${I.download}</a>`;

/* ---------- views ---------- */
function viewHome() {
  setTitle('');
  const sems = ROOT.children.filter(c => c.dir);
  const recent = INDEX.filter(n => !n.dir && n.mtime).sort((a, b) => b.mtime.localeCompare(a.mtime)).slice(0, 6);
  pageEl.className = 'page';
  pageEl.innerHTML = `
    <section class="hero">
      <div>
        <h1>ACV X GCUF</h1>
        <p class="hero-sub">BS Computer Science 2025–2029</p>
        <p class="hero-note">Course files for every semester. Read them here or download them.</p>
      </div>
      <img class="hero-mark" src="assets/logo-mark.png" alt="" width="260" height="260">
    </section>
    <section class="section" aria-labelledby="h-sem">
      <h2 id="h-sem">Semesters</h2>
      ${sems.length ? `<div class="cards">${sems.map(s => `
        <a class="card" href="${hashFor(s.path)}">${I.folder}
          <span class="card-name">${esc(s.name)}</span>
          <span class="card-meta">${s.folders ? plural(s.folders, 'course') : 'No courses yet'}</span>
          <span class="card-meta">${plural(s.files, 'file')}${s.size ? ', ' + fmtSize(s.size) : ''}</span>
        </a>`).join('')}</div>`
      : `<div class="state"><strong>No semesters yet</strong>Add a folder such as <code>files/Semester 1</code> to the repository. It shows up here after the next deploy.</div>`}
    </section>
    ${recent.length ? `<section class="section" aria-labelledby="h-new"><h2 id="h-new">Recently added</h2>
      <ul class="list">${recent.map(n => rowHtml(n, { showPath: true })).join('')}</ul></section>` : ''}`;
}

function sortedChildren(dir) {
  const { key, dir: d } = state.sort;
  const cmp = {
    name: (a, b) => nat(a.name, b.name),
    size: (a, b) => a.size - b.size || nat(a.name, b.name),
    date: (a, b) => a.mtime.localeCompare(b.mtime) || nat(a.name, b.name),
  }[key];
  return [...dir.children].sort((a, b) => (b.dir - a.dir) || cmp(a, b) * d);
}
function rowHtml(n, { showPath = false, terms = null } = {}) {
  const title = terms ? highlight(n.name, terms) : esc(n.name);
  const sub = showPath ? `<span class="row-sub">${esc(n.path.slice(0, -1).join(' / ') || 'All semesters')}</span>` : '';
  const size = n.dir ? plural(n.files, 'file') : fmtSize(n.size);
  return `<li class="row">
    <a class="row-name" href="${hashFor(n.path)}">${glyph(n)}<span class="row-text"><span class="row-title">${title}</span>${sub}</span></a>
    <span class="row-cell date">${fmtDate(n.mtime)}</span>
    <span class="row-cell num">${size}</span>
    ${rowActions(n)}</li>`;
}
function colHeader() {
  const b = (k, label) => {
    const on = state.sort.key === k;
    return `<button data-sort="${k}"${on ? ` class="is-active" data-dir="${state.sort.dir}"` : ''} aria-label="Sort by ${label.toLowerCase()}${on ? (state.sort.dir === 1 ? ', ascending' : ', descending') : ''}">${label}</button>`;
  };
  return `<div class="cols">${b('name', 'Name')}${b('date', 'Modified')}<span class="num">${b('size', 'Size')}</span><span></span></div>`;
}

function viewFolder(dir) {
  setTitle(dir.name);
  pageEl.className = 'page';
  const kids = sortedChildren(dir);
  pageEl.innerHTML = `
    <header class="page-head">${crumbs(dir)}
      <div class="head-row"><h1>${esc(dir.name)}</h1>
        ${dir.files ? `<div class="actions"><button class="btn" data-zip="${esc(dir.path.join('/'))}">${I.download}Download folder</button></div>` : ''}
      </div>
      <p class="meta">${summary(dir)}</p>
    </header>
    ${kids.length ? `${colHeader()}<ul class="list" style="border-top:0">${kids.map(n => rowHtml(n)).join('')}</ul>`
      : `<div class="state"><strong>This folder is empty</strong>Add files to <code>${esc(fileUrl(dir.path))}</code> in the repository.</div>`}`;
}
pageEl.addEventListener('click', e => {
  const s = e.target.closest('[data-sort]');
  if (s) {
    const k = s.dataset.sort;
    state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : 1 };
    const dir = currentDirFromHash(); const y = mainEl.scrollTop; viewFolder(dir); mainEl.scrollTop = y;
    pageEl.querySelector(`[data-sort="${k}"]`).focus();
  }
});

/* ---------- file viewer ---------- */
function viewFile(f) {
  setTitle(f.name);
  pageEl.className = 'page wide';
  const sibs = f.parent.children.filter(c => !c.dir), i = sibs.indexOf(f);
  const prev = sibs[i - 1], next = sibs[i + 1];
  const nav = (n, label, icon, dir) => n
    ? `<a class="icon-btn" data-nav="${dir}" href="${hashFor(n.path)}" aria-label="${label}: ${esc(n.name)}" title="${label}: ${esc(n.name)}">${icon}</a>`
    : `<span class="icon-btn" aria-hidden="true" style="opacity:.25">${icon}</span>`;
  pageEl.innerHTML = `
    <header class="page-head">${crumbs(f)}
      <div class="head-row"><h1>${esc(f.name)}</h1>
        <div class="actions">
          ${nav(prev, 'Previous file', I.prev, 'prev')}${nav(next, 'Next file', I.next, 'next')}
          <a class="btn secondary" href="${fileUrl(f.path)}" target="_blank" rel="noopener">${I.open}Open in new tab</a>
          <a class="btn" href="${fileUrl(f.path)}" download="${esc(f.name)}">${I.download}Download</a>
        </div></div>
      <p class="meta">${[ext(f.name).toUpperCase() || 'File', fmtSize(f.size), f.mtime ? 'Added ' + fmtDate(f.mtime) : ''].filter(Boolean).join(', ')}</p>
    </header>
    <div class="viewer" id="viewer"><p class="note">Loading preview…</p></div>`;
  const token = ++state.token;
  renderPreview(f, $('#viewer'), token).catch(err => {
    if (token === state.token) $('#viewer').innerHTML = `<div class="note"><strong>Preview failed</strong>${esc(err.message)} You can still download the file.</div>`;
  });
}

async function renderPreview(f, box, token) {
  const url = fileUrl(f.path), kind = kindOf(f.name);
  const noPreview = (why) => `<div class="note"><strong>${why}</strong>Download the file to open it on your device.</div>`;
  if (!kind) return void (box.innerHTML = noPreview('No preview for this file type'));

  if (kind === 'pdf') box.innerHTML = `<iframe src="${url}" title="${esc(f.name)}"></iframe>`;
  else if (kind === 'image') box.innerHTML = `<div class="media"><img src="${url}" alt="${esc(f.name)}"></div>`;
  else if (kind === 'video') box.innerHTML = `<video src="${url}" controls preload="metadata"></video>`;
  else if (kind === 'audio') box.innerHTML = `<audio src="${url}" controls preload="metadata"></audio>`;
  else if (kind === 'office') {
    if (/^(localhost|127\..*|\[::1\])?$/.test(location.hostname)) return void (box.innerHTML = noPreview('Office previews only work on the published site'));
    box.innerHTML = `<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absUrl(f.path))}" title="${esc(f.name)}"></iframe>`;
  } else {
    if (f.size > TEXT_LIMIT) return void (box.innerHTML = noPreview(`Too large to preview (${fmtSize(f.size)})`));
    const r = await fetch(url); if (!r.ok) throw new Error('The file could not be loaded.');
    const text = await r.text(); if (token !== state.token) return;
    if (kind === 'markdown') {
      await Promise.all([loadScript(LIBS.marked), loadScript(LIBS.purify)]); if (token !== state.token) return;
      const tpl = document.createElement('template');
      tpl.innerHTML = DOMPurify.sanitize(marked.parse(text));
      const base = new URL(url, location.href);
      tpl.content.querySelectorAll('img[src]').forEach(el => { try { el.src = new URL(el.getAttribute('src'), base).href; } catch {} });
      tpl.content.querySelectorAll('a[href]').forEach(el => { el.target = '_blank'; el.rel = 'noopener'; });
      const art = document.createElement('article'); art.className = 'prose'; art.appendChild(tpl.content);
      box.replaceChildren(art);
    } else {
      const pre = document.createElement('pre'); pre.className = 'code'; pre.tabIndex = 0;
      pre.setAttribute('aria-label', f.name); pre.textContent = text; box.replaceChildren(pre);
    }
  }
}

/* ---------- search ---------- */
function highlight(text, terms) {
  const re = new RegExp('(' + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  return text.split(re).map((p, i) => i % 2 ? `<mark>${esc(p)}</mark>` : esc(p)).join('');
}
function viewSearch(q) {
  setTitle(`Search: ${q}`);
  pageEl.className = 'page';
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const n of INDEX) {
    const name = n.name.toLowerCase(), full = n.path.join(' / ').toLowerCase();
    if (!terms.every(t => full.includes(t))) continue;
    let score = 0;
    for (const t of terms) score += name.startsWith(t) ? 4 : name.includes(t) ? 3 : 1;
    if (n.dir) score += .5;
    hits.push([score, n]);
  }
  hits.sort((a, b) => b[0] - a[0] || nat(a[1].name, b[1].name));
  const shown = hits.slice(0, 200);
  pageEl.innerHTML = `
    <header class="page-head"><h1>Results for “${esc(q)}”</h1>
      <p class="meta">${hits.length ? plural(hits.length, 'match', 'matches') + (hits.length > shown.length ? `, showing the first ${shown.length}` : '') : ''}</p></header>
    ${shown.length ? `<ul class="list">${shown.map(([, n]) => rowHtml(n, { showPath: true, terms })).join('')}</ul>`
      : `<div class="state"><strong>Nothing matches “${esc(q)}”</strong>Search looks at file, folder and course names. Try fewer or shorter words.</div>`}`;
}

/* ---------- router ---------- */
function route() {
  if (!ROOT) return;
  const h = location.hash;
  state.token++;
  closeDrawer();
  if (h.startsWith('#?q=')) {
    const q = decodeURIComponent(h.slice(4)).trim();
    renderTree(null); q ? viewSearch(q) : viewHome();
  } else {
    const node = resolve(parseHash());
    if (!node) {
      setTitle('Not found'); renderTree(ROOT); pageEl.className = 'page';
      pageEl.innerHTML = `<div class="state"><strong>That file or folder isn’t here</strong>It may have been moved or renamed. <a href="#/">Go to all semesters</a>.</div>`;
    } else if (node === ROOT) { renderTree(ROOT); viewHome(); }
    else if (node.dir) { renderTree(node); viewFolder(node); }
    else { renderTree(node.parent); viewFile(node); }
  }
  mainEl.scrollTop = 0;
}
function syncSearchBox() {
  const h = location.hash;
  searchEl.value = h.startsWith('#?q=') ? decodeURIComponent(h.slice(4)) : '';
}
window.addEventListener('hashchange', () => { syncSearchBox(); route(); });

let searchTimer;
searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = searchEl.value.trim();
    if (q) {
      if (!location.hash.startsWith('#?q=')) state.returnHash = location.hash || '#/';
      history.replaceState(null, '', '#?q=' + encodeURIComponent(q));
    } else history.replaceState(null, '', state.returnHash);
    route();
  }, 90);
});
searchEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') { searchEl.value = ''; searchEl.dispatchEvent(new Event('input')); searchEl.blur(); }
  if (e.key === 'Enter') { const a = pageEl.querySelector('.row-name'); if (a) location.hash = a.getAttribute('href'); }
});
document.addEventListener('keydown', e => {
  const t = e.target, typing = t.matches && t.matches('input, textarea, [contenteditable]');
  if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); searchEl.focus(); searchEl.select(); }
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !typing && !e.altKey && !e.metaKey && !e.ctrlKey && $('#viewer')) {
    const a = pageEl.querySelector(`[data-nav="${e.key === 'ArrowLeft' ? 'prev' : 'next'}"]`);
    if (a && !(t.closest && t.closest('audio, video'))) { location.hash = a.getAttribute('href'); }
  }
  if (e.key === 'Escape') closeDrawer();
});

/* ---------- mobile drawer ---------- */
const sidebar = $('#sidebar'), scrim = $('#scrim'), menuBtn = $('#menu-btn');
function closeDrawer() { sidebar.classList.remove('open'); scrim.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => {
  const open = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', open); scrim.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
});
scrim.addEventListener('click', closeDrawer);

/* ---------- folder → .zip ---------- */
const toast = $('#toast');
let zipping = null;
function showToast({ title, detail, pct, cancel }) {
  toast.hidden = false;
  toast.innerHTML = `<strong>${esc(title)}</strong><p>${esc(detail)}</p>${pct != null ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}${cancel ? '<button class="btn secondary" id="toast-cancel">Cancel</button>' : ''}`;
  const c = $('#toast-cancel'); if (c) c.onclick = cancel;
}
const hideToast = (ms = 0) => setTimeout(() => { toast.hidden = true; }, ms);

async function downloadFolder(node) {
  if (zipping) return showToast({ title: 'Another download is running', detail: 'Wait for it to finish, or cancel it first.' });
  const files = [];
  (function walk(n) { n.children.forEach(c => c.dir ? walk(c) : files.push(c)); })(node);
  if (!files.length) { showToast({ title: 'Nothing to download', detail: `${node.name} has no files.` }); return hideToast(3500); }
  if (node.size > 300 * 1024 * 1024 && !confirm(`${node.name} is ${fmtSize(node.size)}. Building the zip needs that much memory on your device. Continue?`)) return;

  const ctl = new AbortController(); zipping = ctl;
  const zipName = (node.name || 'ACV-BSCS') + '.zip';
  showToast({ title: `Preparing ${zipName}`, detail: 'Loading…', pct: 0, cancel: () => ctl.abort() });
  try {
    await loadScript(LIBS.jszip);
    const zip = new JSZip(); const queue = [...files]; let done = 0, bytes = 0;
    const worker = async () => {
      while (queue.length) {
        const f = queue.shift();
        const r = await fetch(fileUrl(f.path), { signal: ctl.signal });
        if (!r.ok) throw new Error(`${f.name} could not be downloaded (${r.status}).`);
        zip.file([node.name, ...f.path.slice(node.path.length)].join('/'), await r.blob(), { binary: true });
        done++; bytes += f.size;
        showToast({ title: `Preparing ${zipName}`, detail: `${done} of ${files.length} files`, pct: Math.round(bytes / (node.size || 1) * 100), cancel: () => ctl.abort() });
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    showToast({ title: `Preparing ${zipName}`, detail: 'Compressing…', pct: 100 });
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = zipName;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    showToast({ title: 'Download started', detail: `${zipName}, ${fmtSize(blob.size)}` }); hideToast(3500);
  } catch (err) {
    if (err.name === 'AbortError') { showToast({ title: 'Download cancelled', detail: zipName }); hideToast(2500); }
    else showToast({ title: 'Download failed', detail: err.message }), hideToast(6000);
  } finally { zipping = null; }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-zip]'); if (!b) return;
  const n = BY_KEY.get(b.dataset.zip); if (n) downloadFolder(n);
});

/* ---------- boot ---------- */
(async function boot() {
  try {
    ROOT = hydrate(await loadTree()); index(ROOT);
  } catch (err) {
    pageEl.innerHTML = `<div class="state"><strong>Files couldn’t be loaded</strong>${esc(err.message)}. Refresh the page. If it keeps happening, tell the site maintainers.</div>`;
    return;
  }
  syncSearchBox(); route();
})();
