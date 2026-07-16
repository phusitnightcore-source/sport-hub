import type { Metadata } from "next";
import { Prompt, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { BfcacheGuard } from "@/components/auth/BfcacheGuard";
import { PageViewTracker } from "@/components/PageViewTracker";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

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
      className={`${prompt.variable} ${plexMono.variable} h-full`}
    >
      <head>
        {/* no-FOUC: ตั้ง data-theme ก่อน paint จาก localStorage / prefers-color-scheme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full font-body">
        <BfcacheGuard />
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
