'use client';

import {
  Camera,
  HardDrive,
  Cable,
  Network,
  Monitor,
  Plus,
  Trash2,
  Calculator,
  Info,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

import { useEstimateStore } from '@/store/estimate-store';
import { computeNvrDiskPlan, type RaidType, usableTbFromNominal } from '@/lib/cctv-storage';

const CAMERA_TYPES = [
  { value: 'IP Bullet', label: 'IP Bullet', deviceType: 'cctv_camera_bullet' },
  { value: 'IP Domo', label: 'IP Domo', deviceType: 'cctv_camera_domo' },
  { value: 'PTZ', label: 'PTZ', deviceType: 'cctv_camera_ptz' },
  { value: 'Fisheye', label: 'Fisheye', deviceType: 'cctv_camera_fisheye' },
  { value: 'IP Panorámica', label: 'IP Panorámica', deviceType: 'cctv_camera_panoramic' },
  { value: 'Analógica', label: 'Analógica', deviceType: 'cctv_camera_analog' },
] as const;

const BAY_OPTIONS = [2, 4, 6, 8, 16] as const;
const RAID_OPTIONS: { value: RaidType; label: string }[] = [
  { value: "NONE", label: "Sin RAID" },
  { value: "RAID1", label: "RAID 1" },
  { value: "RAID5", label: "RAID 5" },
  { value: "RAID6", label: "RAID 6" },
  { value: "RAID10", label: "RAID 10" },
];

type RecordingType = "CONTINUOUS_24_7" | "MOTION";
const RECORDING_TYPE_OPTIONS: { value: RecordingType; label: string }[] = [
  { value: "CONTINUOUS_24_7", label: "Continua 24/7" },
  { value: "MOTION", label: "Movimiento" },
];
const ACTIVITY_FACTOR_OPTIONS: { value: number; label: string }[] = [
  { value: 0.3, label: "Baja (30%)" },
  { value: 0.5, label: "Media (50%)" },
  { value: 0.7, label: "Alta (70%)" },
  { value: 1.0, label: "Crítica (100%)" },
];

const HD_CAPACITY_OPTIONS_TB = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] as const;

interface PriceModel {
  id: string;
  sku: string;
  model: string;
  brand: string;
  description: string;
  unitCost: number;
  deviceType: string;
}

