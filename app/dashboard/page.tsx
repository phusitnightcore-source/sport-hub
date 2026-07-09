import { LogoutButton } from "@/components/auth/LogoutButton";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        Venue Dashboard (placeholder)
      </h1>
      <LogoutButton />
    </main>
  );
}
