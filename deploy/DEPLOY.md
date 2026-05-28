# 个人简历站 — 网络部署说明

## 最小上传目录

将以下内容**原样上传**到服务器或静态托管根目录（如 Nginx、`/var/www/html`、GitHub Pages、Vercel）：

```
index.html
styles.css
script.js
images/                 ← 整目录
assets/downloads/       ← 简历 PDF
assets/documents/       ← 项目报告、路演 PPT、宇树案例 PDF
assets/links/links.json ← 链接清单（维护用）
```

AI 岗位匹配器（首页「立即匹配」）需部署 Node 服务：

```
ai-matcher/
  server.mjs
  package.json
  candidate-profile.json
  site-map.json
  .env          ← 仅服务器本地，含 NEWAPI_API_KEY
```

本地启动（Windows 可双击项目根目录 `start-matcher.bat`）：

```bash
cd ai-matcher
copy .env.example .env   # 填入 NEWAPI_API_KEY
npm install
npm start
```

浏览器打开 **http://localhost:8787**，在首页粘贴 JD 后点「立即匹配」，结果以弹窗展示。  
生产环境用 Nginx 将 `/api/match` 反代到该 Node 服务，**切勿把 API Key 写进前端代码**。

**不必上传**（仅本地素材/参考）：`0关于我/`、`1教育经历/`、`2工作经历/`、`3项目经历/`、`首页/`、`参考图/`、`_ref_tmp/` 等中文目录。

---

## 跳转与外链一览

所有链接已集中到 **`assets/links/links.json`**，改 URL 或换简历时优先改该文件，并同步 `index.html` 中对应 `href`。

| 类型 | 说明 |
|------|------|
| 站内锚点 | `#home` `#about` `#education` `#work-experience` `#projects` `#more` |
| 本地下载 | `assets/downloads/resume-liu-hongsuo.pdf`（新窗口打开并触发下载） |
| 项目 PDF | `assets/documents/competition-aegle-x-report.pdf`、`-deck.pdf`、`unitree-case-main.pdf`、`unitree-case-teaching-note.pdf` |
| 外链 | 极因造物抖音视频、支教视频号、公众号、CareerMod、GitHub、小红书 |
| 联系 | `tel:15845241101`、`mailto:Laura_lhs@163.com` |

完整列表见 [FILE-MANIFEST.md](./FILE-MANIFEST.md)。

---

## 简历 PDF

- **部署路径**：`assets/downloads/resume-liu-hongsuo.pdf`
- **原文件位置**：`首页/简历-刘红锁-哈尔滨理工大学硕士研究生二年级.pdf`
- 更新简历：替换 `assets/downloads/` 下 PDF，或运行 `python deploy/sync-assets.py` 从 `首页/` 重新同步。

---

## 部署检查

1. 浏览器打开站点，**Ctrl+F5** 强刷。
2. 点击「下载简历」，确认 PDF 能下载。
3. 教育经历：支教视频、公众号链接在新标签打开正常。
4. 项目弹窗：CareerMod 官网链接正常。
5. 更多：电话/邮箱复制、GitHub、小红书外链正常。
6. 控制台无 404（重点查 `images/`、`assets/downloads/`）。

---

## 常用命令

```bash
# 从本地素材目录同步简历与项目 PDF 到 assets（在项目根目录执行）
python deploy/sync-assets.py
```

完整链接索引见 `assets/links/links.json`。
