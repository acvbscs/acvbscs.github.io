# ACV X GCUF · BS Computer Science 2025–2029

Class cloud storage, hosted on GitHub Pages at `https://acvbscs.github.io/`.
Static site: no server, no database. The folders in `files/` **are** the file explorer.

## Add or change files

```
files/
  Semester 1/
    Calculus I/
      Lecture 01.pdf
    Introduction to Computing/
  Semester 2/
```

1. Semester folders go directly inside `files/`, course folders inside those, files inside those.
2. Commit and push to `main`. The site rebuilds in about a minute.

Folder and file names are shown exactly as written. Numbers sort naturally (`Semester 2` before `Semester 10`).
Delete the sample folders (`Semester 1`, `Semester 2`) before going live.

## One-time setup

1. Create the repository **`acvbscs.github.io`** under the `acvbscs` account or organisation and push this folder to `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Open the **Actions** tab and confirm "Deploy site" succeeded.

`.github/workflows/pages.yml` runs `scripts/build_manifest.py`, which scans `files/` and writes `manifest.json` (names, sizes, last-modified dates) for the site to read.

> If you choose "Deploy from a branch" instead, `manifest.json` won't exist and the site falls back to the GitHub API, which is limited to 60 requests per hour per visitor IP. Use the Actions source.

## Preview locally

```
python3 scripts/build_manifest.py
python3 -m http.server 8000     # open http://localhost:8000
```

## Limits to know

- GitHub blocks single files over **100 MB**; keep the repository under about **1 GB**. Put large videos elsewhere and link them from a `.md` file.
- Pages sites should stay under 1 GB and about 100 GB of bandwidth a month.
- Search matches file and folder **names**, not text inside files.
- Office files (`.docx`, `.pptx`, `.xlsx`) preview through Microsoft's online viewer and only work on the published site. Anything the viewer can't open can still be downloaded.
- The repository must be public for GitHub Pages on a free plan, so anyone with the link can open the files. Don't upload private material.
- Folder download builds the zip in the visitor's browser; very large folders (over 300 MB) ask for confirmation first.

## Files

| Path | Purpose |
|---|---|
| `index.html`, `assets/style.css`, `assets/app.js` | The site |
| `scripts/build_manifest.py` | Builds the file tree |
| `.github/workflows/pages.yml` | Rebuilds and deploys on every push |
| `docs/DESIGN-SYSTEM.md` | Tokens, components, states, accessibility |
