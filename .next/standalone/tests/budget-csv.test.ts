import { describe, it } from "node:test";
import assert from "node:assert";
import { buildBudgetCsvContent } from "../src/lib/budget-csv";

describe("budget-csv", () => {
  it("incluye notas adicionales al final", () => {
    const csv = buildBudgetCsvContent({
      lineItems: [
        {
          id: "li_1",
          partida: "5.7.3.01",
          code: "SKU-1",
          description: "Item 1",
          unit: "PZA",
          quantity: 1,
          unitCost: 100,
          total: 100,
          system: "CCTV",
          category: "Equipo",
        },
      ],
      currency: "MXN",
      result: {
        subtotalDirect: 100,
        subtotalIndirects: 12,
        subtotalUtility: 16.8,
        grandTotal: 128.8,
        iva: 20.61,
        totalWithIva: 149.41,
      },
      meta: { name: "Test", clientName: "Cliente", projectName: "Proyecto" },
      notes: "Nota general",
      factorsNotes: "Nota técnica",
    });

    assert.ok(csv.includes("NOTAS ADICIONALES"));
    assert.ok(csv.includes("Nota técnica"));
    assert.ok(csv.includes("Nota general"));
  });
});

