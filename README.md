# BSCS | 2025 – 2029 | Aspire College, Vehari

Class cloud storage on GitHub Pages: https://acvbscs.github.io/ (free hosting, no server).

## Repository layout
- `index.html`, `assets/style.css`, `assets/app.js`: the site (no build step).
- `assets/inter.woff2`: Inter font, self-hosted. `assets/jszip.min.js`: ZIP library, loaded only when you download a ZIP.
- `storage/`: the files shown on the site. Folder tree = site tree.
- `manifest.json`: file list (sizes, dates). Rebuilt automatically; do not edit by hand.
- `.github/`: Action that rebuilds `manifest.json` when `storage/` changes.

## Setup (once)
1. Repo `acvbscs.github.io` (or any repo with Pages on; the site detects its own repo). Any default branch works.
2. Settings > Pages > Source: "Deploy from a branch" > your default branch / root.
3. Settings > Actions > General > Workflow permissions: "Read and write permissions".

## Adding files
- On the site: Admin panel (below). Or commit files into `storage/`; the "Update file index" Action then updates `manifest.json`.
  If the site still shows 0 files: Actions tab > "Update file index" > Run workflow.

## Admin panel
1. GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token.
2. Repository access: only `acvbscs.github.io`. Permissions > Contents: **Read and write**. Set an expiry.
3. On the site press **Admin**, paste the token, sign in.

Admins can upload files or folders (or drag files in), create folders, rename or move, and delete.
Each action is one commit and also updates `manifest.json`. Visitors see changes after Pages redeploys (about a minute).
The token stays in your browser. Anyone holding it can edit the repository: use a repo-only, expiring token,
leave "Remember on this device" off on shared computers, and sign out when done.

## Notes
- Course folders display as `CODE | Name`; the real folder names have no bar (Windows does not allow `|`).
- Settings (repo name, recent days, upload limit) are at the top of `assets/app.js`.
- Limits: admin uploads 50 MB per file; GitHub 100 MB per file, about 1 GB per site. A public repo is public.
