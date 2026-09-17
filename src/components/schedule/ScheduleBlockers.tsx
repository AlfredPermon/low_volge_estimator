"use client";

import { useState, useCallback } from "react";
import { useScheduleStore } from "@/store/schedule-store";
import type { BlockerSeverity } from "@/lib/schedule/schedule-types";
import { AlertTriangle, Lock, Unlock, Trash2, Plus, Calendar, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

const SEVERITY_COLORS: Record<BlockerSeverity, string> = {
  low: "bg-yellow-50 text-yellow-700 border-yellow-200",
  medium: "bg-orange-50 text-orange-700 border-orange-200",
  high: "bg-red-50 text-red-700 border-red-200",
  critical: "bg-red-100 text-red-800 border-red-300",
};

const SEVERITY_LABELS: Record<BlockerSeverity, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};

export default function ScheduleBlockers() {
  const {
    schedule,
    blockers,
    activities,
    createBlocker,
    deleteBlocker,
    releaseBlocker,
  } = useScheduleStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null);

  // Form state
  const [activityId, setActivityId] = useState("");
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState<BlockerSeverity>("medium");
  const [responsible, setResponsible] = useState("");
  const [saving, setSaving] = useState(false);

  // Release form
  const [releaseNote, setReleaseNote] = useState("");

  const blockedActivities = blockers
    .filter((b) => !b.releasedAt)
    .map((b) => {
      const activity = activities.find((a) => a.id === b.activityId);
      return { blocker: b, activity };
    })
    .filter((item) => item.activity !== undefined);

  const releasedBlockers = blockers
    .filter((b) => b.releasedAt !== null)
    .sort(
      (a, b) =>
        new Date(b.releasedAt!).getTime() -
        new Date(a.releasedAt!).getTime()
    )
    .slice(0, 20);

  const handleCreate = useCallback(async () => {
    if (!activityId || !reason.trim()) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);
    try {
      await createBlocker({
        scheduleId: schedule!.id,
        activityId,
        reason: reason.trim(),
        severity,
        responsible: responsible.trim(),
      });
      setDialogOpen(false);
      setActivityId("");
      setReason("");
      setSeverity("medium");
      setResponsible("");
      toast.success("Bloqueo registrado");
    } catch {
      toast.error("Error al crear bloqueo");
    } finally {
      setSaving(false);
    }
  }, [activityId, reason, severity, responsible, schedule, createBlocker]);

  const handleRelease = useCallback(async () => {
    if (!selectedBlockerId) return;
    setSaving(true);
    try {
      await releaseBlocker(selectedBlockerId, releaseNote.trim());
      setReleaseDialogOpen(false);
      setSelectedBlockerId(null);
      setReleaseNote("");
      toast.success("Bloqueo liberado");
    } catch {
      toast.error("Error al liberar bloqueo");
    } finally {
      setSaving(false);
    }
  }, [selectedBlockerId, releaseNote, releaseBlocker]);

  const handleDelete = useCallback(
    async (blockerId: string) => {
      try {
        await deleteBlocker(blockerId);
        toast.success("Bloqueo eliminado");
      } catch {
        toast.error("Error al eliminar");
      }
    },
    [deleteBlocker]
  );

  if (!schedule) {
    return (
      <div className="text-center py-12 text-stone-400">
        Sin cronograma activo
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-stone-500" />
            Bloqueos Activos
          </h3>
          <p className="text-sm text-stone-500 mt-1">
            {blockedActivities.length} bloqueo(s) pendientes
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 bg-red-600 hover:bg-red-700 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Bloqueo
        </Button>
      </div>

      {blockedActivities.length === 0 ? (
        <Card className="border-stone-200">
          <CardContent className="py-10 text-center text-stone-400">
            <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Sin bloqueos activos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {blockedActivities.map(({ blocker, activity }) => (
            <Card
              key={blocker.id}
              className={`border-l-4 ${SEVERITY_COLORS[blocker.severity as BlockerSeverity].split(" ")[1]}`}
              style={{
                borderLeftColor:
                  blocker.severity === "critical"
                    ? "#b91c1c"
                    : blocker.severity === "high"
                      ? "#c2410c"
                      : blocker.severity === "medium"
                        ? "#ea580c"
                        : "#ca8a04",
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-stone-800 text-sm">
                        {activity!.name}
                      </span>
                      <Badge
                        className={`text-xs ${SEVERITY_COLORS[blocker.severity as BlockerSeverity]}`}
                      >
                        {SEVERITY_LABELS[blocker.severity as BlockerSeverity]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {blocker.severity === "low"
                          ? "🐢 Puede esperar"
                          : blocker.severity === "medium"
                            ? "⚠️ Atender pronto"
                            : blocker.severity === "high"
                              ? "🔥 Prioridad alta"
                              : "☠️ Crítico"}
                      </Badge>
                    </div>
                    <p className="text-sm text-stone-600 mb-2">{blocker.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-stone-400 flex-wrap">
                      {blocker.responsible && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {blocker.responsible}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(blocker.createdAt), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBlockerId(blocker.id);
                        setReleaseDialogOpen(true);
                      }}
                      className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Liberar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(blocker.id)}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Released blockers history */}
      {releasedBlockers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-stone-500 mb-3 flex items-center gap-2">
            <Unlock className="w-4 h-4" />
            Historial de bloqueos liberados
          </h4>
          <div className="space-y-2">
            {releasedBlockers.map((b) => {
              const act = activities.find((a) => a.id === b.activityId);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200 text-sm"
                >
                  <div>
                    <span className="text-stone-600 font-medium">
                      {act?.name ?? "Actividad eliminada"}
                    </span>
                    <span className="text-stone-400 mx-2">•</span>
                    <span className="text-stone-400 text-xs">{b.reason}</span>
                  </div>
                  <span className="text-xs text-stone-400">
                    {b.releasedAt
                      ? format(new Date(b.releasedAt), "dd/MM/yyyy")
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── New blocker dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Registrar Bloqueo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Actividad afectada *</Label>
              <Select value={activityId} onValueChange={setActivityId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona actividad" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo del bloqueo *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe la razón del bloqueo..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Severidad</Label>
                <Select
                  value={severity}
                  onValueChange={(v) => setSeverity(v as BlockerSeverity)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bajo 🐢</SelectItem>
                    <SelectItem value="medium">Medio ⚠️</SelectItem>
                    <SelectItem value="high">Alto 🔥</SelectItem>
                    <SelectItem value="critical">Crítico ☠️</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsable</Label>
                <Input
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="Nombre"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? "Guardando..." : "Registrar bloqueo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Release dialog ── */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Unlock className="w-5 h-5" />
              Liberar Bloqueo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nota de liberación (opcional)</Label>
              <Textarea
                value={releaseNote}
                onChange={(e) => setReleaseNote(e.target.value)}
                placeholder="Describe cómo se resolvió el bloqueo..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRelease}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Liberando..." : "Liberar bloqueo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
