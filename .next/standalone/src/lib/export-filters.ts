import type { LineItem } from "@/store/estimate-store";

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function filterLineItemsForExport(lineItems: LineItem[]): LineItem[] {
  const list = Array.isArray(lineItems) ? lineItems : [];
  return list.filter((it) => {
    const qty = safeNumber(it.quantity);
    const total = safeNumber(it.total);
    return !(qty === 0 && total === 0);
  });
}

