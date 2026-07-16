import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WriteForm } from "./WriteForm";

export const metadata = { title: "เขียนบทความ — SportHub Blog" };
export const dynamic = "force-dynamic";

export default async function WritePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/blog/write");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-display-md font-semibold text-ink">
          เขียนบทความ
        </h1>
        <p className="text-body-sm text-ink-soft">
          แบ่งปันรีวิว/เทคนิคกีฬา — บทความจะเผยแพร่หลังทีมงานตรวจ
        </p>
      </div>
      <WriteForm />
    </div>
  );
}
