const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export async function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({
      ok: true,
      hasApiKey: Boolean(env.NEWAPI_API_KEY),
      model: env.NEWAPI_MODEL || "gpt-4o-mini",
      hasDb: Boolean(env.DB),
      hasWechatId: Boolean(env.WECHAT_ID),
    }),
    {
      headers: jsonHeaders,
    }
  );
}
