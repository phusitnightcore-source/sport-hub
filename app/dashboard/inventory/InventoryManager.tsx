"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  History,
  PackagePlus,
  PencilLine,
  Store,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CounterDialog } from "@/components/ui/CounterDialog";
import { Input } from "@/components/ui/Input";
import { createProduct, updateProduct, recordStockMovement } from "./actions";

type Branch = { id: string; name: string };
type ProductType = "product" | "rental" | "service";
type MovementType = "purchase" | "sale" | "return" | "adjustment" | "damage" | "transfer" | "initial";

export type InventoryProduct = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  productType: ProductType;
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  trackStock: boolean;
  isActive: boolean;
  stockByBranch: Record<string, number>;
};

export type StockMovement = {
  id: string;
  branchId: string;
  productName: string;
  movementType: MovementType;
  quantityChange: number;
  quantityAfter: number;
  note: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<ProductType, string> = { product: "สินค้า", rental: "เช่า", service: "บริการ" };
const MOVEMENT_LABEL: Record<MovementType, string> = {
  purchase: "รับสินค้า",
  sale: "ขาย",
  return: "คืนสินค้า",
  adjustment: "ปรับยอด",
  damage: "สินค้าเสียหาย",
  transfer: "ย้ายสาขา",
  initial: "ยอดตั้งต้น",
};

function baht(value: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

export function InventoryManager({
  branches,
  products,
  movements,
}: {
  branches: Branch[];
  products: InventoryProduct[];
  movements: StockMovement[];
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [template, setTemplate] = useState("ทั่วไป");
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Branch Dropdown State
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const currentBranch = branches.find((b) => b.id === branchId) ?? branches[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return products.filter(
      (product) =>
        !q ||
        `${product.name} ${product.sku ?? ""} ${product.barcode ?? ""} ${product.category ?? ""}`.toLocaleLowerCase().includes(q)
    );
  }, [products, query]);

  const lowStock = visibleProducts.filter(
    (product) => product.trackStock && (product.stockByBranch[branchId] ?? 0) <= product.lowStockThreshold
  );

  function onBranchChange(value: string) {
    setBranchId(value);
    setSelectedProduct(null);
    setError(null);
    setIsBranchDropdownOpen(false);
  }

  async function submitProduct(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    const payload = {
      branchId,
      name: String(data.get("name") ?? ""),
      category: String(data.get("category") ?? ""),
      sku: String(data.get("sku") ?? ""),
      barcode: String(data.get("barcode") ?? ""),
      productType: String(data.get("productType") ?? "product") as ProductType,
      costPrice: Number(data.get("costPrice") ?? 0),
      sellingPrice: Number(data.get("sellingPrice") ?? 0),
      lowStockThreshold: Number(data.get("lowStockThreshold") ?? 0),
      trackStock: data.get("trackStock") === "on",
      initialStock: Number(data.get("initialStock") ?? 0),
    };
    const result = await (editing ? updateProduct({ ...payload, productId: editing.id, isActive: data.get("isActive") === "on" }) : createProduct(payload)).catch(() => ({ error: "การเชื่อมต่อขัดข้อง ตรวจสอบคลังสินค้าก่อนลองเพิ่มซ้ำ" }));
    setBusy(false);
    if (result.error) return setError(result.error);
    form.reset();
    setShowCreate(false);
    router.refresh();
  }

  async function submitMovement(form: HTMLFormElement) {
    if (!selectedProduct) return;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    const result = await recordStockMovement({
      branchId,
      productId: selectedProduct.id,
      movementType: String(data.get("movementType")) as "purchase" | "return" | "adjustment" | "damage",
      quantityChange: Number(data.get("quantityChange") ?? 0),
      note: String(data.get("note") ?? ""),
    }).catch(() => ({ error: "การเชื่อมต่อขัดข้อง ตรวจสอบประวัติสต็อกก่อนลองซ้ำ" }));
    setBusy(false);
    if (result.error) return setError(result.error);
    setSelectedProduct(null);
    form.reset();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Filter & Action Bar */}
      <section className="card-floating flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        {/* Custom Branch Selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-semibold text-ink">สาขา</span>
          <div className="relative min-w-56" ref={branchDropdownRef}>
            <button
              type="button"
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-body-sm font-semibold text-ink shadow-xs hover:border-brand/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-brand" />
                <span>{currentBranch?.name}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-ink-soft transition-transform ${isBranchDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isBranchDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-full min-w-56 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                <p className="px-3 py-1.5 text-[11px] font-bold text-ink-soft uppercase tracking-wider">เลือกสาขา</p>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onBranchChange(b.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-body-sm font-medium transition-colors ${
                      b.id === branchId
                        ? "bg-brand-soft text-brand font-bold"
                        : "text-ink hover:bg-surface/80"
                    }`}
                  >
                    <span>{b.name}</span>
                    {b.id === branchId && <Check className="h-4 w-4 text-brand" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search & Add button */}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <div className="w-full sm:w-64">
            <span className="mb-1.5 block text-body-sm font-semibold text-ink">ค้นหาสินค้า</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อสินค้า / SKU"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-body text-ink shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
            />
          </div>
          <Button
            onClick={() => {
              setEditing(null); setTemplate("ทั่วไป"); setShowCreate(true);
              setError(null);
            }}
            className="rounded-xl shadow-xs"
          >
            <PackagePlus className="h-4 w-4 mr-1.5" />
            เพิ่มสินค้าใหม่
          </Button>
        </div>
      </section>

      {/* Low stock warning */}
      {lowStock.length > 0 && (
        <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-start gap-3 text-warning">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold text-ink">สินค้าใกล้หมดในสาขานี้ ({lowStock.length} รายการ)</p>
              <p className="mt-1 text-body-sm text-ink-soft">
                {lowStock.map((product) => product.name).join(" · ")}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Products Table */}
      <section className="card-floating overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface/50">
          <h2 className="font-display font-bold text-ink">
            รายการสินค้า ({visibleProducts.length} รายการ)
          </h2>
          <span className="text-body-sm text-ink-soft">กด “ปรับสต็อก” เพื่อบันทึกเพิ่ม/ลดสินค้า</span>
        </div>
        {visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center text-body-sm text-ink-soft">
            <Boxes className="h-9 w-9 text-ink-soft/40" />
            <p>ยังไม่มีรายการสินค้าในระบบ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-body-sm">
              <thead className="border-b border-line bg-surface/80 text-[12px] font-semibold text-ink-soft">
                <tr>
                  <th className="px-6 py-3.5 font-bold">สินค้า</th>
                  <th className="px-4 py-3.5 font-bold">ประเภท</th>
                  <th className="px-4 py-3.5 text-right font-bold">ต้นทุน</th>
                  <th className="px-4 py-3.5 text-right font-bold">ราคาขาย</th>
                  <th className="px-4 py-3.5 text-right font-bold">คงเหลือ</th>
                  <th className="px-4 py-3.5 text-right font-bold">ขั้นต่ำ</th>
                  <th className="px-6 py-3.5 text-right font-bold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {visibleProducts.map((product) => {
                  const stock = product.stockByBranch[branchId] ?? 0;
                  const isLow = product.trackStock && stock <= product.lowStockThreshold;
                  return (
                    <tr key={product.id} className="hover:bg-brand-soft/20 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-bold text-ink">{product.name}</p>
                        {!product.isActive && <span className="rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-ink">ปิดขาย</span>}
                        <p className="font-mono text-mono-sm text-ink-soft">
                          {product.sku ?? product.barcode ?? "ไม่มี SKU"}
                          {product.category ? ` · ${product.category}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            product.productType === "product"
                              ? "pill-brand"
                              : product.productType === "rental"
                              ? "pill-warning"
                              : "pill-success"
                          }`}
                        >
                          {TYPE_LABEL[product.productType]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-ink-soft">฿{baht(product.costPrice)}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-ink">
                        ฿{baht(product.sellingPrice)}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-right font-mono font-bold ${
                          isLow ? "text-danger" : "text-ink"
                        }`}
                      >
                        {product.trackStock ? stock : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-ink-soft">
                        {product.trackStock ? product.lowStockThreshold : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Button size="sm" variant="secondary" className="mr-2" onClick={() => { setEditing(product); setShowCreate(true); setError(null); }}>แก้ไข</Button>
                        {product.trackStock && product.isActive && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-xl"
                            onClick={() => {
                              setSelectedProduct(product);
                              setError(null);
                            }}
                          >
                            <PencilLine className="h-3.5 w-3.5 mr-1" /> ปรับสต็อก
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Movements Log */}
      <section className="card-floating overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-line px-6 py-4 bg-surface/50">
          <History className="h-5 w-5 text-brand" />
          <h2 className="font-display font-bold text-ink">ประวัติการเคลื่อนไหวสต็อกล่าสุด</h2>
        </div>
        {movements.length === 0 ? (
          <p className="p-6 text-body-sm text-ink-soft text-center">ยังไม่มีประวัติการเคลื่อนไหว</p>
        ) : (
          <div className="divide-y divide-line/60">
            {movements.filter(m => m.branchId === branchId).map((movement) => (
              <div key={movement.id} className="flex items-center justify-between gap-4 px-6 py-3.5 text-body-sm hover:bg-surface/60 transition-colors">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{movement.productName}</p>
                  <p className="text-[12px] text-ink-soft">
                    {MOVEMENT_LABEL[movement.movementType]}
                    {movement.note ? ` · ${movement.note}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-mono font-bold ${
                      movement.quantityChange > 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {movement.quantityChange > 0 ? "+" : ""}
                    {movement.quantityChange}
                  </p>
                  <p className="font-mono text-[11px] text-ink-soft">คงเหลือ {movement.quantityAfter}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CREATE PRODUCT MODAL */}
      {showCreate && (
        <Modal
          title={editing ? "แก้ไขสินค้า / บริการ" : "เพิ่มสินค้า / บริการใหม่"}
          busy={busy}
          onClose={() => {
            setShowCreate(false);
            setError(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitProduct(event.currentTarget);
            }}
            className="flex flex-col gap-4"
          >
            {!editing && <div className="flex flex-wrap gap-2">{["ทั่วไป", "อาหาร", "เครื่องดื่ม", "อุปกรณ์กีฬา", "ค่าเช่า", "บริการ"].map(t => <button key={t} type="button" className="rounded-full bg-brand-soft px-3 py-2 text-sm text-brand" onClick={() => setTemplate(t)}>{t}</button>)}</div>}
            <p className="rounded-xl bg-brand-soft p-3 text-sm text-ink">สินค้าใช้ร่วมกันทุกสาขา สต็อกแยกตามสาขาที่เลือก อาหารทำตามสั่งหรือค่าบริการสามารถปิดการติดตามสต็อกได้ รุ่นหรือขนาดต่างกันให้แยก SKU</p>
            {editing && <label className="flex gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={editing.isActive}/>เปิดขายสินค้าใน POS</label>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="name" label="ชื่อสินค้า" required defaultValue={editing?.name ?? ""} />
              <Input key={template} name="category" label="หมวดสินค้า (ตั้งเองได้)" defaultValue={editing?.category ?? template} placeholder="เช่น อาหาร, เครื่องดื่ม, ลูกขนไก่" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="sku" label="SKU (ถ้ามี)" defaultValue={editing?.sku ?? ""} />
              <Input name="barcode" label="Barcode (ถ้ามี)" defaultValue={editing?.barcode ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-body-sm font-semibold text-ink">ประเภทสินค้า</span>
                <select
                  name="productType"
                  defaultValue={editing?.productType ?? "product"}
                  disabled={!!editing}
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-body text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors cursor-pointer"
                >
                  <option value="product">สินค้าทั่วไป / เครื่องดื่ม</option>
                  <option value="rental">อุปกรณ์เช่า</option>
                  <option value="service">บริการ / คอร์สเรียน</option>
                </select>
              </div>
              <label className="mt-7 flex items-center gap-2 text-body-sm font-semibold text-ink cursor-pointer">
                <input name="trackStock" type="checkbox" defaultChecked={editing?.trackStock ?? true} disabled={!!editing} className="h-4 w-4 accent-brand rounded" />
                ติดตามจำนวนสต็อกคงเหลือ
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="costPrice" label="ต้นทุน (บาท)" type="number" min="0" step="0.01" defaultValue={editing?.costPrice ?? 0} required />
              <Input name="sellingPrice" label="ราคาขาย (บาท)" type="number" min="0" step="0.01" defaultValue={editing?.sellingPrice ?? 0} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="lowStockThreshold"
                label="แจ้งเตือนเมื่อเหลือไม่เกิน (ชิ้น)"
                type="number"
                min="0"
                step="1"
                defaultValue={editing?.lowStockThreshold ?? 5}
                required
              />
              <Input
                name="initialStock"
                label={editing ? "ปรับยอดผ่านเมนูปรับสต็อก" : "ยอดสต็อกเริ่มต้นสาขานี้"}
                disabled={!!editing}
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                required
              />
            </div>
            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-body-sm font-medium text-danger">{error}</p>}
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 rounded-xl"
                onClick={() => {
                  setShowCreate(false);
                  setError(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={busy}>
                {busy ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "ยืนยันเพิ่มสินค้า"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ADJUST STOCK MODAL */}
      {selectedProduct && (
        <Modal
          title={`ปรับสต็อก · ${selectedProduct.name}`}
          busy={busy}
          onClose={() => {
            setSelectedProduct(null);
            setError(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitMovement(event.currentTarget);
            }}
            className="flex flex-col gap-4"
          >
            <div className="rounded-2xl bg-brand-soft p-4 text-body-sm text-ink">
              <p className="text-ink-soft">คงเหลือปัจจุบันสาขานี้:</p>
              <p className="font-mono text-2xl font-bold text-brand">
                {selectedProduct.stockByBranch[branchId] ?? 0} ชิ้น
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-body-sm font-semibold text-ink">ประเภทการเคลื่อนไหว</span>
              <select
                name="movementType"
                defaultValue="purchase"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-body text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors cursor-pointer"
              >
                <option value="purchase">รับสินค้าเข้า (+)</option>
                <option value="return">คืนสินค้า (+)</option>
                <option value="adjustment">ปรับยอดคงเหลือ (ระบุบวกหรือลบ)</option>
                <option value="damage">สินค้าเสียหาย (-)</option>
              </select>
            </div>

            <Input
              name="quantityChange"
              label="จำนวนที่ต้องการเปลี่ยน (เช่น 10 หรือ -5)"
              type="number"
              step="1"
              defaultValue="1"
              required
            />
            <Input name="note" label="หมายเหตุ (ถ้ามี)" placeholder="เช่น บันทึกใบส่งของ หรือ สาเหตุสินค้าชำรุด" />
            
            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-body-sm font-medium text-danger">{error}</p>}
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 rounded-xl"
                onClick={() => {
                  setSelectedProduct(null);
                  setError(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={busy}>
                {busy ? "กำลังบันทึก..." : "บันทึกการปรับสต็อก"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  busy,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <CounterDialog title={title} onClose={onClose} busy={busy}>{children}</CounterDialog>
  );
}
