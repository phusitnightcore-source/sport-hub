import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageTransition } from "@/components/ui/PageTransition";
import { getSelfBellData } from "@/lib/notify/bell-data";
import { MemberNav } from "./MemberNav";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name = "";
  let recipientIds: string[] = [];
  let roles: string[] = ["player"];
  let bell: { items: Awaited<ReturnType<typeof getSelfBellData>>["items"]; unread: number } = {
    items: [],
    unread: 0,
  };

  if (user) {
    const admin = createAdminClient();
    const [{ data: profile }, { data: member }, { data: userRoles }] = await Promise.all([
      admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      admin.from("members").select("id").eq("profile_id", user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("profile_id", user.id).eq("is_active", true),
    ]);
    
    name = profile?.full_name ?? user.email?.split("@")[0] ?? "ผู้ใช้";
    recipientIds = member ? [user.id, member.id] : [user.id];
    bell = await getSelfBellData(admin, recipientIds);
    if (userRoles && userRoles.length > 0) {
      roles = userRoles.map(r => r.role);
    }
  }

  return (
    <div className="min-h-screen pb-10">
      {user && (
        <MemberNav
          name={name}
          recipientIds={recipientIds}
          bellItems={bell.items}
          bellUnread={bell.unread}
          roles={roles}
        />
      )}
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
