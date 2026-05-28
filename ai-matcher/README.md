# 站点后端服务（AI 匹配 + 留言板）

提供：

- 首页 **AI 岗位匹配器**：`POST /api/match`
- **更多**页留言板：`POST /api/message` → 发送到你的邮箱，成功后前端调用 `showWechatToast()`

## 快速启动

```bash
cd ai-matcher
cp .env.example .env
# 编辑 .env（API 密钥、SMTP 邮箱、微信号）
npm install
npm start
```

浏览器访问：**http://localhost:8787**（静态站点 + API 同域）。

## 环境变量

| 变量 | 说明 |
|------|------|
| `NEWAPI_BASE_URL` | 默认 `https://ai.apixyz.cn` |
| `NEWAPI_API_KEY` | NewAPI / OpenAI 兼容密钥 |
| `NEWAPI_MODEL` | 默认 `gpt-5.4` |
| `SMTP_HOST` | 如 `smtp.163.com` |
| `SMTP_PORT` | 如 `465` |
| `SMTP_USER` | 发信邮箱（163 需开启 SMTP 授权码） |
| `SMTP_PASS` | SMTP 授权码（不是登录密码） |
| `MESSAGE_TO` | 接收留言的邮箱，默认同 `SMTP_USER` |
| `WECHAT_ID` | 留言成功后弹窗展示的微信号 |
| `PORT` | 默认 `8787` |

### 163 邮箱配置提示

1. 登录网易邮箱 → 设置 → POP3/SMTP/IMAP → 开启 SMTP
2. 生成**授权码**，填入 `SMTP_PASS`
3. `SMTP_USER` / `MESSAGE_TO` 填 `Laura_lhs@163.com`（或你的收件邮箱）

## API

### `POST /api/match`

（略，见上文 JSON 结构）

### `POST /api/message`

请求：

```json
{
  "name": "访客昵称",
  "email": "visitor@example.com",
  "text": "留言正文"
}
```

成功响应：

```json
{
  "ok": true,
  "wechatId": "你的微信号"
}
```

前端在成功后调用 `showWechatToast(payload.wechatId)`：复制微信号 → 按钮变绿「✅ 已复制」，5 秒后弹窗淡出。

### `GET /api/health`

返回 `hasMessageMail`、`hasWechatId` 等配置状态。

## 生产部署

静态页与 API **需同域**。Nginx 将 `/api/` 反代到 Node 服务；**SMTP 授权码与 API Key 仅放服务器环境变量**。

## 数据文件

- `candidate-profile.json` — AI 匹配依据
- `site-map.json` — 站内导航规则
