import { redirect } from "next/navigation";
import { createClient } from "@/lib/badminton/supabase/server";

export default async function BadmintonAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/badminton-group/dashboard/admin/events");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || profile.role !== "venue_admin") {
    redirect("/badminton-group/dashboard");
  }

  return children;
}
