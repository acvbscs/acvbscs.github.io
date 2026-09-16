/* ============================================================
   Class Storage — file explorer
   Reads directly from this repo's /storage folder via the
   GitHub Contents API. No build step, no manifest to maintain:
   add folders/files to /storage in the repo and they appear here.
   ============================================================ */

const CONFIG = {
  owner: "acvbscs",
  repo: "acvbscs.github.io",
  rootDir: "storage",
  siteName: "ACV x GCUF — BS Computer Science Storage",
  // Files larger than this are not fetched for inline text preview.
  textPreviewLimitBytes: 500 * 1024,
};

document.getElementById("siteName").textContent = CONFIG.siteName;
document.title = CONFIG.siteName;

const el = {
  listing: document.getElementById("listing"),
  breadcrumb: document.getElementById("breadcrumb"),
  search: document.getElementById("searchInput"),
  drawer: document.getElementById("drawer"),
  drawerScrim: document.getElementById("drawerScrim"),
  drawerName: document.getElementById("drawerName"),
  drawerSub: document.getElementById("drawerSub"),
  drawerPreview: document.getElementById("drawerPreview"),
  drawerDownload: document.getElementById("drawerDownload"),
  drawerOpenTab: document.getElementById("drawerOpenTab"),
  drawerClose: document.getElementById("drawerClose"),
};

let currentEntries = []; // entries for the folder currently on screen

/* ---------------- Routing ---------------- */

function getPathSegments() {
  const hash = decodeURIComponent(location.hash || "");
  const raw = hash.replace(/^#\/?/, "");
  return raw.split("/").filter(Boolean);
}

function hashFor(segments) {
  return "#/" + segments.map(encodeURIComponent).join("/");
}

window.addEventListener("hashchange", () => {
  closeDrawer();
  loadCurrentPath();
});

/* ---------------- Icons ---------------- */

const ICONS = {
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.2.6l1 1.4H19.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/></svg>',
  file:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/></svg>',
  image:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="1.2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-5 4 4 3-3 4 4"/></svg>',
  pdf:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><path d="M8.5 13.5v4M8.5 13.5h1a1.5 1.5 0 0 1 0 3h-1M12.5 17.5v-4h1.2a1.4 1.4 0 0 1 0 2.8h-1.2M17 13.5v4M17 15.2h1.4"/></svg>',
  doc:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><path d="M8.5 13h6M8.5 16h6"/></svg>',
  sheet:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><path d="M8.5 12.5h7v5h-7z"/><path d="M8.5 15h7M11.5 12.5v5"/></svg>',
  slides:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><rect x="8.3" y="12" width="7.4" height="4.6" rx="0.6"/></svg>',
  code:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><path d="m10 12.5-2 2 2 2M14 12.5l2 2-2 2"/></svg>',
  archive:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><path d="M10.5 11v1.4M10.5 14v1.4M10.5 17v1"/></svg>',
  chevron:
    '<svg class="row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
};

const EXT_KIND = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", bmp: "image",
  pdf: "pdf",
  doc: "doc", docx: "doc", rtf: "doc",
  xls: "sheet", xlsx: "sheet", csv: "sheet",
  ppt: "slides", pptx: "slides",
  md: "code", markdown: "code", txt: "code", json: "code", js: "code", ts: "code",
  py: "code", java: "code", c: "code", cpp: "code", html: "code", css: "code", sh: "code", yml: "code", yaml: "code",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  mp4: "video", webm: "video", mov: "video",
  mp3: "audio", wav: "audio", ogg: "audio",
};

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function kindOf(name) {
  return EXT_KIND[extOf(name)] || "file";
}

function iconFor(entry) {
  if (entry.type === "dir") return ICONS.folder;
  const kind = kindOf(entry.name);
  return ICONS[kind] || ICONS.file;
}

/* ---------------- Formatting ---------------- */

