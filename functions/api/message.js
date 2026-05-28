const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const text = String(body.text || "").trim();

    if (!text) {
      return json({ error: "请填写留言内容。" }, 400);
    }

    if (text.length > 2000) {
      return json({ error: "留言内容过长，请精简后再试。" }, 400);
    }

    if (name.length > 40) {
      return json({ error: "昵称过长，请精简后再试。" }, 400);
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "请输入有效的邮箱地址。" }, 400);
    }

    if (!env.DB) {
      throw new Error("Cloudflare D1 绑定 DB 还没有配置。");
    }

    await ensureMessagesTable(env.DB);
    await env.DB.prepare(
      `insert into messages (name, email, text, created_at, user_agent, ip)
       values (?, ?, ?, datetime('now'), ?, ?)`
    )
      .bind(
        name || null,
        email || null,
        text,
        request.headers.get("user-agent") || null,
        request.headers.get("cf-connecting-ip") || null
      )
      .run();

    return json({
      ok: true,
      wechatId: env.WECHAT_ID || "",
    });
  } catch (error) {
    return json(
      { error: error?.message || "留言发送失败，请稍后重试。" },
      500
    );
  }
}

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    endpoint: "/api/message",
    method: "POST",
    hasDb: Boolean(env.DB),
  });
}

async function ensureMessagesTable(db) {
  await db.prepare(
    `create table if not exists messages (
      id integer primary key autoincrement,
      name text,
      email text,
      text text not null,
      created_at text not null default (datetime('now')),
      user_agent text,
      ip text
    )`
  ).run();
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}
