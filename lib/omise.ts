import "server-only";

// Omise REST client (B2B Subscription — §11) — ใช้ HTTPS API ตรงตามเอกสาร Omise
// ทำงานเฉพาะเมื่อตั้ง OMISE_SECRET_KEY แล้ว — ระหว่าง dev ที่ยังไม่มี key
// ระบบใช้เส้นทาง PromptPay (Super Admin ยืนยันรับชำระเอง) แทน

const OMISE_API = "https://api.omise.co";

export function omiseConfigured(): boolean {
  return Boolean(process.env.OMISE_SECRET_KEY);
}

async function omiseRequest<T>(
  path: string,
  body?: Record<string, string>,
): Promise<T> {
  const secret = process.env.OMISE_SECRET_KEY;
  if (!secret) throw new Error("OMISE_SECRET_KEY ยังไม่ได้ตั้งค่า");
  const res = await fetch(`${OMISE_API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const json = (await res.json()) as T & { object?: string; message?: string };
  if (!res.ok || json.object === "error") {
    throw new Error(`Omise error: ${json.message ?? res.status}`);
  }
  return json;
}

type OmiseCustomer = { id: string };
type OmiseCharge = {
  id: string;
  status: string;
  paid: boolean;
  failure_message: string | null;
};

/** สร้าง Omise customer พร้อมผูกบัตรจาก token (Omise.js ฝั่ง client) */
export async function createCustomerWithCard(params: {
  email: string;
  description: string;
  cardToken: string;
}): Promise<OmiseCustomer> {
  return omiseRequest<OmiseCustomer>("/customers", {
    email: params.email,
    description: params.description,
    card: params.cardToken,
  });
}

/** ตัดบัตรลูกค้าที่ผูกไว้ (จำนวนเป็นสตางค์ ตรงกับหน่วยของ Omise THB) */
export async function chargeCustomer(params: {
  customerId: string;
  amountSatang: number;
  description: string;
}): Promise<OmiseCharge> {
  return omiseRequest<OmiseCharge>("/charges", {
    amount: String(params.amountSatang),
    currency: "thb",
    customer: params.customerId,
    description: params.description,
  });
}
