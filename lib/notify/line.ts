import "server-only";

// LINE Messaging API — push message (§14.2 ช่องทางหลัก)
// ทำงานเฉพาะเมื่อตั้ง LINE_CHANNEL_ACCESS_TOKEN แล้ว — ก่อนใส่ key จะคืน
// { ok:false, unconfigured:true } เพื่อให้ dispatcher ข้ามไป fallback ได้อย่างสวยงาม
// (ออกแบบให้ "รอใส่ API key" ได้ทันทีโดยไม่พังระบบ)

const LINE_PUSH_API = "https://api.line.me/v2/bot/message/push";

export function lineConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
}

export type LineResult = { ok: boolean; unconfigured?: boolean; error?: string };

/** ส่งข้อความ text หา LINE userId ปลายทาง (ต้อง add เพื่อนเพจก่อน) */
export async function pushLineMessage(params: {
  to: string;
  text: string;
}): Promise<LineResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, unconfigured: true };

  try {
    const res = await fetch(LINE_PUSH_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.to,
        messages: [{ type: "text", text: params.text.slice(0, 5000) }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => String(res.status));
      return { ok: false, error: `LINE ${res.status}: ${detail}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
