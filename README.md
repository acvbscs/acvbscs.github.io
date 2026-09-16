# Class Storage

A minimal, grayscale file-explorer website for your class materials, hosted
free on GitHub Pages. Browse **Semester → Course → Resource**, preview files
in the browser, and download them — all backed directly by files you keep in
this repo. No database, no manifest file to maintain, no build step.

## How it works

The site reads the `storage/` folder in this repo at runtime, using GitHub's
public Contents API. Whatever folders and files exist under `storage/` is
exactly what shows up in the explorer:

```
storage/
├─ Semester 1/   (empty — add course folders here)
├─ Semester 2/
├─ Semester 3/
├─ Semester 4/
├─ Semester 5/
├─ Semester 6/
├─ Semester 7/
└─ Semester 8/
```

The 8 semester folders (4-year program) already exist, each holding a
`.gitkeep` placeholder so Git tracks the empty folder — delete `.gitkeep`
the moment you add real content to that folder. Inside each, add one
folder per course, and put any files inside that:

```
storage/Semester 1/Programming Fundamentals/Syllabus.pdf
storage/Semester 1/Programming Fundamentals/Slides/Lecture 1.pptx
storage/Semester 1/Calculus I/Notes Week 1.md
```

To add material: create the course folders and drop files in (via the
GitHub web UI, GitHub Desktop, or `git push`). Refresh the site — no other
step required.

## One-time setup

1. **Logo and colors are already set.** `LOGO.png` is your ACV x GCUF mark,
   and the background is fixed to `#1A1A1A` to match it exactly — the site
   is dark-only by design, no light mode to worry about.
2. **Rename the browser tab title**, if you like: open `assets/js/app.js`
   and change `siteName` near the top of the `CONFIG` object.
3. **Enable GitHub Pages**: repo Settings → Pages → Source: `Deploy from a
   branch` → Branch: `main` / root. Since this repo is named
   `acvbscs.github.io`, it will publish at `https://acvbscs.github.io/`.

That's it — everything else is static and already wired up.

## Notes and limits

- **Public repo required (for a free, login-free site).** GitHub Pages sites
  on the free tier are public, so anything under `storage/` is visible to
  anyone with the link. Don't put material there you're not allowed to
  redistribute.
- **GitHub API rate limit.** Browsing uses GitHub's unauthenticated Contents
  API, capped at ~60 requests/hour per visitor (each folder view = 1
  request). Fine for personal/class use; if you hit it, wait a few minutes.
- **File size.** GitHub blocks files over 100 MB per file (soft-warns over
  50 MB) and recommends repos stay under ~1 GB. For large lecture videos,
  consider linking out to Drive/YouTube instead of storing them here.
- **Previews:**
  - Images, PDFs, video, and audio preview natively in the browser.
  - Word/Excel/PowerPoint files preview via Microsoft's free Office Online
    viewer (requires the file to be publicly reachable, which it is once
    pushed to this repo).
  - Text, Markdown, and code files preview as plain text.
  - Anything else (zips, etc.) shows a download-only view.
  - Every file always has a **Download** button regardless of preview
    support.
- **Folder/file names:** avoid `#`, `?`, and other URL-reserved characters
  in folder or file names — spaces are fine.

## Project structure

```
index.html              — page shell
assets/css/style.css     — grayscale theme (light/dark), Inter type
assets/js/app.js         — GitHub API browsing, routing, previews, search
storage/                 — your actual content lives here
LOGO.png                 — ACV x GCUF site mark, shown top-left
.nojekyll                 — tells GitHub Pages not to run Jekyll on this repo
```
