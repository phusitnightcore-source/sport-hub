import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsForm } from "./SettingsForm";
import { PromptpayQrUploader } from "./PromptpayQrUploader";
import { LineOaForm } from "./LineOaForm";

// ตั้งค่าสนามแบบรวม (§23)
export default async function SettingsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("name, owner_name, phone, email, address, promptpay_id, tax_id, settings")
    .eq("id", ctx.tenantId)
    .single();

  if (!tenant) redirect("/login");

  const settings = (tenant.settings as Record<string, unknown> | null) ?? {};
  const lineOa = settings.line_oa as
    | { channel_access_token?: string; connected?: boolean; oa_friend_url?: string }
    | undefined;
  const lineToken = lineOa?.channel_access_token ?? "";

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">
          ตั้งค่า
        </h1>
        <p className="text-body-sm text-ink-soft">
          ข้อมูลสนาม การรับชำระเงิน และค่าตั้งต้นของระบบ
        </p>
      </div>

      <SettingsForm
        tenant={{
          name: tenant.name,
          owner_name: tenant.owner_name,
          phone: tenant.phone,
          email: tenant.email,
          address: tenant.address,
          promptpay_id: tenant.promptpay_id,
          tax_id: tenant.tax_id,
          slot_lock_minutes:
            typeof settings.slot_lock_minutes === "number"
              ? settings.slot_lock_minutes
              : 30,
          auto_approve_slip: settings.auto_approve_slip === true,
        }}
      />

      <LineOaForm
        connected={Boolean(lineOa?.connected && lineToken)}
        tokenLast4={lineToken ? lineToken.slice(-4) : undefined}
        friendUrl={lineOa?.oa_friend_url ?? undefined}
        webhookUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/line/webhook/${ctx.tenantId}`}
      />

      <PromptpayQrUploader
        currentQr={
          typeof settings.promptpay_qr === "string" ? settings.promptpay_qr : null
        }
      />
    </main>
  );
}
