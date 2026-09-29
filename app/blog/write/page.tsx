import { redirect } from "next/navigation";

// ฟอร์มเขียนบทความย้ายไปเป็น toggle ในหน้า /me/blog แล้ว (เข้าได้เฉพาะกดปุ่ม ไม่มี URL ฟอร์มแยก)
// เผื่อมีลิงก์/บุ๊กมาร์กเก่าหรือพิมพ์ URL ตรงๆ → ส่งเข้าโซนผู้ใช้ (/me/blog);
// ถ้ายังไม่ล็อกอิน middleware จะเด้งไป /login ให้เอง
export default function LegacyWriteRedirect() {
  redirect("/me/blog");
}
