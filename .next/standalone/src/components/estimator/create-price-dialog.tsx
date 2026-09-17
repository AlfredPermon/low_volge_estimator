"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Loader2, CheckCircle2, AlertCircle, RefreshCw, Wand2 } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

import { SYSTEMS, CATEGORIES, DEVICE_TYPES, DEVICE_TYPE_LABELS } from "@/lib/constants";
import type { PriceItemFull } from "./edit-price-dialog";
import { useSkuGenerator } from "@/hooks/use-sku-generator";

interface CreatePriceDialogProps {
  /** Controla la apertura del diálogo. */
  open: boolean;
  /** Callback al cerrar el diálogo. */
  onClose: () => void;
  /** Callback cuando se crea el precio con éxito. */
  onCreated: (item: PriceItemFull) => void;
  /** Currency actual del proyecto. */
  currency: "MXN" | "USD";
}

interface FormState {
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: string;
  performance: string;
  deviceType: string;
  provider: string;
}

const EMPTY_FORM: FormState = {
  sku: "",
  system: "CCTV",
  category: "Equipo",
  brand: "",
  model: "",
  description: "",
  unit: "PZA",
  unitCost: "0",
  performance: "0",
  deviceType: "",
  provider: "",
};

const UNIT_OPTIONS = ["PZA", "ML", "LOTE", "SERV", "ROLLO", "KG", "M2", "M3"];

