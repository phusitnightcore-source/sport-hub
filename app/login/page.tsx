import type { Metadata } from "next";
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
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card-floating w-full max-w-sm p-10">
        <h1 className="text-center font-display text-display-md font-semibold text-brand">
          SportHub
        </h1>
        <p className="mt-1 text-center text-body-sm text-ink-soft">
          เข้าสู่ระบบเพื่อจัดการสนามของคุณ
        </p>
        <div className="mt-8">
          <LoginForm redirect={redirect} />
        </div>
      </div>
    </main>
  );
}
