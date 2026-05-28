#!/usr/bin/env python3
"""将本地素材 PDF 同步到 assets/，便于静态站点部署。"""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SYNC_RULES: list[tuple[Path, Path, str]] = [
    (ROOT / "首页", ROOT / "assets" / "downloads" / "resume-liu-hongsuo.pdf", "resume"),
]


def copy_first_pdf(folder: Path, dest: Path, hint: str) -> None:
    if not folder.is_dir():
        print(f"[跳过] 未找到目录：{folder}（{hint}）")
        return
    pdfs = sorted(folder.glob("*.pdf"))
    if not pdfs:
        print(f"[跳过] {folder} 下无 PDF（{hint}）")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(pdfs[0], dest)
    print(f"[简历] {pdfs[0].name} -> {dest.relative_to(ROOT)}")


def copy_by_name_predicate(
    folder: Path,
    dest: Path,
    predicate,
    label: str,
) -> None:
    if not folder.is_dir():
        print(f"[跳过] 未找到目录：{folder}（{label}）")
        return
    matches = [p for p in folder.glob("*.pdf") if predicate(p)]
    if not matches:
        print(f"[跳过] 未匹配 PDF：{label}")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(matches[0], dest)
    print(f"[{label}] {matches[0].name} -> {dest.relative_to(ROOT)}")


def main() -> None:
    copy_first_pdf(ROOT / "首页", ROOT / "assets" / "downloads" / "resume-liu-hongsuo.pdf", "resume")

    competition_dir = ROOT / "3项目经历" / "3.2 第三届中国研究生企业管理创新大赛"
    if not competition_dir.is_dir():
        # fallback: search folder containing 3.2 and 极因
        for d in (ROOT / "3项目经历").glob("3.2*") if (ROOT / "3项目经历").is_dir() else []:
            competition_dir = d
            break

    copy_by_name_predicate(
        competition_dir,
        ROOT / "assets" / "documents" / "competition-aegle-x-report.pdf",
        lambda p: "项目报告" in p.name or ("Aegle" in p.name and "报告" in p.name),
        "极因造物-项目报告",
    )
    copy_by_name_predicate(
        competition_dir,
        ROOT / "assets" / "documents" / "competition-aegle-x-deck.pdf",
        lambda p: "项目PPT" in p.name or "PPT" in p.name,
        "极因造物-路演PPT",
    )

    unitree_dir = ROOT / "3项目经历" / "3.3 宇树科技案例"
    if not unitree_dir.is_dir():
        for d in (ROOT / "3项目经历").glob("3.3*") if (ROOT / "3项目经历").is_dir() else []:
            unitree_dir = d
            break

    copy_by_name_predicate(
        unitree_dir,
        ROOT / "assets" / "documents" / "unitree-case-main.pdf",
        lambda p: "使用说明" not in p.name,
        "宇树-案例正文",
    )
    copy_by_name_predicate(
        unitree_dir,
        ROOT / "assets" / "documents" / "unitree-case-teaching-note.pdf",
        lambda p: "使用说明" in p.name,
        "宇树-教学说明",
    )

    print("\n完成。部署时请上传 assets/downloads/ 与 assets/documents/ 目录。")


if __name__ == "__main__":
    main()
