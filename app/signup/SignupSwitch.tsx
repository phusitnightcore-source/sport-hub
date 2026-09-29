"use client";

import { useState } from "react";
import { Building2, UserRound } from "lucide-react";
import { SignupForm } from "./SignupForm";
import { MemberSignupForm } from "./MemberSignupForm";

// เลือกบทบาทตอนสมัคร: เจ้าของสนาม vs ผู้ใช้ทั่วไป
export function SignupSwitch() {
  const [role, setRole] = useState<"venue" | "user">("venue");

  const options = [
    {
      key: "venue" as const,
      icon: Building2,
      title: "เจ้าของสนาม",
      desc: "จัดการสนาม/ฟิตเนส รับจอง รับเงิน",
    },
    {
      key: "user" as const,
      icon: UserRound,
      title: "ผู้ใช้ทั่วไป",
      desc: "จองคอร์ท + เขียนบทความ",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setRole(o.key)}
            className={
              "flex flex-col items-start gap-1 rounded-md p-4 text-left shadow-sm transition-all " +
              (role === o.key
                ? "bg-brand-soft ring-2 ring-brand"
                : "bg-surface ring-1 ring-inset ring-line hover:ring-brand/40")
            }
          >
            <o.icon
              className={role === o.key ? "h-5 w-5 text-brand" : "h-5 w-5 text-ink-soft"}
            />
            <span className="font-medium text-ink">{o.title}</span>
            <span className="text-body-sm text-ink-soft">{o.desc}</span>
          </button>
        ))}
      </div>

      {role === "venue" ? <SignupForm /> : <MemberSignupForm />}
    </div>
  );
}
