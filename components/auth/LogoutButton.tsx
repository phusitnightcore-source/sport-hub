"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await createClient().auth.signOut();
    window.location.assign("/login");
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleLogout} disabled={loading}>
      <LogOut aria-hidden className="h-4 w-4" />
      ออกจากระบบ
    </Button>
  );
}
