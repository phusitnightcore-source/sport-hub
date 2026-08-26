"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Check,
  Dumbbell,
  GraduationCap,
  Users,
  Trophy,
  Receipt,
  Building,
  BarChart3,
  BookOpen
} from "lucide-react";

const SEARCH_TABS = [
  { id: "courts", label: "จองสนาม", icon: Dumbbell, placeholder: "ค้นหาชื่อสนาม, กีฬา หรือทำเล...", action: "/discover", keyParam: "q" },
  { id: "coaches", label: "หาโค้ช", icon: GraduationCap, placeholder: "ค้นหาชื่อโค้ช, กีฬาที่ต้องการเรียน...", action: "/coaches", keyParam: "q" },
  { id: "groups", label: "หาก๊วนกีฬา", icon: Users, placeholder: "ค้นหาก๊วนตามกีฬา, วันเวลา หรือสถานที่...", action: "/groups", keyParam: "q" },
  { id: "tournaments", label: "การแข่งขัน", icon: Trophy, placeholder: "ค้นหาทัวร์นาเมนต์, ลีก, หรือระดับฝีมือ...", action: "/tournaments", keyParam: "q" },
  { id: "track", label: "เช็คการจอง", icon: Receipt, placeholder: "กรอกรหัสการจอง เช่น BK-2026-XXXX...", action: "/track", keyParam: "code" },
];

const LOCATIONS = [
  { value: "", label: "ทุกทำเล / ใกล้ฉัน (GPS)" },
  { value: "bkk", label: "กรุงเทพฯ และปริมณฑล" },
  { value: "cm", label: "เชียงใหม่" },
  { value: "pky", label: "ภูเก็ต" },
  { value: "chon", label: "ชลบุรี / พัทยา" },
  { value: "korat", label: "นครราชสีมา" },
  { value: "khonkaen", label: "ขอนแก่น" },
];

