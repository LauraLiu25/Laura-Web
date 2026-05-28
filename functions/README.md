# Cloudflare Pages Functions

This site uses three Pages Functions:

- `GET /api/health` checks Cloudflare environment bindings.
- `POST /api/match` receives a JD and returns AI resume matching results.
- `POST /api/message` stores message-board submissions in Cloudflare D1.

Cloudflare Pages environment variables:

- `NEWAPI_BASE_URL`, for example `https://ai.apixyz.cn`
- `NEWAPI_API_KEY`
- `NEWAPI_MODEL`, for example `gpt-4o-mini`
- `WECHAT_ID`, optional

Cloudflare D1 binding:

- Binding name: `DB`
- Suggested database name: `laura_messages`

The message table is created automatically the first time `/api/message` is called.
