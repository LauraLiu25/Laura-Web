import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMessageMailConfigured, sendMessageEmail } from "./message-mailer.mjs";

dotenv.config();

const WECHAT_ID = String(process.env.WECHAT_ID || "").trim();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ALLOWED_TARGETS = new Set([
  "#home",
  "#about",
  "#about-skills",
  "#education",
  "#work-experience",
  "#projects",
  "#more",
]);

const profile = JSON.parse(
  readFileSync(path.join(__dirname, "candidate-profile.json"), "utf8")
);
const siteMap = JSON.parse(readFileSync(path.join(__dirname, "site-map.json"), "utf8"));

const app = express();
app.use(cors());
app.use(express.json({ limit: "48kb" }));
app.use(express.static(ROOT));

function buildSystemPrompt() {
  const navLines = siteMap.navigation
    .map((n) => `- ${n.anchor}（${n.label}）：${n.purpose}`)
    .join("\n");

  return `你是企业招聘顾问，面向 HR 推荐候选人「刘红锁（Laura）」与岗位的匹配情况。
语气：专业、客观、第三人称（用「该候选人」「刘红锁」），像在帮 HR 做初筛摘要，不要用候选人第一人称。
禁止编造简历中不存在的经历、奖项、公司或数字；只能依据提供的候选人档案与站点导航信息推断。
输出必须是合法 JSON，且仅包含以下字段，不要 markdown 代码块：
{
  "score": 0-100 的整数,
  "summary": "2-3 句，面向 HR 的整体匹配结论",
  "analysis": [
    {
      "text": "1-2 句，说明 JD 某要求与候选人哪段经历/能力对应",
      "buttonText": "4-12 字按钮文案",
      "target": "站内锚点，必须从允许列表中选择"
    }
  ]
}

规则：
- analysis 数组 2-4 条，按与 JD 相关度从高到低排序。
- buttonText 示例：「查看 CareerMod」「查看工作经历」「查看技能卡片」「查看教育经历」。
- target 只能从下列锚点选择：${[...ALLOWED_TARGETS].join(" ")}。
- 若 JD 为空或过短，score 给 0-40，summary 礼貌说明需要完整 JD，analysis 可给 1-2 条引导查看 #about 或 #projects 的通用建议。

站点模块（用于选择 target）：
${navLines}

preferredResultFormat：${JSON.stringify(siteMap.preferredResultFormat)}`;
}

function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("模型返回无法解析为 JSON");
  }
}

function normalizeResult(raw) {
  const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
  const summary = String(raw.summary || "").trim() || "暂无匹配摘要，请结合 JD 与候选人档案人工复核。";
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
      text: "建议先查看候选人项目经历与 AI 产品实践，再对照 JD 核心要求逐项核对。",
      buttonText: "查看项目经历",
      target: "#projects",
    });
  }

  return { score, summary, analysis: items };
}

async function requestChatCompletion(baseUrl, apiKey, model, jd, useJsonMode) {
  const userContent = `【招聘岗位 JD】\n${jd}\n\n【候选人档案 JSON】\n${JSON.stringify(profile, null, 0)}`;
  const body = {
    model,
    temperature: 0.35,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userContent },
    ],
  };
  if (useJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function callNewApi(jd) {
  const baseUrl = (process.env.NEWAPI_BASE_URL || "https://ai.apixyz.cn").replace(/\/$/, "");
  const apiKey = process.env.NEWAPI_API_KEY;
  const model = process.env.NEWAPI_MODEL || "gpt-5.4";

  if (!apiKey) {
    throw new Error("未配置 NEWAPI_API_KEY，请在 ai-matcher/.env 中设置");
  }

  let { response, payload } = await requestChatCompletion(baseUrl, apiKey, model, jd, true);
  const jsonModeRejected =
    !response.ok &&
    /response_format|json_object/i.test(
      String(payload?.error?.message || payload?.message || "")
    );

  if (jsonModeRejected) {
    ({ response, payload } = await requestChatCompletion(baseUrl, apiKey, model, jd, false));
  }

  if (!response.ok) {
    const msg = payload?.error?.message || payload?.message || response.statusText;
    throw new Error(`AI 接口错误 (${response.status}): ${msg}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 接口未返回内容");
  return normalizeResult(extractJson(content));
}

app.post("/api/match", async (req, res) => {
  try {
    const jd = String(req.body?.jd || "").trim();
    if (jd.length < 20) {
      return res.status(400).json({
        error: "请粘贴更完整的职位描述（建议不少于 20 字）",
      });
    }
    if (jd.length > 12000) {
      return res.status(400).json({ error: "职位描述过长，请精简后重试" });
    }

    const result = await callNewApi(jd);
    res.json(result);
  } catch (error) {
    console.error("[api/match]", error);
    res.status(500).json({
      error: error.message || "匹配服务暂时不可用，请稍后重试",
    });
  }
});

app.post("/api/message", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim();
    const text = String(req.body?.text || "").trim();

    if (!text) {
      return res.status(400).json({ error: "请填写留言内容" });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: "留言内容过长，请精简后重试" });
    }
    if (name.length > 40) {
      return res.status(400).json({ error: "昵称过长，请精简后重试" });
    }
    if (email && (!email.includes("@") || !email.includes("."))) {
      return res.status(400).json({ error: "请输入有效的邮箱地址" });
    }

    await sendMessageEmail({ name, email, text });
    res.json({
      ok: true,
      wechatId: WECHAT_ID,
    });
  } catch (error) {
    console.error("[api/message]", error);
    res.status(500).json({
      error: error.message || "留言发送失败，请稍后重试",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: Boolean(process.env.NEWAPI_API_KEY),
    model: process.env.NEWAPI_MODEL || "gpt-5.4",
    hasMessageMail: isMessageMailConfigured(),
    hasWechatId: Boolean(WECHAT_ID),
  });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Portfolio + AI matcher: http://localhost:${port}`);
  console.log(`API: POST http://localhost:${port}/api/match`);
  console.log(`API: POST http://localhost:${port}/api/message`);
  if (!process.env.NEWAPI_API_KEY) {
    console.warn("⚠ 未检测到 NEWAPI_API_KEY，请复制 .env.example 为 .env 并填写密钥");
  }
  if (!isMessageMailConfigured()) {
    console.warn("⚠ 未检测到 SMTP 配置，留言板邮件将无法发送");
  }
});
