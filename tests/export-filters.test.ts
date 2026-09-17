import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { filterLineItemsForExport } from "../src/lib/export-filters";
import type { LineItem } from "../src/store/estimate-store";

function li(patch: Partial<LineItem> = {}): LineItem {
  return {
    id: patch.id ?? "li_1",
    partida: patch.partida ?? "5.7.3.01",
    code: patch.code ?? "SKU-1",
    description: patch.description ?? "Item",
    unit: patch.unit ?? "pz",
    quantity: patch.quantity ?? 1,
    unitCost: patch.unitCost ?? 10,
    total: patch.total ?? 10,
    totalAmount: patch.totalAmount,
    system: patch.system ?? "CCTV",
    category: patch.category ?? "EQUIPO",
  };
}

describe("filterLineItemsForExport", () => {
  it("excluye solo filas con Cantidad=0 e Importe=0", () => {
    const items: LineItem[] = [
      li({ id: "a", quantity: 0, total: 0 }),
      li({ id: "b", quantity: 0, total: 100 }),
      li({ id: "c", quantity: 2, total: 0 }),
      li({ id: "d", quantity: 1, total: 10 }),
    ];

    const out = filterLineItemsForExport(items);
    assert.deepEqual(
      out.map((x) => x.id),
      ["b", "c", "d"],
    );
    assert.equal(items.length, 4);
  });

  it("trata no-finito como 0 para decidir exclusión", () => {
    const items: LineItem[] = [li({ id: "a", quantity: Number.NaN, total: 0 }), li({ id: "b", quantity: 1, total: 0 })];
    const out = filterLineItemsForExport(items);
    assert.deepEqual(out.map((x) => x.id), ["b"]);
  });
});

