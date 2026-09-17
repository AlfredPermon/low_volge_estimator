'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useScheduleStore } from "@/store/schedule-store";
import { isBefore, isValid } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  ListTodo,
  Flag,
  Lock,
} from "lucide-react";
import { SCHEDULE_PHASES } from "@/lib/schedule/schedule-types";

function toDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function phaseLabel(id: number): string {
  const found = SCHEDULE_PHASES.find((p) => p.id === id);
  return found ? found.label : String(id);
}

export default function ScheduleSummary() {
  const { schedule, activities, blockers, milestones, alerts } = useScheduleStore();
  if (!schedule) return null;

  const now = new Date();
  const total = activities.length;
  const finished = activities.filter((a) => a.status === "Terminado").length;
  const blocked = activities.filter((a) => a.status === "Bloqueado").length;
  const delayed = activities.filter((a) => {
    const end = toDate(a.endDate);
    if (!end || !isValid(end)) return false;
    if (a.status === "Terminado") return false;
    return isBefore(end, now);
  }).length;

  const activeBlockers = blockers.filter((b) => !b.releasedAt).length;
  const pendingMilestones = milestones.filter((m) => m.status === "pending").length;
  const completedMilestones = milestones.filter((m) => m.status === "completed").length;

  const kpi = [
    { label: "Actividades", value: total, icon: <ListTodo className="w-4 h-4 text-stone-500" /> },
    { label: "Terminadas", value: finished, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
    { label: "Bloqueadas", value: blocked, icon: <Ban className="w-4 h-4 text-red-600" /> },
    { label: "Retrasadas", value: delayed, icon: <Clock className="w-4 h-4 text-amber-600" /> },
    { label: "Bloqueos activos", value: activeBlockers, icon: <Lock className="w-4 h-4 text-orange-600" /> },
    { label: "Hitos pendientes", value: pendingMilestones, icon: <Flag className="w-4 h-4 text-blue-600" /> },
  ];

  const critCount = alerts.filter((a) => a.severity === "crit").length;
  const warnCount = alerts.filter((a) => a.severity === "warn").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpi.map((k) => (
          <Card key={k.label} className="border-stone-200 shadow-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-stone-500 flex items-center justify-between">
                <span>{k.label}</span>
                {k.icon}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold text-stone-800">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Alertas
            {critCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200">{critCount} crit</Badge>
            )}
            {warnCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">{warnCount} warn</Badge>
            )}
            {alerts.length === 0 && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Sin alertas</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-sm text-stone-500 py-2">
              <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-500" />
              Sin alertas por el momento. El cronograma se encuentra en orden.
            </div>
          ) : (
            alerts.map((a) => (
              <Alert key={a.key} variant={a.severity === "crit" ? "destructive" : "default"}>
                <AlertTitle className="flex items-center justify-between">
                  <span>{a.title ?? a.message}</span>
                  <Badge
                    variant="secondary"
                    className={
                      a.severity === "crit"
                        ? "bg-red-100 text-red-800"
                        : a.severity === "warn"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                    }
                  >
                    {a.severity}
                  </Badge>
                </AlertTitle>
                {a.title && a.message !== a.title ? (
                  <AlertDescription className="text-sm text-stone-600">{a.message}</AlertDescription>
                ) : null}
                {a.action ? <AlertDescription className="text-sm text-stone-500 mt-1">→ {a.action}</AlertDescription> : null}
              </Alert>
            ))
          )}
        </CardContent>
      </Card>

      {completedMilestones > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Flag className="w-4 h-4" />
              <span className="text-sm font-medium">
                {completedMilestones} hito(s) completado(s) de {milestones.length} total(es)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

