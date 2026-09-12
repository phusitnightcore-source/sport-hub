"use client";

import { useState } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface Branch {
  id: string;
  name: string;
}

export function BranchSwitcher({
  branches,
  activeBranchId,
}: {
  branches: Branch[];
  activeBranchId?: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(activeBranchId || "");
  const [isOpen, setIsOpen] = useState(false);

  if (branches.length <= 1) return null;

  const current = branches.find((b) => b.id === selectedId) ?? null;

  function selectBranch(id: string) {
    setSelectedId(id);
    setIsOpen(false);
    // Set cookie for 30 days
    document.cookie = `active_branch_id=${id}; path=/; max-age=${60 * 60 * 24 * 30}`;
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-brand transition-all shadow-2xs"
      >
        <Building2 className="h-3.5 w-3.5 text-brand" />
        <span className="max-w-[120px] truncate">{current?.name || "ทุกสาขา"}</span>
        <ChevronDown className="h-3 w-3 text-ink-soft" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] rounded-2xl border border-line bg-surface p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => selectBranch("")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition-colors ${
                !selectedId ? "bg-brand/10 text-brand" : "text-ink hover:bg-surface-raised"
              }`}
            >
              <span>ทุกสาขา (All Branches)</span>
              {!selectedId && <Check className="h-3.5 w-3.5" />}
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => selectBranch(b.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition-colors ${
                  selectedId === b.id ? "bg-brand/10 text-brand" : "text-ink hover:bg-surface-raised"
                }`}
              >
                <span className="truncate">{b.name}</span>
                {selectedId === b.id && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
