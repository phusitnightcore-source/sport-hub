import BadmintonGroupLayout from "./BadmintonGroupLayout";
import { ReactNode } from "react";

export default function GroupSessionsLayout({ children }: { children: ReactNode }) {
  return <BadmintonGroupLayout>{children}</BadmintonGroupLayout>;
}
