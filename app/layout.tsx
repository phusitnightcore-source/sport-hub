import type { Metadata } from "next";
import "./globals.css";
import { BfcacheGuard } from "@/components/auth/BfcacheGuard";
import { PageViewTracker } from "@/components/PageViewTracker";

export const metadata: Metadata = {
  title: "SportHub",
  description: "ระบบจองสนามกีฬาและจัดการสมาชิกฟิตเนสครบวงจร",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className="h-full"
    >
      <head>
        {/* no-FOUC: ตั้ง data-theme และ class dark ก่อน paint จาก localStorage / prefers-color-scheme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full font-body" suppressHydrationWarning>
        <BfcacheGuard />
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
