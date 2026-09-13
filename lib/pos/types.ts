export type CounterReport = {
  shift: {
    id: string; status: "open" | "closed"; opened_at: string; closed_at: string | null;
    starting_cash: number; actual_closing_cash: number | null; expected_closing_cash: number | null;
  };
  totalRevenue: number;
  salesByMethod: { cash: number; transfer: number; card: number; other: number };
  soldItems: { name: string; quantity: number; revenue: number }[];
  expectedCash: number;
  cashMovementTotal: number;
  cashMovements: { amount: number; reason: string; created_at: string }[];
};
export type DailySummary = { branch_id: string; sale_count: number; revenue: number };
export type CounterBooking = { code: string; customerName: string; customerPhone: string; amount: number; description: string; canCollect: boolean; reason: string };
