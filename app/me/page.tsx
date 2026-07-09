import { LogoutButton } from "@/components/auth/LogoutButton";

export default function MemberPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        พื้นที่สมาชิก (placeholder)
      </h1>
      <LogoutButton />
    </main>
  );
}