function formatBytes(bytes) {
  if (bytes === 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return (i === 0 ? n : n.toFixed(n < 10 ? 1 : 0)) + " " + units[i];
}

/* ---------------- Breadcrumb ---------------- */

function renderBreadcrumb(segments) {
  el.breadcrumb.innerHTML = "";

  const homeLink = document.createElement("a");
  homeLink.className = "crumb-link";
  homeLink.href = hashFor([]);
  homeLink.textContent = "Home";
  if (segments.length === 0) {
    homeLink.classList.remove("crumb-link");
    homeLink.classList.add("crumb-current");
  }
  el.breadcrumb.appendChild(homeLink);

  segments.forEach((seg, idx) => {
    const sep = document.createElement("span");
    sep.className = "crumb-sep";
    sep.textContent = "/";
    el.breadcrumb.appendChild(sep);

    const isLast = idx === segments.length - 1;
    const node = document.createElement(isLast ? "span" : "a");
    node.textContent = seg;
    if (isLast) {
      node.className = "crumb-current";
    } else {
      node.className = "crumb-link";
      node.href = hashFor(segments.slice(0, idx + 1));
    }
    el.breadcrumb.appendChild(node);
  });
}

/* ---------------- Listing ---------------- */

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function renderSkeleton() {
  el.listing.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const row = document.createElement("div");
    row.className = "skeleton-row";
    row.innerHTML = `
      <div class="skeleton-bar" style="width:18px;height:18px;border-radius:5px;"></div>
      <div class="skeleton-bar" style="width:${40 + Math.random() * 40}%"></div>
      <div class="skeleton-bar" style="width:40px"></div>
    `;
    el.listing.appendChild(row);
  }
}

function renderState(title, body) {
  el.listing.innerHTML = "";
  const block = document.createElement("div");
  block.className = "state-block";
  block.innerHTML = `<p class="state-title">${title}</p><p class="state-body">${body}</p>`;
  el.listing.appendChild(block);
}

function renderEntries(entries) {
  el.listing.innerHTML = "";

  if (entries.length === 0) {
    renderState("This folder is empty", "No files or subfolders have been added here yet.");
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement(entry.type === "dir" ? "a" : "button");
    row.className = "row";
    if (entry.type === "dir") {
      row.href = hashFor([...getPathSegments(), entry.name]);
    }

    const meta = entry.type === "dir" ? "" : formatBytes(entry.size || 0);

    row.innerHTML = `
      <span class="row-icon">${iconFor(entry)}</span>
      <span class="row-name">${entry.name}</span>
      <span class="row-meta">${meta}</span>
      ${entry.type === "dir" ? ICONS.chevron : "<span></span>"}
    `;

    if (entry.type === "file") {
      row.addEventListener("click", () => openDrawer(entry));
    }

    el.listing.appendChild(row);
  });
}

function applySearchFilter() {
  const q = el.search.value.trim().toLowerCase();
  if (!q) {
    renderEntries(currentEntries);
    return;
  }
  const filtered = currentEntries.filter((e) => e.name.toLowerCase().includes(q));
  if (filtered.length === 0) {
    renderState("No matches", `Nothing in this folder matches “${el.search.value}”.`);
  } else {
    renderEntries(filtered);
  }
}

el.search.addEventListener("input", applySearchFilter);

/* ---------------- GitHub API ---------------- */

function apiUrlFor(segments) {
  const path = [CONFIG.rootDir, ...segments].map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`;
}

async function loadCurrentPath() {
  const segments = getPathSegments();
  renderBreadcrumb(segments);
  renderSkeleton();
  el.search.value = "";

  try {
    const res = await fetch(apiUrlFor(segments), {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (res.status === 404) {
      renderState(
        "Folder not found",
        `<code>${segments.join(" / ") || CONFIG.rootDir}</code> doesn't exist in this repository yet.`
      );
      currentEntries = [];
      return;
    }

    if (res.status === 403) {
      renderState(
        "Rate limit reached",
        "GitHub's public API allows about 60 requests per hour per visitor. Please try again shortly."
      );
      currentEntries = [];
      return;
    }

    if (!res.ok) {
      renderState("Something went wrong", `GitHub API responded with status ${res.status}.`);
      currentEntries = [];
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      // A file path was opened directly rather than a folder.
      openDrawer(data);
      history.back();
      return;
    }

    currentEntries = sortEntries(data);
    renderEntries(currentEntries);
  } catch (err) {
    renderState(
      "Couldn't load this folder",
      "Check your connection and try again. " + (err && err.message ? err.message : "")
    );
    currentEntries = [];
  }
}

