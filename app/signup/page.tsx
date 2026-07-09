import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "สมัครใช้งาน — SportHub",
};

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <div className="card-floating p-8 sm:p-10">
        <h1 className="text-center font-display text-display-md font-semibold text-brand">
          สมัครใช้งาน SportHub
        </h1>
        <p className="mt-1 text-center text-body-sm text-ink-soft">
          ทดลองใช้ Growth Plan ฟรี 14 วัน ไม่ต้องใส่บัตรเครดิต
        </p>
        <div className="mt-8">
          <SignupForm />
        </div>
        <p className="mt-6 text-center text-body-sm text-ink-soft">
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="font-medium text-brand hover:text-brand-dark">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </main>
  );
}
