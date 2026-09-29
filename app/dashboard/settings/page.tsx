import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Building2, QrCode, MessageCircle, Volume2 } from "lucide-react";
import type { NotifSoundType } from "@/lib/sounds";
import { SettingsForm } from "./SettingsForm";
import { PromptpayQrUploader } from "./PromptpayQrUploader";
import { LineOaForm } from "./LineOaForm";
import { NotificationSoundsForm } from "./NotificationSoundsForm";
import { SettingsTabs } from "./SettingsTabs";

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

  // เสียงแจ้งเตือนที่สนามอัปโหลด → signed URL สำหรับปุ่มทดลองฟัง
  const soundPaths =
    (settings.notification_sounds as Record<string, string | undefined> | undefined) ?? {};
  const customSounds: Partial<Record<NotifSoundType, string>> = {};
  for (const [type, path] of Object.entries(soundPaths)) {
    if (!path) continue;
    const { data: signed } = await admin.storage
      .from("tenant-media")
      .createSignedUrl(path, 3600);
    if (signed?.signedUrl) customSounds[type as NotifSoundType] = signed.signedUrl;
  }

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

      <SettingsTabs
        tabs={[
          {
            id: "general",
            label: "ข้อมูลสนาม",
            icon: <Building2 className="h-4 w-4" />,
            panel: (
              <SettingsForm
                tenant={{
                  name: tenant.name,
                  owner_name: tenant.owner_name,
                  phone: tenant.phone,
                  email: tenant.email,
                  address: tenant.address,
                  promptpay_id: tenant.promptpay_id,
                  tax_id: tenant.tax_id,
                  auto_approve_slip: settings.auto_approve_slip === true,
                }}
              />
            ),
          },
          {
            id: "payment",
            label: "การรับชำระเงิน",
            icon: <QrCode className="h-4 w-4" />,
            panel: (
              <PromptpayQrUploader
                currentQr={
                  typeof settings.promptpay_qr === "string" ? settings.promptpay_qr : null
                }
              />
            ),
          },
          {
            id: "line",
            label: "เชื่อมต่อ LINE",
            icon: <MessageCircle className="h-4 w-4" />,
            panel: (
              <LineOaForm
                connected={Boolean(lineOa?.connected && lineToken)}
                tokenLast4={lineToken ? lineToken.slice(-4) : undefined}
                friendUrl={lineOa?.oa_friend_url ?? undefined}
                webhookUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/line/webhook/${ctx.tenantId}`}
              />
            ),
          },
          {
            id: "sounds",
            label: "เสียงแจ้งเตือน",
            icon: <Volume2 className="h-4 w-4" />,
            panel: <NotificationSoundsForm custom={customSounds} />,
          },
        ]}
      />
    </main>
  );
}