/* ---------------- Preview drawer ---------------- */

function openDrawer(entry) {
  el.drawerName.textContent = entry.name;
  el.drawerSub.textContent = formatBytes(entry.size || 0);
  el.drawerDownload.href = entry.download_url || entry.html_url;
  el.drawerDownload.setAttribute("download", entry.name);
  el.drawerOpenTab.href = entry.download_url || entry.html_url;

  el.drawerPreview.innerHTML = "";
  const kind = kindOf(entry.name);

  if (kind === "image") {
    const img = document.createElement("img");
    img.src = entry.download_url;
    img.alt = entry.name;
    el.drawerPreview.appendChild(img);
  } else if (kind === "pdf") {
    const frame = document.createElement("iframe");
    frame.src = entry.download_url;
    frame.title = entry.name;
    el.drawerPreview.appendChild(frame);
  } else if (kind === "video") {
    const video = document.createElement("video");
    video.src = entry.download_url;
    video.controls = true;
    video.style.margin = "auto";
    video.style.maxWidth = "100%";
    el.drawerPreview.appendChild(video);
  } else if (kind === "audio") {
    const wrap = document.createElement("div");
    wrap.style.margin = "auto";
    wrap.style.padding = "24px";
    wrap.style.width = "100%";
    const audio = document.createElement("audio");
    audio.src = entry.download_url;
    audio.controls = true;
    audio.style.width = "100%";
    wrap.appendChild(audio);
    el.drawerPreview.appendChild(wrap);
  } else if (kind === "doc" || kind === "sheet" || kind === "slides") {
    const frame = document.createElement("iframe");
    frame.src = "https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(entry.download_url);
    frame.title = entry.name;
    el.drawerPreview.appendChild(frame);
    const note = document.createElement("p");
    note.className = "no-preview";
    note.style.margin = "0";
    note.style.padding = "10px 20px";
    note.style.borderTop = "1px solid var(--border)";
    note.textContent = "Previewed via Microsoft Office Online. If it doesn't load, use Download instead.";
    el.drawerPreview.style.flexDirection = "column";
    el.drawerPreview.appendChild(note);
  } else if (kind === "code") {
    if ((entry.size || 0) > CONFIG.textPreviewLimitBytes) {
      showNoPreview("This file is too large to preview inline.");
    } else {
      const pre = document.createElement("pre");
      pre.textContent = "Loading…";
      el.drawerPreview.appendChild(pre);
      fetch(entry.download_url)
        .then((r) => r.text())
        .then((text) => {
          pre.textContent = text;
        })
        .catch(() => {
          pre.textContent = "Couldn't load a text preview for this file.";
        });
    }
  } else {
    showNoPreview("No inline preview available for this file type.");
  }

  el.drawer.classList.add("open");
  el.drawer.setAttribute("aria-hidden", "false");
  el.drawerScrim.classList.add("open");
}

function showNoPreview(message) {
  const p = document.createElement("p");
  p.className = "no-preview";
  p.textContent = message;
  el.drawerPreview.appendChild(p);
}

function closeDrawer() {
  el.drawer.classList.remove("open");
  el.drawer.setAttribute("aria-hidden", "true");
  el.drawerScrim.classList.remove("open");
  el.drawerPreview.innerHTML = "";
}

el.drawerClose.addEventListener("click", closeDrawer);
el.drawerScrim.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

/* ---------------- Init ---------------- */

loadCurrentPath();