export default function CreatePriceDialog({
  open,
  onClose,
  onCreated,
  currency,
}: CreatePriceDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoSkuEnabled, setAutoSkuEnabled] = useState(true);
  // Ref para evitar escritura de SKU sugerido si el usuario ya modificó el campo
  const userModifiedSkuRef = useRef(false);

  // Hook para generación automática de SKU
  const {
    suggestedSku,
    isGenerating: isSkuGenerating,
    exists: skuExists,
    nextSequence,
    refreshSku,
  } = useSkuGenerator({
    system: form.system,
    category: form.category,
    enabled: autoSkuEnabled,
  });

  // Sincronizar SKU sugerido con el formulario solo si el usuario no lo ha modificado
  useEffect(() => {
    if (autoSkuEnabled && suggestedSku && !form.sku && !userModifiedSkuRef.current) {
      setForm((f) => ({ ...f, sku: suggestedSku }));
    }
  }, [autoSkuEnabled, suggestedSku, form.sku]);

  const reset = () => {
    setForm(EMPTY_FORM);
    setErrorMsg(null);
    setAutoSkuEnabled(true);
    userModifiedSkuRef.current = false;
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  // Handler para regenerar SKU manualmente
  const handleRefreshSku = async () => {
    await refreshSku();
    if (suggestedSku) {
      setForm((f) => ({ ...f, sku: suggestedSku }));
    }
  };

  const safeNum = (v: string, fallback = 0): number => {
    if (v === "" || v === "-") return fallback;
    const parsed = parseFloat(v);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validaciones mínimas
    if (!form.description.trim()) {
      setErrorMsg("La descripción es obligatoria");
      return;
    }
    if (!form.system) {
      setErrorMsg("Selecciona un sistema");
      return;
    }
    if (!form.category) {
      setErrorMsg("Selecciona una categoría");
      return;
    }
    if (!form.deviceType || form.deviceType === "none") {
      setErrorMsg("El tipo de dispositivo es obligatorio");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const body = {
        sku: form.sku.trim(),
        system: form.system,
        category: form.category,
        brand: form.brand.trim(),
        model: form.model.trim(),
        description: form.description.trim(),
        unit: form.unit,
        unitCost: safeNum(form.unitCost),
        performance: safeNum(form.performance),
        deviceType: form.deviceType,
        provider: form.provider.trim(),
        certifications: "",
        datasheetUrl: "",
        notes: "",
        crewTechnician: 0,
        crewOfficer: 0,
        crewHelper: 0,
        laborHours: 0,
        active: true,
      };

      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          err.error ||
          (err.details && typeof err.details === "object"
            ? Object.values(err.details).flat().join(", ")
            : "Error al crear el precio");
        throw new Error(msg);
      }

      const created = (await res.json()) as PriceItemFull;
      toast.success("Precio creado", {
        description: `${created.sku || created.description} se añadió correctamente`,
      });
      onCreated(created);
      reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setErrorMsg(msg);
      toast.error("Error al crear el precio", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-900">
            <Plus className="h-5 w-5 text-emerald-600" />
            Nuevo Precio
          </DialogTitle>
          <DialogDescription>
            Da de alta un nuevo precio en la base de datos. Quedará disponible inmediatamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-sku" className="text-xs font-medium">
                  SKU
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Auto</span>
                  <Switch
                    id="auto-sku"
                    checked={autoSkuEnabled}
                    onCheckedChange={(checked) => {
                      setAutoSkuEnabled(checked);
                      if (checked) {
                        userModifiedSkuRef.current = false;
                        if (suggestedSku) {
                          setForm((f) => ({ ...f, sku: suggestedSku }));
                        }
                      }
                    }}
                    disabled={submitting}
                    className="scale-75"
                  />
                </div>
              </div>
              <div className="flex gap-1.5">
                <Input
                  id="new-sku"
                  value={form.sku}
                  onChange={(e) => {
                    userModifiedSkuRef.current = true;
                    setForm((f) => ({ ...f, sku: e.target.value }));
                  }}
                  placeholder="CCTV-EQP-001"
                  className="h-9 flex-1"
                  disabled={submitting || (autoSkuEnabled && isSkuGenerating)}
                />
                {autoSkuEnabled && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshSku}
                          disabled={submitting || isSkuGenerating}
                          className="h-9 px-2 border-emerald-300"
                        >
                          <RefreshCw className={`h-4 w-4 ${isSkuGenerating ? 'animate-spin' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Regenerar SKU</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {autoSkuEnabled && suggestedSku && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${skuExists ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    {skuExists ? 'Ya existe' : 'Sugerido'}: {suggestedSku}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-system" className="text-xs font-medium">
                Sistema <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.system}
                onValueChange={(v) => setForm((f) => ({ ...f, system: v }))}
                disabled={submitting}
              >
                <SelectTrigger id="new-system" className="h-9">
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

            <div className="space-y-1.5">
              <Label htmlFor="new-category" className="text-xs font-medium">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                disabled={submitting}
              >
                <SelectTrigger id="new-category" className="h-9">
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

            <div className="space-y-1.5">
              <Label htmlFor="new-unit" className="text-xs font-medium">
                Unidad
              </Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
                disabled={submitting}
              >
                <SelectTrigger id="new-unit" className="h-9">
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

            <div className="space-y-1.5">
              <Label htmlFor="new-brand" className="text-xs font-medium">
                Marca
              </Label>
              <Input
                id="new-brand"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                placeholder="Hikvision, Bosch, etc."
                className="h-9"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-model" className="text-xs font-medium">
                Modelo
              </Label>
              <Input
                id="new-model"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="DS-2CD2T87G2"
                className="h-9"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-deviceType" className="text-xs font-medium">
                Tipo de dispositivo <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.deviceType || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, deviceType: v === "none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger id="new-deviceType" className="h-9">
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-description" className="text-xs font-medium">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Input
              id="new-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Descripción detallada del producto"
              className="h-9"
              disabled={submitting}
              required
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-unitCost" className="text-xs font-medium">
                Costo Unitario ({currency})
              </Label>
              <Input
                id="new-unitCost"
                type="number"
                step="0.01"
                min="0"
                value={form.unitCost}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unitCost: e.target.value }))
                }
                className="h-9 font-mono"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-performance" className="text-xs font-medium">
                Rendimiento
              </Label>
              <Input
                id="new-performance"
                type="number"
                step="0.1"
                min="0"
                value={form.performance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, performance: e.target.value }))
                }
                className="h-9 font-mono"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="new-provider" className="text-xs font-medium">
                Proveedor
              </Label>
              <Input
                id="new-provider"
                value={form.provider}
                onChange={(e) =>
                  setForm((f) => ({ ...f, provider: e.target.value }))
                }
                placeholder="Distribuidor / marca comercial"
                className="h-9"
                disabled={submitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Creando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Crear Precio
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
