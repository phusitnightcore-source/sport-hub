/** POS amounts are compared in satang, never by floating-point equality. */
export function satang(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
  return Math.round((value + Number.EPSILON) * 100);
}

export function cartTotals(items: { price: number; quantity: number }[], discount: number, percent = false) {
  const subtotal = items.reduce((sum, item) => sum + satang(item.price) * item.quantity, 0);
  const reduction = percent ? Math.round(subtotal * discount / 100) : satang(discount);
  if (!Number.isFinite(reduction) || reduction < 0 || reduction > subtotal) throw new Error("ส่วนลดต้องไม่เกินยอดสินค้า");
  return { subtotal: subtotal / 100, discount: reduction / 100, total: (subtotal - reduction) / 100 };
}

export function cashChange(total: number, received: number) {
  const change = satang(received) - satang(total);
  if (change < 0) throw new Error("เงินสดที่รับไม่เพียงพอ");
  return change / 100;
}
