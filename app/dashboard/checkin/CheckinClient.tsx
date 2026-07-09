"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { findMemberForCheckin, processCheckin, CheckinQueryType } from "./actions";
import { QrCode, Search, CheckCircle2, XCircle, User } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";

type MemberResult = {
  member: {
    id: string;
    member_number: string;
    first_name: string;
    last_name: string | null;
    status: string;
    end_date: string | null;
    sessions_used: number;
    packages: { name: string; type: string; sessions_limit: number | null } | null;
  };
  isValid: boolean;
  failReason: string | null;
};

export function CheckinClient({ branches }: { branches: { id: string; name: string }[] }) {
  const [activeTab, setActiveTab] = useState<CheckinQueryType>("qr");
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  
  const [loading, setLoading] = useState(false);
  const [memberResult, setMemberResult] = useState<MemberResult | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<"idle" | "success" | "error">("idle");
  const [checkinMessage, setCheckinMessage] = useState("");
  
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the QR input when switching to QR tab
  useEffect(() => {
    if (activeTab === "qr" && qrInputRef.current) {
      qrInputRef.current.focus();
    }
    // Avoid synchronous state updates during render phase by using setTimeout
    const timeout = setTimeout(() => {
      setMemberResult(null);
      setCheckinStatus("idle");
      setQuery("");
    }, 0);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setCheckinStatus("idle");
    setMemberResult(null);

    const res = await findMemberForCheckin(query, activeTab);
    
    if (res.success && res.member) {
      setMemberResult(res);
      // If using QR scanner, we might want to automatically check-in if valid, 
      // but manual confirmation is safer for MVP.
    } else {
      setCheckinStatus("error");
      setCheckinMessage(res.error || "ไม่พบข้อมูลสมาชิก");
    }
    
    setLoading(false);
    // Clear query if QR so it's ready for the next scan
    if (activeTab === "qr") {
      setQuery("");
      if (qrInputRef.current) qrInputRef.current.focus();
    }
  }

  async function handleConfirmCheckin() {
    if (!memberResult?.member || !branchId) return;

    setLoading(true);
    const res = await processCheckin(memberResult.member.id, branchId);
    
    if (res.success) {
      setCheckinStatus("success");
      setCheckinMessage("เช็คอินสำเร็จ!");
      // Optionally clear after 3 seconds
      setTimeout(() => {
        setMemberResult(null);
        setCheckinStatus("idle");
        if (activeTab === "qr" && qrInputRef.current) qrInputRef.current.focus();
      }, 3000);
    } else {
      setCheckinStatus("error");
      setCheckinMessage(res.error || "เกิดข้อผิดพลาดในการเช็คอิน");
    }
    setLoading(false);
  }

  const branchOptions = branches.map(b => ({ value: b.id, label: b.name }));

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left Column: Input */}
      <div className="card-floating flex flex-col p-6 lg:w-1/3">
        {branches.length > 1 && (
          <div className="mb-6 z-30">
            <label className="mb-1 block text-body-sm font-medium text-ink">เลือกสาขาที่เช็คอิน</label>
            <Select 
              name="branchId" 
              options={branchOptions} 
              value={branchId}
              onChange={(val) => setBranchId(val)}
            />
          </div>
        )}

        <div className="mb-6 flex rounded-lg bg-surface p-1">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-body-sm font-medium transition-colors ${
              activeTab === "qr" ? "bg-white text-brand shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
            onClick={() => setActiveTab("qr")}
          >
            <QrCode className="mx-auto mb-1 h-5 w-5" />
            สแกน QR
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-body-sm font-medium transition-colors ${
              activeTab === "phone" ? "bg-white text-brand shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
            onClick={() => setActiveTab("phone")}
          >
            <Search className="mx-auto mb-1 h-5 w-5" />
            ค้นหาเบอร์โทร
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          {activeTab === "qr" ? (
            <div>
              <label className="mb-1 block text-body-sm font-medium text-ink">รหัสจาก QR Code (สแกนบาร์โค้ด)</label>
              <input
                ref={qrInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="คลิกที่นี่แล้วสแกน QR..."
                className="w-full rounded-md border border-line bg-surface p-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand"
                autoComplete="off"
                autoFocus
              />
              <p className="mt-2 text-xs text-ink-soft">
                เชื่อมต่อเครื่องสแกนบาร์โค้ดแบบ USB/Bluetooth แล้วสแกนได้เลย ระบบจะค้นหาอัตโนมัติเมื่อกด Enter
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-body-sm font-medium text-ink">เบอร์โทรศัพท์ลูกค้า</label>
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="เช่น 0812345678"
                className="w-full"
              />
            </div>
          )}
          
          <Button type="submit" variant="primary" disabled={loading || !query} className="w-full">
            {loading ? "กำลังค้นหา..." : "ค้นหา"}
          </Button>
        </form>
      </div>

      {/* Right Column: Result */}
      <div className="flex-1">
        {!memberResult && checkinStatus === "idle" && (
          <div className="card-floating flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center text-ink-soft">
            <QrCode className="mb-4 h-16 w-16 opacity-20" />
            <p className="text-body-lg">รอการสแกน QR Code หรือค้นหาสมาชิก...</p>
          </div>
        )}

        {checkinStatus === "error" && !memberResult && (
          <div className="card-floating flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center">
            <XCircle className="mb-4 h-16 w-16 text-danger" />
            <h3 className="text-body-lg font-bold text-danger">ไม่สามารถเช็คอินได้</h3>
            <p className="mt-2 text-ink-soft">{checkinMessage}</p>
          </div>
        )}

        {memberResult?.member && (
          <div className="card-floating overflow-hidden p-0">
            {/* Header Status */}
            <div className={`p-6 text-white ${memberResult.isValid && checkinStatus !== "success" ? "bg-brand" : checkinStatus === "success" ? "bg-success" : "bg-danger"}`}>
              <div className="flex items-center gap-3">
                {checkinStatus === "success" ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : memberResult.isValid ? (
                  <User className="h-8 w-8" />
                ) : (
                  <XCircle className="h-8 w-8" />
                )}
                <div>
                  <h2 className="text-display-sm font-bold">
                    {checkinStatus === "success" ? "เช็คอินเรียบร้อยแล้ว!" : memberResult.isValid ? "พร้อมเช็คอิน" : "ไม่สามารถเช็คอินได้"}
                  </h2>
                  <p className="text-white/80 opacity-90">
                    {checkinStatus === "success" ? checkinMessage : memberResult.isValid ? "ตรวจสอบข้อมูลแล้วกดยืนยันด้านล่าง" : memberResult.failReason}
                  </p>
                </div>
              </div>
            </div>

            {/* Member Details */}
            <div className="p-6">
              <div className="flex items-start gap-6">
                <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft outline outline-4 outline-line">
                  <User className="h-10 w-10" />
                </div>
                <div className="flex-1">
                  <h3 className="text-display-xs font-bold text-ink">
                    {memberResult.member.first_name} {memberResult.member.last_name || ""}
                  </h3>
                  <p className="font-mono text-body-sm text-ink-soft">ID: {memberResult.member.member_number}</p>
                  
                  <div className="mt-4 grid grid-cols-2 gap-y-4 rounded-lg bg-surface p-4">
                    <div>
                      <p className="text-xs text-ink-soft">แพ็กเกจปัจจุบัน</p>
                      <p className="font-medium text-ink">{memberResult.member.packages?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-soft">สถานะ</p>
                      <StatusPill tone={memberResult.member.status === "active" ? "success" : "danger"} className="mt-1">
                        {memberResult.member.status}
                      </StatusPill>
                    </div>
                    <div>
                      <p className="text-xs text-ink-soft">วันหมดอายุ</p>
                      <p className={`font-medium ${memberResult.member.end_date && new Date(memberResult.member.end_date) < new Date() ? "text-danger" : "text-ink"}`}>
                        {memberResult.member.end_date || "-"}
                      </p>
                    </div>
                    {memberResult.member.packages?.type === "session_based" && (
                      <div>
                        <p className="text-xs text-ink-soft">สิทธิ์คงเหลือ</p>
                        <p className="font-medium text-brand">
                          ใช้ไป {memberResult.member.sessions_used} / {memberResult.member.packages.sessions_limit} ครั้ง
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end gap-3 border-t border-line pt-6">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setMemberResult(null);
                    setCheckinStatus("idle");
                    if (activeTab === "qr" && qrInputRef.current) qrInputRef.current.focus();
                  }}
                  disabled={loading}
                >
                  ยกเลิก
                </Button>
                {memberResult.isValid && checkinStatus !== "success" && (
                  <Button 
                    type="button" 
                    variant="primary"
                    onClick={handleConfirmCheckin}
                    disabled={loading}
                    className="min-w-[150px]"
                  >
                    {loading ? "กำลังดำเนินการ..." : "ยืนยันการเช็คอิน"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
