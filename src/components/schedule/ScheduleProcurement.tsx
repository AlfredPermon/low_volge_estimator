'use client';

import { useEffect, useState } from "react";
import { addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useScheduleStore } from "@/store/schedule-store";
import { Loader2, Truck } from "lucide-react";

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputDate(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

export default function ScheduleProcurement() {
  const { schedule, saving, updateSchedule } = useScheduleStore();

  const [comparativeRequestedAt, setComparativeRequestedAt] = useState<string>("");
  const [comparativeMinExpectedAt, setComparativeMinExpectedAt] = useState<string>("");
  const [comparativeReceivedAt, setComparativeReceivedAt] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [quotedAmount, setQuotedAmount] = useState("");
  const [requisitionNumber, setRequisitionNumber] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [advanceReleasedAt, setAdvanceReleasedAt] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!schedule) return;
    const p = schedule.procurement;
    setComparativeRequestedAt(toInputDate(p?.comparativeRequestedAt ?? null));
    setComparativeMinExpectedAt(toInputDate(p?.comparativeMinExpectedAt ?? null));
    setComparativeReceivedAt(toInputDate(p?.comparativeReceivedAt ?? null));
    setSupplierName(p?.supplierName ?? "");
    setQuotedAmount(p?.quotedAmount !== undefined ? String(p.quotedAmount) : "");
    setRequisitionNumber(p?.requisitionNumber ?? "");
    setPurchaseOrderNumber(p?.purchaseOrderNumber ?? "");
    setAdvanceReleasedAt(toInputDate(p?.advanceReleasedAt ?? null));
    setNotes(p?.notes ?? "");
  }, [schedule]);

  if (!schedule) return null;

  return (
    <Card className="border-stone-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-600" />
          Suministro y Logística
          <Badge variant="secondary" className="bg-stone-100 text-stone-700">
            mínimo 2 semanas comparativa
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Solicitud de comparativa</Label>
            <Input
              type="date"
              value={comparativeRequestedAt}
              onChange={(e) => {
                const v = e.target.value;
                setComparativeRequestedAt(v);
                if (!comparativeMinExpectedAt.trim() && v.trim()) {
                  const d = new Date(`${v}T00:00:00.000Z`);
                  if (Number.isFinite(d.getTime())) {
                    setComparativeMinExpectedAt(toInputDate(addDays(d, 14).toISOString()));
                  }
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Entrega mínima estimada</Label>
            <Input
              type="date"
              value={comparativeMinExpectedAt}
              onChange={(e) => setComparativeMinExpectedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Entrega real de comparativa</Label>
            <Input type="date" value={comparativeReceivedAt} onChange={(e) => setComparativeReceivedAt(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Proveedor ganador</Label>
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Monto ofertado</Label>
            <Input value={quotedAmount} onChange={(e) => setQuotedAmount(e.target.value)} inputMode="decimal" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Requisición</Label>
            <Input value={requisitionNumber} onChange={(e) => setRequisitionNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Orden de compra (OC)</Label>
            <Input value={purchaseOrderNumber} onChange={(e) => setPurchaseOrderNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Anticipo liberado</Label>
            <Input type="date" value={advanceReleasedAt} onChange={(e) => setAdvanceReleasedAt(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Observaciones</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => {
              const amount = quotedAmount.trim() ? Number(quotedAmount) : 0;
              if (!Number.isFinite(amount) || amount < 0) return;

              updateSchedule(
                schedule.id,
                {},
                {
                  comparativeRequestedAt: fromInputDate(comparativeRequestedAt),
                  comparativeMinExpectedAt: fromInputDate(comparativeMinExpectedAt),
                  comparativeReceivedAt: fromInputDate(comparativeReceivedAt),
                  supplierName,
                  quotedAmount: amount,
                  requisitionNumber,
                  purchaseOrderNumber,
                  advanceReleasedAt: fromInputDate(advanceReleasedAt),
                  notes,
                } as any
              );
            }}
            disabled={saving}
            className="bg-stone-800 hover:bg-stone-900 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Guardar suministro
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

