/* eslint-disable @next/next/no-img-element */

// การ์ดสินค้า Affiliate (Lazada/Shopee/Decathlon/Supersports) — ปุ่ม "ซื้อเลย"
// ลิงก์ผ่าน /api/ad/click เพื่อ นับคลิก + rel="sponsored nofollow" (ถูกต้องตาม Google)
// ใช้ในโค้ดได้; ในบทความ HTML ใช้ <a class="affiliate-card"> ตามสไตล์เดียวกัน (globals.css)
export function AffiliateCard({
  title,
  url,
  image,
  price,
  store,
}: {
  title: string;
  url: string;
  image?: string;
  price?: string;
  store?: string;
}) {
  const href = `/api/ad/click?u=${encodeURIComponent(url)}&label=${encodeURIComponent(
    store ?? "affiliate",
  )}`;
  return (
    <a href={href} target="_blank" rel="sponsored nofollow noopener" className="affiliate-card">
      {image && <img src={image} alt={title} className="affiliate-card__img" />}
      <div className="affiliate-card__body">
        {store && <span className="affiliate-card__store">{store}</span>}
        <strong>{title}</strong>
        {price && <span className="affiliate-card__price">{price}</span>}
        <span className="affiliate-card__buy">ซื้อเลย →</span>
      </div>
    </a>
  );
}