const QUICK_SERVICE_TILES = [
  { href: "/discover", label: "จองสนาม", icon: Dumbbell, desc: "ว่าง 24 ชม.", color: "text-brand bg-brand-soft border-brand/20" },
  { href: "/coaches", label: "หาโค้ช", icon: GraduationCap, desc: "เทรนเนอร์มือโปร", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40" },
  { href: "/groups", label: "ก๊วนกีฬา", icon: Users, desc: "หาเพื่อนเล่น", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40" },
  { href: "/tournaments", label: "แข่งขัน", icon: Trophy, desc: "สะสม Elo", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40" },
  { href: "/leaderboard", label: "ตารางอันดับ", icon: BarChart3, desc: "Top Rank", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/40" },
  { href: "/track", label: "เช็คการจอง", icon: Receipt, desc: "ตรวจสลิป/ตั๋ว", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900/40" },
  { href: "/blog", label: "บทความ", icon: BookOpen, desc: "ทริคกีฬา", color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/40" },
  { href: "/business", label: "สำหรับสนาม", icon: Building, desc: "Venue Suite", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40" },
];

export function LandingHeroSearch() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("courts");
  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  const currentTabConfig = SEARCH_TABS.find((t) => t.id === activeTab) || SEARCH_TABS[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setIsLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set(currentTabConfig.keyParam, query.trim());
    }
    if (selectedLocation.value && activeTab === "courts") {
      params.set("location", selectedLocation.value);
    }
    const targetUrl = `${currentTabConfig.action}${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(targetUrl);
  }

  return (
    <div className="mx-auto mt-8 max-w-4xl">
      {/* 1. Quick Service Tabs right on Hero Search */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-3">
        {SEARCH_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setQuery("");
              }}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-body-sm font-bold transition-all duration-base shrink-0 ${
                isActive
                  ? "bg-brand text-white shadow-md shadow-brand/25 scale-105"
                  : "bg-surface/80 text-ink-soft border border-line hover:border-brand/30 hover:bg-brand-soft/50 hover:text-ink"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-brand"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Interactive Search Box Card */}
      <div className="mt-2 rounded-3xl border border-line bg-surface/90 p-4 shadow-xl backdrop-blur-md transition-all">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Keyword Search Input */}
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-xs focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 transition-all">
            <Search className="h-5 w-5 text-brand shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={currentTabConfig.placeholder}
              className="w-full border-none bg-transparent text-body font-medium text-ink outline-none placeholder:text-ink-soft"
            />
          </div>

          {/* Custom Location Dropdown (Only for Courts search) */}
          {activeTab === "courts" && (
            <div ref={locationRef} className="relative sm:w-64">
              <button
                type="button"
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                className="flex w-full items-center justify-between gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left text-body-sm font-semibold text-ink shadow-xs transition-all hover:border-brand/40 focus:border-brand focus:ring-4 focus:ring-brand/10"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MapPin className="h-4 w-4 text-warning shrink-0" />
                  <span className="truncate">{selectedLocation.label}</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-ink-soft shrink-0 transition-transform duration-fast ${
                    isLocationOpen ? "rotate-180 text-brand" : ""
                  }`}
                />
              </button>

              {/* Dropdown Popover */}
              {isLocationOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-2xl backdrop-blur-md no-scrollbar animate-in fade-in-0 zoom-in-95 duration-fast">
                  {LOCATIONS.map((loc) => {
                    const isSelected = selectedLocation.value === loc.value;
                    return (
                      <button
                        key={loc.value}
                        type="button"
                        onClick={() => {
                          setSelectedLocation(loc);
                          setIsLocationOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-body-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-brand text-white font-bold"
                            : "text-ink hover:bg-brand-soft hover:text-brand"
                        }`}
                      >
                        <span className="truncate">{loc.label}</span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Search CTA Button */}
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-4 font-display text-body font-bold text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-dark hover:scale-[1.02] active:scale-95 sm:w-auto w-full shrink-0 cursor-pointer"
          >
            <span>ค้นหาทันที</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        {/* Quick Filter Tags */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-line/60 text-[12px] text-ink-soft">
          <span className="font-semibold text-ink">ค้นหายอดนิยม:</span>
          <Link href="/discover?sport=badminton" className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink-soft hover:border-brand/40 hover:bg-brand-soft hover:text-brand transition-colors">
            🏸 แบดมินตัน
          </Link>
          <Link href="/discover?sport=football" className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink-soft hover:border-brand/40 hover:bg-brand-soft hover:text-brand transition-colors">
            ⚽ ฟุตบอล 7 คน
          </Link>
          <Link href="/coaches" className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink-soft hover:border-brand/40 hover:bg-brand-soft hover:text-brand transition-colors">
            👨‍🏫 หาโค้ชเทนนิส
          </Link>
          <Link href="/groups" className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink-soft hover:border-brand/40 hover:bg-brand-soft hover:text-brand transition-colors">
            👥 ก๊วนบาสเกตบอล
          </Link>
          <Link href="/tournaments" className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink-soft hover:border-brand/40 hover:bg-brand-soft hover:text-brand transition-colors">
            🏆 ลีกปิงปอง
          </Link>
        </div>
      </div>

      {/* 3. Quick Access Services Grid Tiles right on Home Page */}
      <div className="mt-8">
        <p className="text-center text-[12px] font-bold uppercase tracking-wider text-ink-soft/70 mb-3">
          เมนูบริการด่วน (Quick Access Hub)
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {QUICK_SERVICE_TILES.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex flex-col items-center justify-center rounded-2xl border bg-surface/80 p-3.5 text-center shadow-xs transition-all duration-base hover:-translate-y-1 hover:border-brand/40 hover:shadow-md ${item.color}`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110 mb-1.5">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-display text-body-sm font-bold text-ink group-hover:text-brand transition-colors truncate w-full">
                  {item.label}
                </span>
                <span className="text-[10px] font-medium text-ink-soft truncate w-full">
                  {item.desc}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
