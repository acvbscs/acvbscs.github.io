#!/usr/bin/env python3
"""Builds manifest.json (file list, sizes, last-modified dates) from storage/."""
import json, os, subprocess, datetime
ROOT = 'storage'
times = {}
try:
    out = subprocess.run(['git', '-c', 'core.quotepath=false', 'log', '--name-only', '--format=@@%cI', '--', ROOT],
                         capture_output=True, text=True, check=True).stdout
    cur = None
    for line in out.splitlines():
        if line.startswith('@@'): cur = line[2:]
        elif line.strip() and line not in times: times[line] = cur
except Exception:
    pass
items = []
for base, _, files in os.walk(ROOT):
    for f in files:
        full = os.path.join(base, f).replace(os.sep, '/')
        t = times.get(full) or datetime.datetime.fromtimestamp(os.path.getmtime(full), datetime.timezone.utc).isoformat()
        items.append({'path': full[len(ROOT) + 1:], 'dir': False, 'size': os.path.getsize(full), 'mtime': t})
items.sort(key=lambda i: i['path'])
with open('manifest.json', 'w', encoding='utf-8') as fh:
    json.dump(items, fh, ensure_ascii=False, indent=1)
print(f'{len(items)} files indexed')
