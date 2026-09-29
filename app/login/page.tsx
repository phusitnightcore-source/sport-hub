import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/ui/AuthShell";
import { LineLoginButton } from "@/components/ui/LineLoginButton";
import { lineLoginConfigured } from "@/lib/line-login";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ — SportHub",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <AuthShell
      title="ยินดีต้อนรับกลับ"
      subtitle="เข้าสู่ระบบเพื่อจัดการสนามของคุณ"
      footer={
        <>
          ยังไม่มีบัญชี?{" "}
          <Link href="/signup" className="font-medium text-brand hover:text-brand-dark">
            สมัครใช้งานฟรี
          </Link>
        </>
      }
    >
      {lineLoginConfigured() && <LineLoginButton />}
      <LoginForm redirect={redirect} />
    </AuthShell>
  );
}
