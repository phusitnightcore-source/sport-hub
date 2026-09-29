/** Booking's legacy tender enum and POS tender names share one report filter. */
export function reportPaymentMethod(method: string) {
  if (method === "walk_in_cash") return "cash";
  if (method === "walk_in_transfer" || method === "online_qr") return "transfer";
  return method;
}
