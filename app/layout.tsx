import type { Metadata } from "next";
import { Prompt, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { BfcacheGuard } from "@/components/auth/BfcacheGuard";

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
    <html lang="th" className={`${prompt.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full font-body">
        <BfcacheGuard />
        {children}
      </body>
    </html>
  );
}
