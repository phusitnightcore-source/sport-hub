import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createMemberQrToken } from "@/lib/membership/qr";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = new URL(request.url).searchParams.get("memberId");
  const parsed = z.string().uuid().safeParse(memberId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid member" }, { status: 400 });
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", parsed.data)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = createMemberQrToken(member.id);
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
