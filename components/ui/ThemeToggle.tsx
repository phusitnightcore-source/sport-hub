"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

function readTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

// ปุ่มสลับโหมดสว่าง/มืด — เขียน data-theme บน <html> + จำใน localStorage
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const syncTheme = () => setTheme(readTheme());
    syncTheme();
    setIsReady(true);

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  function toggle() {
    // Read the document at click time so the toggle stays correct when another
    // surface (or the no-FOUC script) changes the theme before hydration ends.
    const next = readTheme() === "dark" ? "light" : "dark";
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
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      data-theme-ready={isReady ? "true" : "false"}
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
