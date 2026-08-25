"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin, Search, SlidersHorizontal, Trophy, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Branch = {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  openTime: string | null;
  closeTime: string | null;
  courtCount: number;
  sports: string[];
  hasIndoor: boolean;
  hasOutdoor: boolean;
  lowestPrice: number | null;
};
type Facility = { 
  id: string; 
  name: string; 
  address: string | null; 
  logoUrl: string | null; 
  ratingAvg: number | null;
  reviewCount: number;
  branches: Branch[] 
};
type Location = { latitude: number; longitude: number };

function distanceKm(from: Location, branch: Branch) {
  if (branch.latitude === null || branch.longitude === null) return null;
  const radius = 6371;
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(branch.latitude - from.latitude);
  const dLon = radians(branch.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(branch.latitude)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function baht(value: number | null) {
  return value === null ? "-" : new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
}

function isOpenNow(openTime: string | null, closeTime: string | null) {
  if (!openTime || !closeTime) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [oH, oM] = openTime.split(':').map(Number);
  const [cH, cM] = closeTime.split(':').map(Number);
  const openMinutes = oH * 60 + oM;
  const closeMinutes = cH * 60 + cM;

  if (closeMinutes < openMinutes) {
    // Crosses midnight
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

export function FacilityDirectory() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("");
  const [ratingFilter, setRatingFilter] = useState("0");
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [indoorFilter, setIndoorFilter] = useState(""); // "" = all, "indoor", "outdoor"
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      try {
        const response = await fetch(`/api/facilities?${params.toString()}`, { signal: controller.signal });
        const json = await response.json();
        if (!json.success) throw new Error(json.error?.message ?? "ไม่สามารถค้นหาสนามได้");
        setFacilities(json.data.facilities ?? []);
        setError(null);
      } catch (cause) {
        if ((cause as Error).name !== "AbortError") setError("ไม่สามารถค้นหาสนามได้ กรุณาลองใหม่");
      } finally {
        setLoading(false);
      }
    }
    const timer = window.setTimeout(load, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  const sports = useMemo(() => [...new Set(facilities.flatMap((facility) => facility.branches.flatMap((branch) => branch.sports)))].sort(), [facilities]);
  
  const rows = useMemo(() => {
    return facilities.flatMap((facility) => {
      // Filter by rating
      const minRating = Number(ratingFilter);
      if (minRating > 0 && (Number(facility.ratingAvg) < minRating)) {
        return [];
      }

      return facility.branches.filter((branch) => {
        // Filter by sport
        if (sport && !branch.sports.includes(sport)) return false;
        
        // Filter by Open Now
        if (openNowFilter && !isOpenNow(branch.openTime, branch.closeTime)) return false;

        // Filter by Indoor/Outdoor
        if (indoorFilter === "indoor" && !branch.hasIndoor) return false;
        if (indoorFilter === "outdoor" && !branch.hasOutdoor) return false;

        return true;
      }).map((branch) => ({ 
        facility, 
        branch, 
        distance: location ? distanceKm(location, branch) : null 
      }));
    }).sort((a, b) => {
      if (location) {
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      }
      return a.facility.name.localeCompare(b.facility.name, "th");
    });
  }, [facilities, location, sport, ratingFilter, openNowFilter, indoorFilter]);

  function requestLocation() {
    if (location) {
      // Toggle off
      setLocation(null);
      return;
    }
    if (!navigator.geolocation) return setError("เบราว์เซอร์นี้ไม่รองรับการค้นหาจากตำแหน่ง");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocating(false); setError(null); },
      () => { setLocating(false); setError("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาอนุญาต Location ในเบราว์เซอร์"); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-body-sm font-medium text-brand"><Trophy className="h-4 w-4" />Sports Hub Marketplace</span>
        <h1 className="mt-5 font-display text-display-lg font-bold text-ink">ค้นหาสนามที่ใช่ ใกล้คุณ</h1>
        <p className="mt-3 text-body text-ink-soft">เลือกกีฬา ค้นหาสถานที่ และเช็กสนามที่เปิดจองได้ทันที</p>
      </header>

      <section className="mx-auto mt-8 flex max-w-5xl flex-col gap-4">
        {/* Main Search Bar */}
        <div className="card-floating flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อสนาม จังหวัด หรือประเภทกีฬา" className="w-full rounded-sm bg-surface py-3 pl-10 pr-3 text-body text-ink outline-none ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand" />
          </div>
          <Button variant={location ? "secondary" : "primary"} onClick={requestLocation} disabled={locating} className="w-full sm:w-auto h-[50px]">
            <LocateFixed className="h-4 w-4" />{locating ? "กำลังค้นหา..." : location ? "ใกล้ฉัน (เปิดอยู่)" : "ใกล้ฉัน"}
          </Button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-radius-md bg-surface p-4 ring-1 ring-inset ring-line">
          <SlidersHorizontal className="h-5 w-5 text-ink-soft mr-2 hidden sm:block" />
          
          <select value={sport} onChange={(event) => setSport(event.target.value)} className="rounded-sm border-line bg-white px-3 py-2 text-body-sm outline-none ring-1 ring-inset ring-line">
            <option value="">กีฬาทั้งหมด</option>
            {sports.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>

          <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)} className="rounded-sm border-line bg-white px-3 py-2 text-body-sm outline-none ring-1 ring-inset ring-line">
            <option value="0">คะแนนรีวิวทั้งหมด</option>
            <option value="4">4 ดาวขึ้นไป</option>
            <option value="3">3 ดาวขึ้นไป</option>
          </select>

          <select value={indoorFilter} onChange={(event) => setIndoorFilter(event.target.value)} className="rounded-sm border-line bg-white px-3 py-2 text-body-sm outline-none ring-1 ring-inset ring-line">
            <option value="">ในร่ม/กลางแจ้ง</option>
            <option value="indoor">ในร่ม (Indoor)</option>
            <option value="outdoor">กลางแจ้ง (Outdoor)</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer ml-auto">
            <input type="checkbox" checked={openNowFilter} onChange={(e) => setOpenNowFilter(e.target.checked)} className="h-4 w-4 text-brand rounded border-line focus:ring-brand" />
            <span className="text-body-sm text-ink flex items-center gap-1"><Clock className="h-4 w-4" />เปิดอยู่ตอนนี้</span>
          </label>
        </div>
      </section>

      {error && <p role="alert" className="mx-auto mt-4 max-w-4xl text-body-sm text-danger">{error}</p>}
      
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <div key={index} className="card-floating h-56 animate-pulse bg-surface/70" />)
        ) : rows.length === 0 ? (
          <div className="card-floating col-span-full p-12 text-center text-body text-ink-soft">ยังไม่พบสนามตามเงื่อนไขที่เลือก</div>
        ) : rows.map(({ facility, branch, distance }) => (
          <Link key={branch.id} href={`/facility/${facility.id}`} className="card-floating group flex flex-col gap-4 p-5 transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-body-lg font-semibold text-ink group-hover:text-brand">{facility.name}</h2>
                <p className="mt-1 text-body-sm text-ink-soft">{branch.name}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {distance !== null && (
                  <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 font-mono text-mono-sm text-brand">
                    {distance < 1 ? `${Math.round(distance * 1000)} ม.` : `${distance.toFixed(1)} กม.`}
                  </span>
                )}
                {Number(facility.ratingAvg) > 0 && (
                  <div className="flex items-center gap-1 text-mono-sm font-semibold text-ink">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {Number(facility.ratingAvg).toFixed(1)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-2 text-body-sm text-ink-soft">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{branch.address || branch.province || facility.address || "ดูรายละเอียดสาขา"}</span>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {branch.sports.map((value) => <span key={value} className="rounded-full bg-surface px-2.5 py-1 text-mono-sm text-ink-soft ring-1 ring-inset ring-line">{value}</span>)}
            </div>
            
            <div className="mt-auto flex items-end justify-between border-t border-line pt-3">
              <div className="flex flex-col gap-1">
                <span className="text-body-sm text-ink-soft">{branch.courtCount} คอร์ท</span>
                {branch.openTime && branch.closeTime && (
                  <span className="text-[11px] text-ink-soft flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {branch.openTime.slice(0, 5)} - {branch.closeTime.slice(0, 5)}
                  </span>
                )}
              </div>
              <span className="text-body-sm font-semibold text-success">เริ่ม ฿{baht(branch.lowestPrice)}/ชม.</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
