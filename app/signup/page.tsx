import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/ui/AuthShell";
import { LineLoginButton } from "@/components/ui/LineLoginButton";
import { lineLoginConfigured } from "@/lib/line-login";
import { SignupSwitch } from "./SignupSwitch";

export const metadata: Metadata = {
  title: "สมัครใช้งาน — SportHub",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="เริ่มต้นใช้งานฟรี"
      subtitle="ทดลอง Growth Plan ฟรี 14 วัน ไม่ต้องใส่บัตรเครดิต"
      footer={
        <>
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="font-medium text-brand hover:text-brand-dark">
            เข้าสู่ระบบ
          </Link>
        </>
      }
    >
      {lineLoginConfigured() && <LineLoginButton label="สมัครด้วย LINE (ผู้ใช้ทั่วไป)" />}
      <SignupSwitch />
    </AuthShell>
  );
}
