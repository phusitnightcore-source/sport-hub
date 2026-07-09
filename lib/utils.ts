// รวม className แบบเบาๆ — พอสำหรับ variant ของ components/ui
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
