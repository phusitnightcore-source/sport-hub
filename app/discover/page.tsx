import { PublicNav } from "@/components/ui/PublicNav";
import { FacilityDirectory } from "./FacilityDirectory";

export const metadata = {
  title: "ค้นหาสนามกีฬา | SportHub",
  description: "ค้นหาและจองสนามกีฬาที่เปิดให้บริการใกล้คุณ",
};

export default function DiscoverPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <FacilityDirectory />
    </div>
  );
}
