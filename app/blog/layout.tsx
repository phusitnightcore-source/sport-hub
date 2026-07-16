import { PublicNav } from "@/components/ui/PublicNav";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t border-line py-8 text-center text-body-sm text-ink-soft">
        <p>© SportHub — แพลตฟอร์มจัดการสนามกีฬาและฟิตเนส</p>
      </footer>
    </div>
  );
}
