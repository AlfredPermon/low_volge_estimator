'use client';

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useScheduleStore } from "@/store/schedule-store";
import { CalendarDays } from "lucide-react";
import { SCHEDULE_PHASES } from "@/lib/schedule/schedule-types";

function phaseLabel(id: number): string {
  const found = SCHEDULE_PHASES.find((p) => p.id === id);
  return found ? found.label : String(id);
}

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

export default function ScheduleGantt() {
  const { schedule, updateActivity, saving } = useScheduleStore();
  const rows = useMemo(() => schedule?.activities ?? [], [schedule]);
  if (!schedule) return null;

  return (
    <Card className="border-stone-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-emerald-600" />
          Gantt — 编辑 de fechas y avance
          {saving ? (
            <Badge variant="secondary" className="bg-stone-100 text-stone-700">
              guardando
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actividad</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead className="text-right">Avance %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium text-stone-800 max-w-50 truncate">{a.name}</TableCell>
                <TableCell className="text-stone-600 text-xs">
                  <Badge variant="outline" className="whitespace-normal leading-tight">
                    {phaseLabel(a.phase)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-stone-100 text-stone-700">
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell className="w-40">
                  <Input
                    type="date"
                    defaultValue={toInputDate(a.startDate)}
                    onBlur={(e) => updateActivity(a.id, { startDate: fromInputDate(e.target.value) })}
                  />
                </TableCell>
                <TableCell className="w-40">
                  <Input
                    type="date"
                    defaultValue={toInputDate(a.endDate)}
                    onBlur={(e) => updateActivity(a.id, { endDate: fromInputDate(e.target.value) })}
                  />
                </TableCell>
                <TableCell className="w-27.5">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    defaultValue={String(a.progress ?? 0)}
                    className="text-right"
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n) || n < 0) return;
                      updateActivity(a.id, { progress: Math.min(100, n) });
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

