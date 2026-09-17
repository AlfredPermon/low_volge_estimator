"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Save, CheckCircle2, AlertCircle, History } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { SYSTEMS, CATEGORIES, DEVICE_TYPES, DEVICE_TYPE_LABELS } from "@/lib/constants";

/**
 * Estructura completa de un PriceItem (alineada con el schema Prisma).
 * Incluye los campos ampliados C1 + A2.
 */
export interface PriceItemFull {
  id: string;
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: number;
  performance: number;
  deviceType: string;
  provider: string;
  certifications: string;
  datasheetUrl: string;
  notes: string;
  crewTechnician: number;
  crewOfficer: number;
  crewHelper: number;
  laborHours: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EditPriceDialogProps {
  /** ID del precio a editar. Si es null, el diálogo no se renderiza. */
  priceId: string | null;
  /** Callback al cerrar el diálogo. */
  onClose: () => void;
  /** Callback cuando se guarda con éxito. */
  onSaved: (updated: PriceItemFull) => void;
  /** Currency actual del proyecto para formato visual. */
  currency: "MXN" | "USD";
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 600;

const UNIT_OPTIONS = ["PZA", "ML", "LOTE", "SERV", "ROLLO", "KG", "M2", "M3"];

export default function EditPriceDialog({
  priceId,
  onClose,
  onSaved,
  currency,
}: EditPriceDialogProps) {
  const [draft, setDraft] = useState<PriceItemFull | null>(null);
  const [original, setOriginal] = useState<PriceItemFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{
    id: string;
    previousCost: number;
    newCost: number;
    delta: number;
    deltaPercent: number;
    changedBy: string;
    reason: string;
    createdAt: string;
  }>>([]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // ─── Cargar precio al abrir ──────────────────────────────────────────
  useEffect(() => {
    if (!priceId) {
      // Resetear estado de forma asíncrona para evitar cascading renders
      const timer = setTimeout(() => {
        setDraft(null);
        setOriginal(null);
        setStatus("idle");
        setErrorMsg(null);
        setHistory([]);
        setShowHistory(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    // Establecer loading de forma asíncrona
    const timer = setTimeout(() => {
      if (!cancelled) {
        setLoading(true);
        setErrorMsg(null);
      }
    }, 0);

    (async () => {
      try {
        const res = await fetch(`/api/prices/${priceId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "No se pudo cargar el precio");
        }
        if (cancelled) return;
        const data: PriceItemFull = await res.json();
        setDraft(data);
        setOriginal(data);
        lastSavedRef.current = JSON.stringify(data);
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Error desconocido";
        setErrorMsg(msg);
        toast.error("Error al cargar el precio", { description: msg });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [priceId]);

  // ─── Cargar historial cuando se solicite ─────────────────────────────
  useEffect(() => {
    if (!showHistory || !priceId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/prices/${priceId}/history`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setHistory(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        // Silencioso: el historial es informativo
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showHistory, priceId]);

  // ─── Helper para actualizar un campo numérico de forma segura ───────
  const safeNum = useCallback((v: string, fallback = 0): number => {
    if (v === "" || v === "-") return fallback;
    const parsed = parseFloat(v);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }, []);

  // ─── Actualizar un campo y disparar auto-save ───────────────────────
  const updateField = useCallback(
    <K extends keyof PriceItemFull>(field: K, value: PriceItemFull[K]) => {
      setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    [],
  );

  // ─── Auto-save con debounce ─────────────────────────────────────────
  useEffect(() => {
    if (!draft || !original) return;
    const serialized = JSON.stringify(draft);
    if (serialized === lastSavedRef.current) return;
    if (serialized === JSON.stringify(original)) {
      // No hay cambios efectivos
      setStatus("idle");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("saving");
    setErrorMsg(null);

    debounceRef.current = setTimeout(async () => {
      try {
        // Detectar cambio de costo para metadatos de auditoría
        const costChanged = draft.unitCost !== original.unitCost;
        const body: Record<string, unknown> = {
          sku: draft.sku,
          system: draft.system,
          category: draft.category,
          brand: draft.brand,
          model: draft.model,
          description: draft.description,
          unit: draft.unit,
          unitCost: draft.unitCost,
          performance: draft.performance,
          provider: draft.provider,
          certifications: draft.certifications,
          datasheetUrl: draft.datasheetUrl,
          notes: draft.notes,
          crewTechnician: draft.crewTechnician,
          crewOfficer: draft.crewOfficer,
          crewHelper: draft.crewHelper,
          laborHours: draft.laborHours,
          deviceType: draft.deviceType,
          active: draft.active,
        };
        if (costChanged) {
          body.changeReason = "Edición manual desde la interfaz";
          body.changedBy = "usuario";
        }

        const res = await fetch(`/api/prices/${draft.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Error al guardar");
        }

        const updated: PriceItemFull = await res.json();
        lastSavedRef.current = JSON.stringify(updated);
        setOriginal(updated);
        setDraft(updated);
        setStatus("saved");
        onSaved(updated);

        // Volver a estado idle tras 1.5s
        setTimeout(() => {
          setStatus((s) => (s === "saved" ? "idle" : s));
        }, 1500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        setStatus("error");
        setErrorMsg(msg);
        toast.error("Error al guardar cambios", { description: msg });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, original, onSaved]);

  // ─── Indicador de estado de guardado ────────────────────────────────
  const renderStatusBadge = () => {
    switch (status) {
      case "saving":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Guardando…
          </Badge>
        );
      case "saved":
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Guardado
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  const open = priceId !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-emerald-900">
                <Save className="h-5 w-5 text-emerald-600" />
                Editar Precio
              </DialogTitle>
              <DialogDescription>
                Los cambios se guardan automáticamente al detener la escritura.
              </DialogDescription>
            </div>
            <div className="shrink-0">{renderStatusBadge()}</div>
          </div>
        </DialogHeader>

        {loading || !draft ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-sm text-stone-600">Cargando precio…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* SKU */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-sku" className="text-xs font-medium">
                  SKU
                </Label>
                <Input
                  id="edit-sku"
                  value={draft.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                  placeholder="CCTV-CAM-001"
                  className="h-9"
                />
              </div>

              {/* Sistema */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-system" className="text-xs font-medium">
                  Sistema
                </Label>
                <Select
                  value={draft.system}
                  onValueChange={(v) => updateField("system", v)}
                >
                  <SelectTrigger id="edit-system" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEMS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Categoría */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-category" className="text-xs font-medium">
                  Categoría
                </Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => updateField("category", v)}
                >
                  <SelectTrigger id="edit-category" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de dispositivo */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-deviceType" className="text-xs font-medium">
                  Tipo de dispositivo
                </Label>
                <Select
                  value={draft.deviceType || "none"}
                  onValueChange={(v) =>
                    updateField("deviceType", v === "none" ? "" : v)
                  }
                >
                  <SelectTrigger id="edit-deviceType" className="h-9">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sin tipo —</SelectItem>
                    {DEVICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {DEVICE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Marca */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-brand" className="text-xs font-medium">
                  Marca
                </Label>
                <Input
                  id="edit-brand"
                  value={draft.brand}
                  onChange={(e) => updateField("brand", e.target.value)}
                  placeholder="Hikvision, Bosch, etc."
                  className="h-9"
                />
              </div>

              {/* Modelo */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-model" className="text-xs font-medium">
                  Modelo
                </Label>
                <Input
                  id="edit-model"
                  value={draft.model}
                  onChange={(e) => updateField("model", e.target.value)}
                  placeholder="DS-2CD2T87G2"
                  className="h-9"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-description" className="text-xs font-medium">
                Descripción
              </Label>
              <Input
                id="edit-description"
                value={draft.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Descripción detallada del producto"
                className="h-9"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Unidad */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-unit" className="text-xs font-medium">
                  Unidad
                </Label>
                <Select
                  value={draft.unit.toUpperCase()}
                  onValueChange={(v) => updateField("unit", v)}
                >
                  <SelectTrigger id="edit-unit" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Costo Unitario */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-unitCost" className="text-xs font-medium">
                  Costo Unitario ({currency})
                </Label>
                <Input
                  id="edit-unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={Number.isFinite(draft.unitCost) ? draft.unitCost : 0}
                  onChange={(e) =>
                    updateField("unitCost", safeNum(e.target.value))
                  }
                  className="h-9 font-mono"
                />
              </div>

              {/* Rendimiento */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-performance" className="text-xs font-medium">
                  Rendimiento
                </Label>
                <Input
                  id="edit-performance"
                  type="number"
                  step="0.1"
                  min="0"
                  value={Number.isFinite(draft.performance) ? draft.performance : 0}
                  onChange={(e) =>
                    updateField("performance", safeNum(e.target.value))
                  }
                  className="h-9 font-mono"
                />
              </div>
            </div>

            <Separator />

            {/* Sección de Mano de Obra por Cuadrilla */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                Mano de Obra por Cuadrilla
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-crewT" className="text-xs">
                    Técnicos
                  </Label>
                  <Input
                    id="edit-crewT"
                    type="number"
                    step="0.1"
                    min="0"
                    value={draft.crewTechnician}
                    onChange={(e) =>
                      updateField("crewTechnician", safeNum(e.target.value))
                    }
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-crewO" className="text-xs">
                    Oficiales
                  </Label>
                  <Input
                    id="edit-crewO"
                    type="number"
                    step="0.1"
                    min="0"
                    value={draft.crewOfficer}
                    onChange={(e) =>
                      updateField("crewOfficer", safeNum(e.target.value))
                    }
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-crewH" className="text-xs">
                    Ayudantes
                  </Label>
                  <Input
                    id="edit-crewH"
                    type="number"
                    step="0.1"
                    min="0"
                    value={draft.crewHelper}
                    onChange={(e) =>
                      updateField("crewHelper", safeNum(e.target.value))
                    }
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-laborH" className="text-xs">
                    Horas-Hombre
                  </Label>
                  <Input
                    id="edit-laborH"
                    type="number"
                    step="0.1"
                    min="0"
                    value={draft.laborHours}
                    onChange={(e) =>
                      updateField("laborHours", safeNum(e.target.value))
                    }
                    className="h-9 font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Campos extendidos (proveedor, certificaciones, datasheet, notas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-provider" className="text-xs font-medium">
                  Proveedor
                </Label>
                <Input
                  id="edit-provider"
                  value={draft.provider}
                  onChange={(e) => updateField("provider", e.target.value)}
                  placeholder="Distribuidor / marca comercial"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-certifications" className="text-xs font-medium">
                  Certificaciones (CSV)
                </Label>
                <Input
                  id="edit-certifications"
                  value={draft.certifications}
                  onChange={(e) => updateField("certifications", e.target.value)}
                  placeholder="UL, NOM, CE, FCC"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-datasheet" className="text-xs font-medium">
                  URL Ficha técnica
                </Label>
                <Input
                  id="edit-datasheet"
                  value={draft.datasheetUrl}
                  onChange={(e) => updateField("datasheetUrl", e.target.value)}
                  placeholder="https://..."
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-notes" className="text-xs font-medium">
                  Observaciones
                </Label>
                <Input
                  id="edit-notes"
                  value={draft.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Notas internas"
                  className="h-9"
                />
              </div>
            </div>

            <Separator />

            {/* Historial */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHistory((v) => !v)}
                className="gap-1.5"
              >
                <History className="h-4 w-4" />
                {showHistory ? "Ocultar historial" : "Ver historial de cambios"}
              </Button>

              {showHistory && (
                <div className="rounded-md border border-stone-200 bg-stone-50 p-3 max-h-48 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">
                      No hay cambios de costo registrados para este ítem.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs">
                      {history.map((h) => (
                        <li
                          key={h.id}
                          className="flex items-center justify-between border-b border-stone-200 pb-1 last:border-0"
                        >
                          <span className="font-mono text-stone-700">
                            {new Date(h.createdAt).toLocaleString("es-MX", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                          <span className="font-mono">
                            {h.previousCost.toFixed(2)} → {h.newCost.toFixed(2)}
                          </span>
                          <span
                            className={
                              h.delta >= 0
                                ? "text-emerald-700 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {h.delta >= 0 ? "+" : ""}
                            {h.deltaPercent.toFixed(1)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
