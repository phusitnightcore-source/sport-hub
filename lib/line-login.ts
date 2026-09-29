import "server-only";

// LINE Login (OAuth 2.1 / OIDC) helper สำหรับผู้ใช้ทั่วไป — สมัคร/ล็อกอิน/เชื่อมต่อบัญชีด้วย LINE
// ออกแบบให้ "รอใส่ key" ได้: ถ้ายังไม่ตั้ง channel id/secret → lineLoginConfigured() = false
// แล้ว route จะ redirect กลับพร้อม error อย่างสวยงาม (ไม่ crash)

const AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export function lineLoginConfigured(): boolean {
  return Boolean(
    process.env.LINE_LOGIN_CHANNEL_ID && process.env.LINE_LOGIN_CHANNEL_SECRET,
  );
}

function appBaseUrl(): string {
  // ใช้ || (ไม่ใช่ ??) เพื่อให้ค่าว่าง ("") fallback เป็น localhost ด้วย ไม่ใช่แค่ undefined
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function lineRedirectUri(): string {
  return `${appBaseUrl()}/api/auth/line/callback`;
}

/**
 * URL ให้ผู้ใช้ไปอนุญาตที่ LINE — default scope = "openid profile" (มีทุก channel)
 * scope "email" ต้องยื่นขออนุมัติในคอนโซลก่อน ถ้าใส่ทั้งที่ไม่มีสิทธิ์ LINE จะ reject ทั้ง flow
 * → เปิดได้ภายหลังด้วย env LINE_LOGIN_SCOPE_EMAIL=true (เราใช้ synthetic email อยู่แล้วจึงไม่บังคับ)
 */
export function buildLineAuthorizeUrl(state: string): string {
  const scope =
    process.env.LINE_LOGIN_SCOPE_EMAIL === "true"
      ? "openid profile email"
      : "openid profile";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    redirect_uri: lineRedirectUri(),
    state,
    scope,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

type LineTokens = { access_token?: string; id_token?: string };

/** แลก authorization code → tokens (มี id_token สำหรับดึงโปรไฟล์) */
export async function exchangeLineCode(code: string): Promise<LineTokens | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: lineRedirectUri(),
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as LineTokens;
}

export type LineProfile = {
  userId: string;
  name: string | null;
  email: string | null;
  picture: string | null;
};

/** verify id_token กับ LINE แล้วคืน claims (sub = LINE userId) */
export async function verifyLineIdToken(idToken: string): Promise<LineProfile | null> {
  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    }),
  });
  if (!res.ok) return null;
  const c = (await res.json()) as {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
  };
  if (!c.sub) return null;
  return {
    userId: c.sub,
    name: c.name ?? null,
    email: c.email ?? null,
    picture: c.picture ?? null,
  };
}

/** อีเมลสังเคราะห์เป็น "ตัวตน" ของบัญชี auth ที่สมัครด้วย LINE — กัน collision/takeover กับอีเมลจริง */
export function syntheticLineEmail(lineUserId: string): string {
  return `line_${lineUserId}@line.sporthub.local`;
}