// ─── Hook para cargar modelos por deviceType ───────────────────────────────────
function useModelsByDeviceType(deviceTypes: string[]) {
  const [models, setModels] = useState<PriceModel[]>([]);
  const [loading, setLoading] = useState(false);
  const prevKeyRef = useRef<string>("");
  const key = deviceTypes.length > 0 ? deviceTypes.join(",") : "";

  useEffect(() => {
    if (!key || key === prevKeyRef.current) return;

    prevKeyRef.current = key;
    setLoading(true);

    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("deviceTypes", key);

    fetch(`/api/prices/models?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((json) => {
        setModels(json.data ?? []);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error fetching models:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [key]);

  return { models, loading };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CctvForm() {
  const cctvConfig = useEstimateStore((s) => s.cctvConfig);
  const setCctvConfig = useEstimateStore((s) => s.setCctvConfig);

  // Obtener deviceTypes únicos de las cámaras actuales
  const cameraDeviceTypes = [...new Set(
    cctvConfig.cameras.map((cam) => {
      const typeInfo = CAMERA_TYPES.find((t) => t.value === cam.type);
      return typeInfo?.deviceType || 'cctv_camera_bullet';
    })
  )];

  // Siempre incluir NVR
  const allDeviceTypes = [...cameraDeviceTypes, 'cctv_nvr'];

  const { models, loading: modelsLoading } = useModelsByDeviceType(allDeviceTypes);

  // Filtrar modelos por tipo de cámara
  const getModelsForCameraType = (cameraType: string) => {
    const typeInfo = CAMERA_TYPES.find((t) => t.value === cameraType);
    if (!typeInfo) return [];
    return models.filter((m) => m.deviceType === typeInfo.deviceType);
  };

  // Filtrar modelos de NVR
  const nvrModels = models.filter((m) => {
    if (m.deviceType !== 'cctv_nvr') return false;
    const desc = m.description.toLowerCase();
    return desc.includes('nvr') || desc.includes('grabador');
  });

  // Defensa contra configuraciones corruptas
  const cameras = Array.isArray(cctvConfig?.cameras)
    ? cctvConfig.cameras
    : [];
  const safeNvr = cctvConfig?.nvr ?? { qty: 0, bays: 2, recordingDays: 30, totalStorageTB: 0, recordingType: "CONTINUOUS_24_7" as RecordingType, mbpsPerCamera: 4, motionActivityFactor: 0.5, diskNominalTB: 10, raid: "NONE" as RaidType, nvrModel: "" };

  const totalCameras = cameras.reduce((sum, c) => sum + (c?.qty ?? 0), 0);
  const hasAnyCctv = totalCameras > 0 || (safeNvr?.qty ?? 0) > 0;
  const fixedPorts = Math.max(0, Number((cctvConfig as any)?.fixedSwitchPorts ?? 4));
  const portsWithHeadroom = hasAnyCctv ? Math.ceil(totalCameras * 1.2) + fixedPorts : 0;

  let sw48 = 0;
  let sw24 = 0;
  if (portsWithHeadroom > 0) {
    sw48 = Math.floor(portsWithHeadroom / 48);
    const rem = portsWithHeadroom % 48;
    if (rem > 0) {
      if (rem <= 24) sw24 = 1;
      else sw48 += 1;
    }
  }
  const patchPanelPorts = hasAnyCctv ? totalCameras + fixedPorts : 0;
  const patchPanels48 = patchPanelPorts > 0 ? Math.ceil(patchPanelPorts / 48) : 0;
  const velcroRolls = totalCameras > 0 ? Math.ceil(totalCameras / 15) : 0;
  const maxDisks = Math.max(0, Number(safeNvr.qty) || 0) * Math.max(0, Number(safeNvr.bays) || 0);
  const requiredStorageTB = Math.max(0, Number((safeNvr as any).totalStorageTB) || 0);
  const raid = ((safeNvr as any).raid ?? "NONE") as RaidType;
  const diskPlan = computeNvrDiskPlan({ requiredUsableTB: requiredStorageTB, maxDisks, raid });
  const isNvrEnabled = (Number(safeNvr.qty) || 0) > 0;
  const missingDays = isNvrEnabled && !(Number((safeNvr as any).recordingDays) > 0);
  const missingStorage = isNvrEnabled && !(requiredStorageTB > 0);
  const recordingType = ((safeNvr as any).recordingType ?? "CONTINUOUS_24_7") as RecordingType;
  const mbpsPerCamera = Math.max(0, Number((safeNvr as any).mbpsPerCamera) || 0);
  const activityFactor = Math.min(1, Math.max(0, Number((safeNvr as any).motionActivityFactor) || 0));
  const recordingDays = Math.max(0, Number((safeNvr as any).recordingDays) || 0);
  const tbRequiredContinuous = totalCameras * mbpsPerCamera * recordingDays * 0.0108;
  const tbAdjusted = recordingType === "MOTION" ? tbRequiredContinuous * activityFactor : tbRequiredContinuous;
  const tbSuggested = tbAdjusted > 0 ? Math.ceil(tbAdjusted) : 0;
  const tbAdjustedDisplay = Math.round(tbAdjusted * 100) / 100;

  const addCamera = () => {
    setCctvConfig({
      ...cctvConfig,
      cameras: [...cameras, { type: 'IP Bullet', model: '', qty: 0, hasPoE: true }],
    });
  };

  const removeCamera = (index: number) => {
    if (cameras.length <= 1) return;
    setCctvConfig({
      ...cctvConfig,
      cameras: cameras.filter((_, i) => i !== index),
    });
  };

  const updateCamera = (index: number, field: 'type' | 'model' | 'qty' | 'hasPoE', value: string | number | boolean) => {
    const updated = cameras.map((c, i) => {
      if (i !== index) return c;
      // Si cambia el tipo, resetear el modelo
      if (field === 'type') {
        return { ...c, type: value as string, model: '' };
      }
      return { ...c, [field]: value };
    });
    setCctvConfig({ ...cctvConfig, cameras: updated });
  };

  const updateNvr = (field: string, value: number | string) => {
    setCctvConfig({
      ...cctvConfig,
      nvr: { ...cctvConfig.nvr, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-sm px-3 py-1">
          {totalCameras} cámara{totalCameras !== 1 ? 's' : ''} en total
        </Badge>
        {modelsLoading && (
          <Badge variant="outline" className="text-xs">
            Cargando modelos…
          </Badge>
        )}
      </div>

      {/* Cameras Card */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-700">
              <Camera className="w-5 h-5" />
              Cámaras
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCamera}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="mr-1 w-4 h-4" />
              Agregar Cámara
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {cameras.map((cam, index) => {
              const availableModels = getModelsForCameraType(cam.type);
              const selectedModel = availableModels.find((m) => m.sku === cam.model);

              return (
                <div key={index} className="flex items-end gap-3 flex-wrap">
                  {/* Tipo de Cámara */}
                  <div className="w-36 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tipo de Cámara</Label>
                    <Select
                      value={cam.type}
                      onValueChange={(v) => updateCamera(index, 'type', v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMERA_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Modelo de Cámara */}
                  <div className="w-48 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Modelo</Label>
                    <Select
                      value={cam.model || '__none__'}
                      onValueChange={(v) => updateCamera(index, 'model', v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={modelsLoading ? "Cargando…" : "Seleccionar modelo"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">— Sin modelo —</span>
                        </SelectItem>
                        {availableModels.length === 0 && !modelsLoading && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            Sin modelos disponibles
                          </div>
                        )}
                        {availableModels.map((m) => (
                          <SelectItem key={m.sku} value={m.sku}>
                            <span className="flex flex-col">
                              <span className="font-medium">{m.model || m.sku}</span>
                              <span className="text-xs text-muted-foreground">{m.brand}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cantidad */}
                  <div className="w-20 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cantidad</Label>
                    <Input
                      type="number"
                      min={0}
                      value={cam.qty}
                      onChange={(e) =>
                        updateCamera(index, 'qty', Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      className="text-center"
                    />
                  </div>

                  {/* PoE */}
                  <div className="w-16 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">PoE</Label>
                    <Button
                      type="button"
                      variant={cam.hasPoE ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateCamera(index, 'hasPoE', !cam.hasPoE)}
                      className={`w-full ${cam.hasPoE ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-stone-300'}`}
                    >
                      {cam.hasPoE ? 'Sí' : 'No'}
                    </Button>
                  </div>

                  {/* Eliminar */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCamera(index)}
                    disabled={cctvConfig.cameras.length <= 1}
                    className="mb-0 shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    aria-label="Eliminar cámara"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Leyenda de modelo seleccionado */}
          {totalCameras > 0 && (
            <div className="mt-3 pt-3 border-t border-emerald-100">
              <p className="text-xs text-muted-foreground">
                {cameras.filter((c) => c.model).length} de {cameras.length} cámara{cameras.length !== 1 ? 's' : ''} con modelo seleccionado
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NVR Card */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <HardDrive className="w-5 h-5 text-stone-500" />
            Servidores NVR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Tipo NVR */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo NVR</Label>
              <Select
                value={safeNvr.nvrModel || '__none__'}
                onValueChange={(v) => updateNvr('nvrModel', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={modelsLoading ? "Cargando…" : "Seleccionar NVR"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">— Sin modelo —</span>
                  </SelectItem>
                  {nvrModels.length === 0 && !modelsLoading && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Sin NVRs disponibles
                    </div>
                  )}
                  {nvrModels.map((m) => (
                    <SelectItem key={m.sku} value={m.sku}>
                      <span className="flex flex-col">
                        <span className="font-medium">{m.model || m.sku}</span>
                        <span className="text-xs text-muted-foreground">{m.brand}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cantidad NVR */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cantidad NVR</Label>
              <Input
                type="number"
                min={0}
                value={cctvConfig.nvr.qty}
                onChange={(e) => updateNvr('qty', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>

            {/* Bahías de Disco */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Bahías de Disco</Label>
              <Select
                value={String(cctvConfig.nvr.bays)}
                onValueChange={(v) => updateNvr('bays', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAY_OPTIONS.map((b) => (
                    <SelectItem key={b} value={String(b)}>{b} bahías</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Días de grabación */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Días de grabación</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={(cctvConfig.nvr as any).recordingDays ?? 0}
                onChange={(e) => updateNvr('recordingDays', Math.max(0, parseInt(e.target.value, 10) || 0))}
                className={missingDays ? "border-red-300 focus-visible:ring-red-300" : ""}
              />
            </div>

            {/* Tipo de grabación */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de grabación</Label>
              <Select
                value={String((cctvConfig.nvr as any).recordingType ?? "CONTINUOUS_24_7")}
                onValueChange={(v) => updateNvr('recordingType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORDING_TYPE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mbps por cámara */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mbps por cámara</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={(cctvConfig.nvr as any).mbpsPerCamera ?? 0}
                onChange={(e) => updateNvr('mbpsPerCamera', Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>

            {/* Factor de actividad */}
            {String((cctvConfig.nvr as any).recordingType ?? "CONTINUOUS_24_7") === "MOTION" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Factor de actividad</Label>
                <Select
                  value={String((cctvConfig.nvr as any).motionActivityFactor ?? 0.5)}
                  onValueChange={(v) => updateNvr('motionActivityFactor', Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_FACTOR_OPTIONS.map((o) => (
                      <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Capacidad de HD */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Capacidad nominal WD Purple</Label>
              <Select
                value={String((cctvConfig.nvr as any).diskNominalTB ?? 10)}
                onValueChange={(v) => updateNvr('diskNominalTB', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HD_CAPACITY_OPTIONS_TB.map((tb) => (
                    <SelectItem key={tb} value={String(tb)}>{tb} TB</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tamaño total requerido */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tamaño total requerido (TB)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={(cctvConfig.nvr as any).totalStorageTB ?? 0}
                onChange={(e) => updateNvr('totalStorageTB', Math.max(0, parseInt(e.target.value, 10) || 0))}
                className={missingStorage ? "border-red-300 focus-visible:ring-red-300" : ""}
              />
            </div>

            {/* RAID */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">RAID</Label>
              <Select
                value={String((cctvConfig.nvr as any).raid ?? "NONE")}
                onValueChange={(v) => updateNvr('raid', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RAID_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isNvrEnabled && (missingDays || missingStorage) && (
            <div className="mt-3 text-xs text-red-600">
              Completa los campos obligatorios: días de grabación y tamaño total requerido (TB).
            </div>
          )}

          {isNvrEnabled && requiredStorageTB > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {diskPlan.ok ? (
                <>
                  <Badge variant="outline" className="text-xs">
                    Discos: {diskPlan.diskCount}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Por disco: {diskPlan.diskNominalTB}TB (≈ {usableTbFromNominal(diskPlan.diskNominalTB)} TB útiles)
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Útil total (RAID): {diskPlan.totalUsableTB} TB
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Bahías usadas: {diskPlan.diskCount}/{maxDisks}
                  </Badge>
                </>
              ) : (
                <div className="text-xs text-red-600">
                  {diskPlan.error}
                </div>
              )}
            </div>
          )}

          {isNvrEnabled && totalCameras > 0 && recordingDays > 0 && mbpsPerCamera > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                TB calculados: {tbAdjustedDisplay} (sugerido: {tbSuggested} TB)
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateNvr('totalStorageTB', tbSuggested)}
                disabled={tbSuggested <= 0}
              >
                Usar sugerido
              </Button>
              <div className="w-full text-xs text-muted-foreground">
                Continua 24/7: TB = Cámaras × Mbps × Días × 0.0108. Movimiento: TB ajustados = TB × Factor de actividad.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workstation Card */}
      <Card className="border-violet-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-violet-700">
            <Monitor className="w-5 h-5 text-violet-500" />
            Estación de Trabajo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Guide Table */}
          <div className="bg-violet-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-violet-600" />
              <span className="text-xs font-medium text-violet-700">Guía de dimensionamiento</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white rounded p-2 text-center">
                <div className="font-medium text-violet-600">Pequeño</div>
                <div className="text-muted-foreground">1-16 cámaras</div>
                <div className="text-violet-500">1 estación</div>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <div className="font-medium text-violet-600">Mediano</div>
                <div className="text-muted-foreground">17-64 cámaras</div>
                <div className="text-violet-500">1-2 estaciones</div>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <div className="font-medium text-violet-600">Grande</div>
                <div className="text-muted-foreground">65-128 cámaras</div>
                <div className="text-violet-500">2-4 estaciones</div>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <div className="font-medium text-violet-600">Corporativo</div>
                <div className="text-muted-foreground">129-256 cámaras</div>
                <div className="text-violet-500">4-6 estaciones</div>
              </div>
              <div className="bg-white rounded p-2 text-center col-span-2">
                <div className="font-medium text-violet-600">Campus/Multi-site</div>
                <div className="text-muted-foreground">&gt;256 cámaras</div>
                <div className="text-violet-500">Según operadores, zonas y turnos</div>
              </div>
            </div>
          </div>

          {/* Calculation Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Cantidad de cámaras (calculada o manual) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                Cámaras en sistema
              </Label>
              <Input
                type="number"
                min={0}
                value={cctvConfig.workstation.cameraCount}
                onChange={(e) => {
                  const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                  const ws = cctvConfig.workstation;
                  setCctvConfig({
                    ...cctvConfig,
                    workstation: { ...ws, cameraCount: value }
                  });
                }}
                className="border-violet-200 focus-visible:ring-violet-300"
              />
              <p className="text-xs text-muted-foreground">
                Total: {totalCameras} cámaras configuradas
              </p>
            </div>

            {/* Bitrate por cámara */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Bitrate (Mbps/cámara)</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={cctvConfig.workstation.bitratePerCamera}
                onChange={(e) => {
                  const value = Math.max(0.1, parseFloat(e.target.value) || 4);
                  const ws = cctvConfig.workstation;
                  setCctvConfig({
                    ...cctvConfig,
                    workstation: { ...ws, bitratePerCamera: value }
                  });
                }}
                className="border-violet-200 focus-visible:ring-violet-300"
              />
              <p className="text-xs text-muted-foreground">Estándar: 4 Mbps</p>
            </div>

            {/* Cámaras por pantalla */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cámaras/pantalla</Label>
              <Input
                type="number"
                min={1}
                value={cctvConfig.workstation.camerasPerScreen}
                onChange={(e) => {
                  const value = Math.max(1, parseInt(e.target.value, 10) || 9);
                  const ws = cctvConfig.workstation;
                  setCctvConfig({
                    ...cctvConfig,
                    workstation: { ...ws, camerasPerScreen: value }
                  });
                }}
                className="border-violet-200 focus-visible:ring-violet-300"
              />
              <p className="text-xs text-muted-foreground">3×3 = 9 cámaras típico</p>
            </div>

            {/* Estaciones deseadas */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Estaciones requeridas</Label>
              <Input
                type="number"
                min={0}
                value={cctvConfig.workstation.desiredStations}
                onChange={(e) => {
                  const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                  const ws = cctvConfig.workstation;
                  setCctvConfig({
                    ...cctvConfig,
                    workstation: { ...ws, desiredStations: value }
                  });
                }}
                className="border-violet-200 focus-visible:ring-violet-300"
              />
            </div>
          </div>

          {/* Auto-calculation result */}
          {(() => {
            const camCount = cctvConfig.workstation.cameraCount || totalCameras;
            const bitrate = cctvConfig.workstation.bitratePerCamera;
            const perScreen = cctvConfig.workstation.camerasPerScreen;
            const screensNeeded = perScreen > 0 ? Math.ceil(camCount / perScreen) : 0;
            
            const recommendedStations = (() => {
              if (camCount <= 0) return 0;
              if (camCount <= 16) return 1;
              if (camCount <= 64) return camCount <= 40 ? 1 : 2;
              if (camCount <= 128) {
                if (camCount <= 86) return 2;
                if (camCount <= 108) return 3;
                return 4;
              }
              if (camCount <= 256) {
                if (camCount <= 171) return 4;
                if (camCount <= 214) return 5;
                return 6;
              }
              return Math.ceil(camCount / 64);
            })();

            let systemSize = "Pequeño";
            if (camCount > 256) systemSize = "Campus/Multi-site";
            else if (camCount > 128) systemSize = "Corporativo";
            else if (camCount > 64) systemSize = "Grande";
            else if (camCount > 16) systemSize = "Mediano";

            const stationsUsed = Math.max(cctvConfig.workstation.desiredStations, recommendedStations);

            const visibleCamerasPerStation = Math.min(camCount, perScreen * 2);
            const visualizationLoadPerStation = visibleCamerasPerStation * bitrate;
            const visualizationLoadTotal = visualizationLoadPerStation * stationsUsed;
            const stationsForAllScreens = screensNeeded > 0 ? Math.ceil(screensNeeded / 2) : 0;

            return (
              <div className="bg-linear-to-r from-violet-100 to-purple-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-medium text-violet-700">Cálculo de carga de visualización</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Carga total hacia estación(es)</div>
                    <div className="text-xl font-bold text-violet-700">
                      {visualizationLoadTotal.toLocaleString()} <span className="text-sm font-normal text-violet-500">Mbps</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Por estación: {visualizationLoadPerStation.toLocaleString()} Mbps ({visibleCamerasPerStation} cam × {bitrate} Mbps)
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Pantallas necesarias</div>
                    <div className="text-xl font-bold text-violet-700">{screensNeeded}</div>
                    <div className="text-xs text-muted-foreground mt-1">Con 2 monitores/estación: {stationsForAllScreens} estación(es)</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Estaciones recomendadas</div>
                    <div className="text-xl font-bold text-violet-700">{recommendedStations}</div>
                    <div className="text-xs text-muted-foreground mt-1">{systemSize}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Estaciones a presupuestar</div>
                    <div className="text-xl font-bold text-violet-700">{stationsUsed}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {cctvConfig.workstation.desiredStations > 0
                        ? (cctvConfig.workstation.desiredStations < recommendedStations ? "Ajustado" : "Manual")
                        : "Auto"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <Separator className="my-4" />

          {/* Equipment per station */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-stone-700">Equipos por estación de trabajo</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cada estación incluye: 2 monitores 27", 1 base de escritorio articulado, 1 computadora de alto rendimiento
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Pantallas 43" */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pantallas 43" (Video Wall)</Label>
                <Input
                  type="number"
                  min={0}
                  value={cctvConfig.workstation.screen43Qty}
                  onChange={(e) => {
                    const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                    const ws = cctvConfig.workstation;
                    setCctvConfig({
                      ...cctvConfig,
                      workstation: { ...ws, screen43Qty: value }
                    });
                  }}
                  className="border-violet-200"
                />
                <p className="text-xs text-muted-foreground">CCTV-NVR-015 · $16,976.84</p>
              </div>

              {/* Pantallas 55" */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pantallas 55" (Video Wall)</Label>
                <Input
                  type="number"
                  min={0}
                  value={cctvConfig.workstation.screen55Qty}
                  onChange={(e) => {
                    const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                    const ws = cctvConfig.workstation;
                    setCctvConfig({
                      ...cctvConfig,
                      workstation: { ...ws, screen55Qty: value }
                    });
                  }}
                  className="border-violet-200"
                />
                <p className="text-xs text-muted-foreground">CCTV-NVR-016 · $27,276.56</p>
              </div>

              {/* Bases de escritorio */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bases de escritorio (2 monitores)</Label>
                <Input
                  type="number"
                  min={0}
                  value={cctvConfig.workstation.monitorArmQty}
                  onChange={(e) => {
                    const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                    const ws = cctvConfig.workstation;
                    setCctvConfig({
                      ...cctvConfig,
                      workstation: { ...ws, monitorArmQty: value }
                    });
                  }}
                  className="border-violet-200"
                />
                <p className="text-xs text-muted-foreground">CCTV-NVR-012 · $2,749.91</p>
              </div>

              {/* Computadoras */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Computadoras alto rendimiento</Label>
                <Input
                  type="number"
                  min={0}
                  value={cctvConfig.workstation.workstationPCQty}
                  onChange={(e) => {
                    const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                    const ws = cctvConfig.workstation;
                    setCctvConfig({
                      ...cctvConfig,
                      workstation: { ...ws, workstationPCQty: value }
                    });
                  }}
                  className="border-violet-200"
                />
                <p className="text-xs text-muted-foreground">CCTV-NVR-024 · $54,225.03</p>
              </div>
            </div>

            {/* Auto-fill buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const ws = cctvConfig.workstation;
                  const camCount = ws.cameraCount || totalCameras;
                  const recommendedStations = (() => {
                    if (camCount <= 0) return 0;
                    if (camCount <= 16) return 1;
                    if (camCount <= 64) return camCount <= 40 ? 1 : 2;
                    if (camCount <= 128) {
                      if (camCount <= 86) return 2;
                      if (camCount <= 108) return 3;
                      return 4;
                    }
                    if (camCount <= 256) {
                      if (camCount <= 171) return 4;
                      if (camCount <= 214) return 5;
                      return 6;
                    }
                    return Math.ceil(camCount / 64);
                  })();
                  const stations = Math.max(ws.desiredStations, recommendedStations);
                  setCctvConfig({
                    ...cctvConfig,
                    workstation: {
                      ...ws,
                      monitorArmQty: stations,
                      workstationPCQty: stations,
                    }
                  });
                }}
                className="border-violet-300 text-violet-700 hover:bg-violet-50"
              >
                Auto-fill: {(() => {
                  const ws = cctvConfig.workstation;
                  const camCount = ws.cameraCount || totalCameras;
                  const recommendedStations = (() => {
                    if (camCount <= 0) return 0;
                    if (camCount <= 16) return 1;
                    if (camCount <= 64) return camCount <= 40 ? 1 : 2;
                    if (camCount <= 128) {
                      if (camCount <= 86) return 2;
                      if (camCount <= 108) return 3;
                      return 4;
                    }
                    if (camCount <= 256) {
                      if (camCount <= 171) return 4;
                      if (camCount <= 214) return 5;
                      return 6;
                    }
                    return Math.ceil(camCount / 64);
                  })();
                  return Math.max(ws.desiredStations, recommendedStations);
                })()} estación(es)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const ws = cctvConfig.workstation;
                  setCctvConfig({
                    ...cctvConfig,
                    workstation: {
                      ...ws,
                      cameraCount: totalCameras,
                    }
                  });
                }}
                disabled={totalCameras === 0}
                className="border-violet-300 text-violet-700 hover:bg-violet-50"
              >
                Usar {totalCameras} cámaras configuradas
              </Button>
            </div>

            {/* Equipment summary */}
            {(() => {
              const ws = cctvConfig.workstation;
              const camCount = ws.cameraCount || totalCameras;
              const recommendedStations = (() => {
                if (camCount <= 0) return 0;
                if (camCount <= 16) return 1;
                if (camCount <= 64) return camCount <= 40 ? 1 : 2;
                if (camCount <= 128) {
                  if (camCount <= 86) return 2;
                  if (camCount <= 108) return 3;
                  return 4;
                }
                if (camCount <= 256) {
                  if (camCount <= 171) return 4;
                  if (camCount <= 214) return 5;
                  return 6;
                }
                return Math.ceil(camCount / 64);
              })();
              const stations = Math.max(ws.desiredStations, recommendedStations);
              const monitor27Qty = stations > 0 ? stations * 2 : 0;
              const wallMountQty = ws.screen43Qty + ws.screen55Qty;
              const hasEquipment = ws.screen43Qty > 0 || ws.screen55Qty > 0 || wallMountQty > 0 || ws.monitorArmQty > 0 || ws.workstationPCQty > 0 || monitor27Qty > 0;
              const screen43Price = 16976.84;
              const screen55Price = 27276.56;
              const wallMountPrice = 1091.06;
              const monitor27Price = 8518.67;
              const monitorArmPrice = 2749.91;
              const pcPrice = 54225.03;
              const subtotal = (ws.screen43Qty * screen43Price)
                + (ws.screen55Qty * screen55Price)
                + (wallMountQty * wallMountPrice)
                + (monitor27Qty * monitor27Price)
                + (ws.monitorArmQty * monitorArmPrice)
                + (ws.workstationPCQty * pcPrice);
              
              if (!hasEquipment) return null;
              
              return (
                <div className="bg-stone-50 rounded-lg p-3 mt-3">
                  <div className="text-xs font-medium text-stone-600 mb-2">Resumen de equipos</div>
                  <div className="space-y-1 text-xs">
                    {ws.screen43Qty > 0 && (
                      <div className="flex justify-between">
                        <span>CCTV-NVR-015 Pantalla 43" × {ws.screen43Qty}</span>
                        <span className="font-medium">${(ws.screen43Qty * screen43Price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {ws.screen55Qty > 0 && (
                      <div className="flex justify-between">
                        <span>CCTV-NVR-016 Pantalla 55" × {ws.screen55Qty}</span>
                        <span className="font-medium">${(ws.screen55Qty * screen55Price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {wallMountQty > 0 && (
                      <div className="flex justify-between">
                        <span>CCTV-NVR-013 Montaje pared × {wallMountQty}</span>
                        <span className="font-medium">${(wallMountQty * wallMountPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {monitor27Qty > 0 && (
                      <div className="flex justify-between">
                        <span>CCTV-NVR-029 Monitor 27" × {monitor27Qty}</span>
                        <span className="font-medium">${(monitor27Qty * monitor27Price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {ws.monitorArmQty > 0 && (
                      <div className="flex justify-between">
                        <span>CCTV-NVR-012 Base escritorio × {ws.monitorArmQty}</span>
                        <span className="font-medium">${(ws.monitorArmQty * monitorArmPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {ws.workstationPCQty > 0 && (
                      <div className="flex justify-between">
                        <span>CCTV-NVR-024 Computadora × {ws.workstationPCQty}</span>
                        <span className="font-medium">${(ws.workstationPCQty * pcPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium text-stone-700">
                      <span>Subtotal estación de trabajo</span>
                      <span className="text-violet-700">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Distance & Licenses */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <Cable className="w-5 h-5 text-stone-500" />
            Distancia y Licencias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cable className="w-3.5 h-3.5" />
                Distancia Promedio al IDF (m)
              </Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={cctvConfig.avgDistanceMeters}
                onChange={(e) =>
                  setCctvConfig({ ...cctvConfig, avgDistanceMeters: Math.max(0, parseFloat(e.target.value) || 0) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Licencias Adicionales</Label>
              <Input
                type="number"
                min={0}
                value={cctvConfig.licenses}
                onChange={(e) =>
                  setCctvConfig({ ...cctvConfig, licenses: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-BOM / Servicios */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <Network className="w-5 h-5 text-stone-500" />
            Auto-dimensionamiento (BOM) y Servicios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Puertos (cámaras × 1.2 + fijos): {portsWithHeadroom}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Switches: {sw48}×48p + {sw24}×24p
            </Badge>
            <Badge variant="outline" className="text-xs">
              Patch panels 48p: {patchPanels48}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Velcro (rollos): {velcroRolls}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Puertos fijos (uplink/NVR/spare)</Label>
              <Input
                type="number"
                min={0}
                value={cctvConfig.fixedSwitchPorts}
                onChange={(e) =>
                  setCctvConfig({
                    ...cctvConfig,
                    fixedSwitchPorts: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Canalización</Label>
              <Select
                value={cctvConfig.conduitMode}
                onValueChange={(v) =>
                  setCctvConfig({ ...cctvConfig, conduitMode: (v === "ML" ? "ML" : "LOTE") })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOTE">LOTE (SKU CAN-LOT)</SelectItem>
                  <SelectItem value="ML">ML (detalle por metro + accesorios)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Servicios detallados</Label>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  checked={cctvConfig.useDetailedServices}
                  onCheckedChange={(v) =>
                    setCctvConfig({ ...cctvConfig, useDetailedServices: Boolean(v) })
                  }
                />
                <span className="text-sm">Activar</span>
              </div>
            </div>
          </div>

          {cctvConfig.useDetailedServices && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Instalación de cableado</Label>
                  <Select
                    value={cctvConfig.cablingInstallMode}
                    onValueChange={(v) =>
                      setCctvConfig({ ...cctvConfig, cablingInstallMode: (v === "LOTE" ? "LOTE" : "POR_CAMARA") })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POR_CAMARA">Por cámara</SelectItem>
                      <SelectItem value="LOTE">Por lote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={cctvConfig.includeCertificationLabeling}
                    onCheckedChange={(v) =>
                      setCctvConfig({ ...cctvConfig, includeCertificationLabeling: Boolean(v) })
                    }
                  />
                  Certificación / etiquetado (por cámara)
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={cctvConfig.includeAsBuilt}
                    onCheckedChange={(v) =>
                      setCctvConfig({ ...cctvConfig, includeAsBuilt: Boolean(v) })
                    }
                  />
                  As-built (1)
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={cctvConfig.includeCablingInstall}
                    onCheckedChange={(v) =>
                      setCctvConfig({ ...cctvConfig, includeCablingInstall: Boolean(v) })
                    }
                  />
                  Instalación de cableado
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={cctvConfig.includeCctvInstallConfig}
                    onCheckedChange={(v) =>
                      setCctvConfig({ ...cctvConfig, includeCctvInstallConfig: Boolean(v) })
                    }
                  />
                  Instalación / configuración CCTV (1)
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={cctvConfig.includeMisc}
                    onCheckedChange={(v) =>
                      setCctvConfig({ ...cctvConfig, includeMisc: Boolean(v) })
                    }
                  />
                  Misceláneos (1)
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
