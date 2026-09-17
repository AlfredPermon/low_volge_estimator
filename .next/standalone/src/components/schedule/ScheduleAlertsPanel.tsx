"use client";

import { useScheduleStore } from "@/store/schedule-store";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SEVERITY_ICONS = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  warn: <AlertCircle className="w-4 h-4 text-amber-500" />,
  crit: <AlertTriangle className="w-4 h-4 text-red-500" />,
};

const SEVERITY_COLORS = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warn: "bg-amber-50 border-amber-200 text-amber-800",
  crit: "bg-red-50 border-red-200 text-red-800",
};

export default function ScheduleAlertsPanel() {
  const { schedule, alerts } = useScheduleStore();

  if (!schedule) return null;

  const critCount = alerts.filter((a) => a.severity === "crit").length;
  const warnCount = alerts.filter((a) => a.severity === "warn").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
          Alertas del Proyecto
        </h3>
        <div className="flex items-center gap-2">
          {critCount > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
              <AlertTriangle className="w-3 h-3" />
              {critCount}
            </Badge>
          )}
          {warnCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
              <AlertCircle className="w-3 h-3" />
              {warnCount}
            </Badge>
          )}
          {infoCount > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
              <Info className="w-3 h-3" />
              {infoCount}
            </Badge>
          )}
          {alerts.length === 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Sin alertas
            </Badge>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="py-6 text-center text-emerald-600">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-60" />
            <p className="font-medium">Todo en orden</p>
            <p className="text-sm text-emerald-500 mt-1">
              No se detectaron riesgos en el cronograma
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <Card
              key={i}
              className={`border ${SEVERITY_COLORS[alert.severity]}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{SEVERITY_ICONS[alert.severity]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0 capitalize bg-white"
                      >
                        {alert.severity === "crit"
                          ? "Crítico"
                          : alert.severity === "warn"
                            ? "Advertencia"
                            : "Info"}
                      </Badge>
                    </div>
                    <p className="text-sm mt-0.5 opacity-80">{alert.message}</p>
                    {alert.action && (
                      <p className="text-xs mt-1 font-medium opacity-70">
                        → {alert.action}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
