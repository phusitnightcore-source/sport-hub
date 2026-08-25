"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type SettingsTab = {
  id: string;
  label: string;
  icon: React.ReactNode;
  panel: React.ReactNode;
};

// แท็บของหน้าตั้งค่า — คลิกสลับ section (client state คงอยู่แม้ router.refresh หลังบันทึก/อัปโหลด)
export function SettingsTabs({ tabs }: { tabs: SettingsTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="หมวดการตั้งค่า"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {tabs.map((t) => {
          const isActive = t.id === current.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-body-sm font-medium transition-all duration-fast",
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "bg-surface text-ink-soft shadow-sm hover:text-brand hover:shadow-md",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div key={current.id} className="animate-slide-fade-in">
        {current.panel}
      </div>
    </div>
  );
}
