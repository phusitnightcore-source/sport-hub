import "server-only";

// SendGrid v3 Mail Send — ช่องทางสำรอง + ใบเสร็จ/Invoice (§14.2)
// ทำงานเฉพาะเมื่อตั้ง SENDGRID_API_KEY + SENDGRID_FROM_EMAIL แล้ว
// ก่อนใส่ key จะคืน { ok:false, unconfigured:true } ("รอใส่ API key" ได้ทันที)

const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

export function emailConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
}

export type EmailResult = { ok: boolean; unconfigured?: boolean; error?: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<EmailResult> {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;
  if (!key || !from) return { ok: false, unconfigured: true };

  try {
    const res = await fetch(SENDGRID_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: from, name: "SportHub" },
        subject: params.subject,
        content: [
          { type: "text/plain", value: params.text },
          ...(params.html ? [{ type: "text/html", value: params.html }] : []),
        ],
      }),
    });
    // SendGrid ตอบ 202 เมื่อรับคิวสำเร็จ
    if (res.status >= 400) {
      const detail = await res.text().catch(() => String(res.status));
      return { ok: false, error: `SendGrid ${res.status}: ${detail}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
