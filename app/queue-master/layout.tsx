import BadmintonGroupLayout from "@/app/dashboard/group-sessions/BadmintonGroupLayout";
import { ReactNode } from "react";

export default function QueueMasterLayout({ children }: { children: ReactNode }) {
  return <BadmintonGroupLayout>{children}</BadmintonGroupLayout>;
}
