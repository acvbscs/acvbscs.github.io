#!/usr/bin/env python3
"""Scan files/ and write manifest.json (the tree the website displays).

Run automatically by the GitHub Action on every push.
Run it by hand to preview locally:  python3 scripts/build_manifest.py && python3 -m http.server
"""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "files"
IGNORED = {".gitkeep", ".DS_Store", "Thumbs.db", "desktop.ini"}


def git_dates():
    """Map 'files/…' path -> ISO date of the last commit that touched it."""
    dates = {}
    try:
        out = subprocess.run(
            ["git", "-c", "core.quotepath=off", "log", "--format=@@%cI", "--name-only", "--", "files"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout
    except Exception:
        return dates
    current = None
    for line in out.splitlines():
        if line.startswith("@@"):
            current = line[2:]
        elif line.strip() and current:
            dates.setdefault(line.strip(), current)  # newest commit comes first
    return dates


DATES = git_dates()


def walk(path: Path):
    children = []
    for entry in sorted(path.iterdir(), key=lambda p: p.name.lower()):
        if entry.name.startswith(".") or entry.name in IGNORED:
            continue
        if entry.is_dir():
            children.append(walk(entry))
        elif entry.is_file():
            rel = entry.relative_to(ROOT).as_posix()
            modified = DATES.get(rel) or datetime.fromtimestamp(
                entry.stat().st_mtime, tz=timezone.utc
            ).isoformat()
            children.append({"n": entry.name, "t": "f", "s": entry.stat().st_size, "m": modified})
    return {"n": path.name, "t": "d", "c": children}


def main():
    CONTENT.mkdir(exist_ok=True)
    root = walk(CONTENT)
    root["n"] = ""
    manifest = {"generated": datetime.now(timezone.utc).isoformat(), "root": root}
    (ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"manifest.json written ({len(json.dumps(manifest))} bytes)")


if __name__ == "__main__":
    main()
