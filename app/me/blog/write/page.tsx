import { redirect } from "next/navigation";

// ฟอร์มเขียนบทความย้ายไปเป็น toggle ในหน้า /me/blog แล้ว (เข้าได้เฉพาะกดปุ่ม ไม่มี URL แยก)
// เผื่อมีลิงก์/บุ๊กมาร์กเก่าหรือพิมพ์ URL ตรงๆ → ส่งกลับหน้ารวมบทความ
export default function RedirectToBlogHub() {
  redirect("/me/blog");
}
