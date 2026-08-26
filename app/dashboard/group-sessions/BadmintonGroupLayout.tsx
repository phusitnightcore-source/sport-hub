import { Outfit } from 'next/font/google';
import './badminton-group.css';
import { ReactNode } from 'react';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export default function BadmintonGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`bg-scope ${outfit.variable} font-sans min-h-full w-full`}>
      {children}
    </div>
  );
}
