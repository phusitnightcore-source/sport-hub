"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    // signOut (scope global) revoke refresh token ฝั่งเซิร์ฟเวอร์ด้วย
    await createClient().auth.signOut();
    // replace ไม่ทิ้งหน้าที่ auth ไว้ใน history + reload ล้างสถานะที่ค้างในหน่วยความจำ
    window.location.replace("/login");
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleLogout} disabled={loading}>
      <LogOut aria-hidden className="h-4 w-4" />
      ออกจากระบบ
    </Button>
  );
}
