"use client";

import { useState, useCallback } from "react";
import { useScheduleStore } from "@/store/schedule-store";
import type { MilestonePhase } from "@/lib/schedule/schedule-types";
import { Flag, CheckCircle2, Circle, Trash2, Plus, Calendar, User } from "lucide-react";
import {
  Card,
  CardContent,
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

const PHASE_LABELS: Record<MilestonePhase, string> = {
  engineering: "Ingeniería",
  procurement: "Suministro",
  infrastructure: "Infraestructura",
  cabling: "Cableado",
  commissioning: "Montaje y Comisionamiento",
  delivery: "Entrega Final",
  general: "General",
};

export default function ScheduleMilestones() {
  const {
    schedule,
    milestones,
    createMilestone,
    completeMilestone,
    deleteMilestone,
  } = useScheduleStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phase, setPhase] = useState<MilestonePhase>("general");
  const [targetDate, setTargetDate] = useState("");
  const [responsible, setResponsible] = useState("");
  const [notes, setNotes] = useState("");

  const pending = milestones.filter((m) => m.status === "pending");
  const completed = milestones
    .filter((m) => m.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.completedAt!).getTime() -
        new Date(a.completedAt!).getTime()
    );

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !targetDate) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);
    try {
      await createMilestone({
        scheduleId: schedule!.id,
        name: name.trim(),
        phase,
        targetDate,
        responsible: responsible.trim(),
        notes: notes.trim(),
      });
      setDialogOpen(false);
      setName("");
      setPhase("general");
      setTargetDate("");
      setResponsible("");
      setNotes("");
      toast.success("Hito creado");
    } catch {
      toast.error("Error al crear hito");
    } finally {
      setSaving(false);
    }
  }, [name, phase, targetDate, responsible, notes, schedule, createMilestone]);

  const handleComplete = useCallback(
    async (id: string) => {
      try {
        await completeMilestone(id);
        toast.success("Hito marcado como cumplido");
      } catch {
        toast.error("Error al completar hito");
      }
    },
    [completeMilestone]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMilestone(id);
        toast.success("Hito eliminado");
      } catch {
        toast.error("Error al eliminar");
      }
    },
    [deleteMilestone]
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
            <Flag className="w-5 h-5 text-stone-500" />
            Hitos del Proyecto
          </h3>
          <p className="text-sm text-stone-500 mt-1">
            {pending.length} pendiente(s) · {completed.length} cumplidos
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Hito
        </Button>
      </div>

      {/* ── Pending milestones ── */}
      <div>
        <h4 className="text-sm font-medium text-stone-600 mb-3">
          Pendientes
        </h4>
        {pending.length === 0 ? (
          <Card className="border-stone-200">
            <CardContent className="py-8 text-center text-stone-400 text-sm">
              Sin hitos pendientes
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.map((m) => (
              <Card
                key={m.id}
                className="border-stone-200 hover:border-emerald-300 transition-colors"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Circle className="w-4 h-4 text-stone-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-stone-800 text-sm truncate">
                            {m.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {PHASE_LABELS[m.phase as MilestonePhase] ?? m.phase}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {m.targetDate
                              ? format(new Date(m.targetDate), "dd/MM/yyyy")
                              : "—"}
                          </span>
                          {m.responsible && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {m.responsible}
                            </span>
                          )}
                          {m.notes && (
                            <span className="text-stone-400 italic truncate max-w-50">
                              {m.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleComplete(m.id)}
                        className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Cumplir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(m.id)}
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
      </div>

      {/* ── Completed milestones ── */}
      {completed.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-stone-600 mb-3">
            Cumplidos
          </h4>
          <div className="space-y-2">
            {completed.map((m) => (
              <Card
                key={m.id}
                className="border-stone-200 bg-stone-50/50 opacity-80"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-stone-600 text-sm line-through truncate">
                            {m.name}
                          </span>
                          <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700">
                            {PHASE_LABELS[m.phase as MilestonePhase] ?? m.phase}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-400 mt-1 flex-wrap">
                          {m.completedAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              {format(new Date(m.completedAt), "dd/MM/yyyy")}
                            </span>
                          )}
                          {m.notes && (
                            <span className="italic truncate max-w-50">
                              {m.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(m.id)}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── New milestone dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-emerald-600" />
              Nuevo Hito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre del hito *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Planos aprobados CCTV"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fase</Label>
                <Select value={phase} onValueChange={(v) => setPhase(v as MilestonePhase)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Ingeniería</SelectItem>
                    <SelectItem value="procurement">Suministro</SelectItem>
                    <SelectItem value="infrastructure">Infraestructura</SelectItem>
                    <SelectItem value="cabling">Cableado</SelectItem>
                    <SelectItem value="commissioning">Montaje</SelectItem>
                    <SelectItem value="delivery">Entrega Final</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha meta *</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1"
                />
              </div>
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
            <div>
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Guardando..." : "Crear hito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
