"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

// อ่าน data-theme บน <html> แบบ reactive (ไม่ setState ใน effect) ผ่าน MutationObserver
function subscribe(callback: () => void) {
  const obs = new MutationObserver(callback);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => obs.disconnect();
}
function getSnapshot(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}
function getServerSnapshot(): "light" | "dark" {
  return "light";
}

// ปุ่มสลับโหมดสว่าง/มืด — เขียน data-theme บน <html> + จำใน localStorage
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* localStorage อาจถูกปิด — ไม่เป็นไร */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-soft shadow-sm ring-1 ring-inset ring-line transition-colors duration-fast hover:text-brand " +
        (className ?? "")
      }
    >
      {theme === "dark" ? (
        <Sun aria-hidden className="h-[18px] w-[18px]" />
      ) : (
        <Moon aria-hidden className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
