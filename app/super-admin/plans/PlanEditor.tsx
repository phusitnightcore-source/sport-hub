"use client";

import { useActionState } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  FEATURE_FLAGS,
  FEATURE_LABELS,
  LIMIT_FIELDS,
  LIMIT_LABELS,
  type PlanEntitlements,
} from "@/lib/entitlements";
import { savePlanEntitlements, type PlanState } from "./actions";

export function PlanEditor({
  plan,
  planName,
  priceLabel,
  entitlements,
}: {
  plan: string;
  planName: string;
  priceLabel: string;
  entitlements: PlanEntitlements;
}) {
  const [state, action, pending] = useActionState<PlanState, FormData>(
    savePlanEntitlements,
    {},
  );

  return (
    <form action={action} className="card-floating flex flex-col gap-4 p-6">
      <input type="hidden" name="plan" value={plan} />
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-body-lg font-semibold text-ink">
          {planName}
        </h2>
        <span className="text-body-sm text-ink-soft">{priceLabel}</span>
      </div>

      {/* ลิมิต */}
      <div className="grid gap-3 sm:grid-cols-3">
        {LIMIT_FIELDS.map((field) => (
          <label key={field} className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium text-ink">
              {LIMIT_LABELS[field].split(" (")[0]}
            </span>
            <input
              type="number"
              name={field}
              min={0}
              defaultValue={entitlements[field] ?? ""}
              placeholder="ไม่จำกัด"
              className="w-full rounded-sm bg-surface px-3 py-2 text-body text-ink shadow-sm outline-none ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand"
            />
          </label>
        ))}
      </div>

      {/* ฟีเจอร์ (toggle) */}
      <div className="grid gap-2 sm:grid-cols-2">
        {FEATURE_FLAGS.map((flag) => (
          <label
            key={flag}
            className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-body-sm text-ink hover:bg-brand-soft/40"
          >
            <input
              type="checkbox"
              name={flag}
              defaultChecked={entitlements[flag]}
              className="h-4 w-4 rounded-sm accent-brand"
            />
            {FEATURE_LABELS[flag]}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "กำลังบันทึก…" : "บันทึกแพลนนี้"}
        </Button>
        {state.plan === plan && state.error && (
          <span className="text-body-sm text-danger">{state.error}</span>
        )}
        {state.plan === plan && state.success && (
          <span className="flex items-center gap-1.5 text-body-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            บันทึกแล้ว
          </span>
        )}
      </div>
    </form>
  );
}
