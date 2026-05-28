#!/usr/bin/env python3
"""根据 index.html / styles.css 生成部署文件清单。"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def collect_static_paths() -> list[str]:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    paths: set[str] = set()

    for m in re.finditer(r'(?:href|src)=["\']([^"\'#?]+)', html):
        p = m.group(1)
        if p.startswith(("http", "tel:", "mailto:")):
            continue
        paths.add(p.replace("\\", "/"))

    for m in re.finditer(r'url\(["\']?([^"\')]+)', css):
        p = m.group(1).strip()
        if p.startswith(("data:", "http")):
            continue
        paths.add(p)

    return sorted(paths)


def main() -> None:
    assets = collect_static_paths()
    links = json.loads((ROOT / "assets" / "links" / "links.json").read_text(encoding="utf-8"))

    lines = [
        "# 部署文件清单（自动生成）",
        "",
        "运行 `python deploy/generate-manifest.py` 可更新本文件。",
        "",
        "## 核心文件",
        "",
        "- index.html",
        "- styles.css",
        "- script.js",
        "",
        "## 页面引用的静态资源",
        "",
    ]
    lines.extend(f"- {p}" for p in assets)
    lines += ["", "## 可下载文件", ""]
    for d in links["downloads"]:
        lines.append(f"- {d['deployPath']} — {d['label']}")
    lines += ["", "## 外链（无需上传）", ""]
    for e in links["external"]:
        lines.append(f"- **{e['label']}** ({e.get('section', '')}): {e['href']}")
    lines += ["", "## 联系方式", ""]
    for c in links["contact"]:
        lines.append(f"- **{c['label']}**: {c['href']}")
    lines += ["", "## 站内锚点", ""]
    for a in links["internalAnchors"]:
        lines.append(f"- {a['href']} — {a['label']}")

    out = ROOT / "deploy" / "FILE-MANIFEST.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {out.relative_to(ROOT)} ({len(assets)} static paths)")


if __name__ == "__main__":
    main()
