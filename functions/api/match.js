import profile from "../../ai-matcher/candidate-profile.json";
import siteMap from "../../ai-matcher/site-map.json";

const ALLOWED_TARGETS = new Set([
  "#home",
  "#about",
  "#about-skills",
  "#education",
  "#work-experience",
  "#projects",
  "#more",
]);

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export async function onRequestPost({ request, env }) {
  try {
    const { jd = "" } = await request.json().catch(() => ({}));
    const jobDescription = String(jd).trim();

    if (jobDescription.length < 20) {
      return json({ error: "请粘贴更完整的职位描述，建议不少于 20 个字。" }, 400);
    }

    if (jobDescription.length > 12000) {
      return json({ error: "职位描述过长，请精简后再试。" }, 400);
    }

    const result = await callAi(env, jobDescription);
    return json(result);
  } catch (error) {
    return json(
      { error: error?.message || "匹配服务暂时不可用，请稍后重试。" },
      500
    );
  }
}

export async function onRequestGet() {
  return json({
    ok: true,
    endpoint: "/api/match",
    method: "POST",
  });
}

async function callAi(env, jd) {
  const baseUrl = String(env.NEWAPI_BASE_URL || "https://ai.apixyz.cn").replace(/\/$/, "");
  const apiKey = env.NEWAPI_API_KEY;
  const model = env.NEWAPI_MODEL || "gpt-5.4";

  if (!apiKey) {
    throw new Error("Cloudflare 环境变量 NEWAPI_API_KEY 还没有配置。");
  }

  let { response, payload } = await requestChatCompletion({
    baseUrl,
    apiKey,
    model,
    jd,
    useJsonMode: true,
  });

  const jsonModeRejected =
    !response.ok &&
    /response_format|json_object/i.test(
      String(payload?.error?.message || payload?.message || "")
    );

  if (jsonModeRejected) {
    ({ response, payload } = await requestChatCompletion({
      baseUrl,
      apiKey,
      model,
      jd,
      useJsonMode: false,
    }));
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || response.statusText;
    throw new Error(`AI 接口错误 (${response.status}): ${message}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 接口没有返回内容。");

  return normalizeResult(extractJson(content));
}

async function requestChatCompletion({ baseUrl, apiKey, model, jd, useJsonMode }) {
  const body = {
    model,
    temperature: 0.35,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: [
          "【招聘岗位 JD】",
          jd,
          "",
          "【候选人档案 JSON】",
          JSON.stringify(profile),
        ].join("\n"),
      },
    ],
  };

  if (useJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function buildSystemPrompt() {
  const navLines = siteMap.navigation
    .map((item) => `- ${item.anchor}（${item.label}）：${item.purpose}`)
    .join("\n");

  return `你是企业招聘顾问，面向 HR 推荐候选人“刘红锁（Laura）”与岗位的匹配情况。
语气：专业、客观、第三人称，像在帮助 HR 做初筛摘要。
禁止编造简历中不存在的经历、奖项、公司或数字；只能依据候选人档案和站点导航信息推断。

输出必须是合法 JSON，且仅包含以下字段：
{
  "score": 0-100 的整数,
  "summary": "2-3 句，面向 HR 的整体匹配结论",
  "analysis": [
    {
      "text": "1-2 句，说明 JD 要求与候选人经历/能力的对应关系",
      "buttonText": "4-12 字按钮文案",
      "target": "站内锚点，必须从允许列表中选择"
    }
  ]
}

规则：
- analysis 数组 2-4 条，按与 JD 相关度从高到低排序。
- target 只能从这些锚点选择：${[...ALLOWED_TARGETS].join(" ")}。
- 如果 JD 为空或过短，score 给 0-40，并礼貌说明需要完整 JD。

站点模块：
${navLines}`;
}

function extractJson(text) {
  const trimmed = String(text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("模型返回内容无法解析为 JSON。");
  }
}

function normalizeResult(raw) {
  const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
  const summary =
    String(raw.summary || "").trim() ||
    "暂无匹配摘要，请结合 JD 与候选人档案人工复核。";
  const analysis = Array.isArray(raw.analysis) ? raw.analysis : [];

  const items = analysis
    .slice(0, 4)
    .map((item) => {
      let target = String(item.target || "#about").trim();
      if (!target.startsWith("#")) target = `#${target}`;
      if (!ALLOWED_TARGETS.has(target)) target = "#about";

      return {
        text: String(item.text || "").trim(),
        buttonText: String(item.buttonText || "查看详情").trim().slice(0, 16),
        target,
      };
    })
    .filter((item) => item.text);

  if (!items.length) {
    items.push({
      text: "建议先查看候选人的项目经历与技能卡片，再对照 JD 核心要求逐项判断。",
      buttonText: "查看项目经历",
      target: "#projects",
    });
  }

  return { score, summary, analysis: items };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}
