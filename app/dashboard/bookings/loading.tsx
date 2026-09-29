export default function Loading() {
  return <main aria-busy="true" aria-label="กำลังโหลดการจอง" className="space-y-5"><div className="h-56 animate-pulse rounded-3xl bg-surface"/><div className="h-40 animate-pulse rounded-3xl bg-surface"/>{[0,1,2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface"/>)}</main>;
}
