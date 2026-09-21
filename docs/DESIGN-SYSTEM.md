# Design system: ACV X GCUF file explorer

Minimal and monochrome. The logo is greyscale on `#1A1A1A`; the interface stays in the same range. The memorable moment is the home page: the logo's heavy type set very large beside the mark, and everything after it stays quiet.

## Principles
1. **Grey only.** Hierarchy comes from weight, size and lightness, never hue. Selection and focus use white.
2. **The extension is the icon.** Files carry their type as a small text glyph (`PDF`, `PY`). Folders share one outline glyph.
3. **Every structural element carries information.** Borders separate rows, breadcrumbs show location, sort arrows show order. No decoration.
4. **The URL is the location.** `#/Semester 1/Calculus I/Lecture 01.pdf` opens that file directly and can be shared.

## Tokens (`assets/style.css`, `:root`)
| Group | Token | Value | Use |
|---|---|---|---|
| Colour | `--bg` | `#1A1A1A` | Page background (required) |
| | `--surface` | `#202020` | Cards, viewer, search field |
| | `--raised` | `#282828` | Hover, selected row, toast |
| | `--line` / `--line-strong` | `#333` / `#4A4A4A` | Dividers / control borders |
| | `--text` | `#F2F2F2` | Primary text, focus ring, primary button |
| | `--muted` | `#A3A3A3` | Secondary text (6.9:1 on bg) |
| | `--dim` | `#8A8A8A` | Tertiary text, placeholders (5.1:1 on bg) |
| Type | `--font` | Inter Tight 400–800 | All interface text; matches the logo's heavy grotesque |
| | `--mono` | JetBrains Mono | Code preview only |
| | scale | 12 / 14 / 15 / 18 / 28 px, hero 44–104 px | |
| Space | `--s1…--s8` | 4, 8, 12, 16, 24, 32, 48, 72 px | |
| Shape | `--r` | 6px | Every control, card and panel |

## Components
| Component | Variants | States | Notes |
|---|---|---|---|
| Button `.btn` | primary (white), `secondary` (outline) | default, hover, focus-visible, disabled | 38px high; icon + verb label ("Download folder") |
| Icon button `.icon-btn` | — | default, hover, focus-visible | 40px hit area; always has `aria-label` |
| Search field | — | default, hover, focus, has value | `/` focuses, `Esc` clears; hint hides once typing |
| Folder tree | — | collapsed, expanded, current | Folders only; current folder bold on `--raised` |
| Semester card `.card` | — | default, hover, focus-visible | Name, course count, file count and size |
| File row `.row` | file, folder, search result (adds path, highlights matches) | default, hover, focus-visible | Whole row is the link; download button sits above it |
| Column header | name, modified, size | inactive, active ascending, active descending | Folders always list first |
| Breadcrumb | — | link, current | `aria-current="page"` on last item |
| Viewer | pdf, image, video, audio, markdown, text/code, office, no preview | loading, ready, failed | Failure explains the cause and points to Download |
| Progress toast | — | preparing, compressing, done, cancelled, failed | `role="status"`; cancel button while running |
| Empty / error state `.state` | empty folder, no semesters, no results, not found | — | Says what happened and what to do next |

## Copy rules
- Sentence case. Verbs name the action: "Download", "Open in new tab", "Download folder".
- Errors state the cause and the next step. They don't apologise.
- The same action keeps its name everywhere ("Download folder" button, "Download started" toast).

## Accessibility
- Keyboard: every control is a native link or button; visible 2px white focus ring; skip link; `/` search; `←` `→` previous/next file in the viewer.
- Screen readers: breadcrumbs are a labelled `nav`; tree toggles use `aria-expanded`; icon buttons name the file they act on; progress uses a live region.
- Contrast: body text ≥ 15:1, secondary ≥ 6.9:1, tertiary ≥ 5.1:1 (WCAG AA).
- Motion: only a 0.12–0.18s chevron and drawer transition; none when `prefers-reduced-motion` is set.
- Touch: 40px minimum targets; the sidebar becomes a drawer under 900px.

## Extending
New file types: add the extension to `KINDS` in `assets/app.js`. New preview behaviour goes in `renderPreview`. Use tokens only; no hard-coded colours.
