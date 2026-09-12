import './badminton-group.css';
import { ReactNode } from 'react';

export default function BadmintonGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-scope font-sans min-h-full w-full">
      {children}
    </div>
  );
}
