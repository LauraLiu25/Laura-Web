import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 465);
  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
}

export function isMessageMailConfigured() {
  return Boolean(getSmtpConfig() && (process.env.MESSAGE_TO || process.env.SMTP_USER));
}

export async function sendMessageEmail({ name, email, text }) {
  const smtp = getSmtpConfig();
  if (!smtp) {
    throw new Error("未配置邮件服务，请在 ai-matcher/.env 中设置 SMTP_* 与 MESSAGE_TO");
  }

  const displayName = String(name || "").trim() || "匿名访客";
  const to = process.env.MESSAGE_TO || process.env.SMTP_USER;
  const transporter = nodemailer.createTransport(smtp);
  const submittedAt = new Date().toLocaleString("zh-CN", { hour12: false });

  await transporter.sendMail({
    from: `"个人网站留言板" <${smtp.auth.user}>`,
    to,
    replyTo: email || undefined,
    subject: `[个人网站留言] ${displayName}`,
    text: [
      "你收到一条来自个人网站留言板的新消息：",
      "",
      `昵称：${displayName}`,
      `联系方式：${email || "未填写"}`,
      `提交时间：${submittedAt}`,
      "",
      "留言内容：",
      text,
    ].join("\n"),
    html: `
      <div style="font-family:Georgia,'Times New Roman',serif;color:#222;line-height:1.65;">
        <p>你收到一条来自<strong>个人网站留言板</strong>的新消息：</p>
        <p><strong>昵称：</strong>${escapeHtml(displayName)}</p>
        <p><strong>联系方式：</strong>${escapeHtml(email || "未填写")}</p>
        <p><strong>提交时间：</strong>${escapeHtml(submittedAt)}</p>
        <p><strong>留言内容：</strong></p>
        <p style="white-space:pre-wrap;background:#f8f7f4;padding:12px 14px;border-radius:10px;">${escapeHtml(text)}</p>
      </div>
    `,
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
