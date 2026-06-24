'use client';

import {
  Camera,
  HardDrive,
  Cable,
  Ruler,
  Plus,
  Trash2,
} from 'lucide-react';

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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { useEstimateStore } from '@/store/estimate-store';

const CAMERA_TYPES = [
  { value: 'IP Bullet', label: 'IP Bullet' },
  { value: 'IP Domo', label: 'IP Domo' },
  { value: 'PTZ', label: 'PTZ' },
  { value: 'Fisheye', label: 'Fisheye' },
  { value: 'Analógica', label: 'Analógica' },
] as const;

const BAY_OPTIONS = [2, 4, 8] as const;

export default function CctvForm() {
  const cctvConfig = useEstimateStore((s) => s.cctvConfig);
  const setCctvConfig = useEstimateStore((s) => s.setCctvConfig);

  const totalCameras = cctvConfig.cameras.reduce((sum, c) => sum + c.qty, 0);

  const addCamera = () => {
    setCctvConfig({
      ...cctvConfig,
      cameras: [...cctvConfig.cameras, { type: 'IP Bullet', qty: 0, hasPoE: true }],
    });
  };

  const removeCamera = (index: number) => {
    if (cctvConfig.cameras.length <= 1) return;
    setCctvConfig({
      ...cctvConfig,
      cameras: cctvConfig.cameras.filter((_, i) => i !== index),
    });
  };

  const updateCamera = (index: number, field: string, value: unknown) => {
    const cameras = cctvConfig.cameras.map((c, i) =>
      i === index ? { ...c, [field]: value } : c,
    );
    setCctvConfig({ ...cctvConfig, cameras });
  };

  const updateNvr = (field: string, value: number) => {
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
            {cctvConfig.cameras.map((cam, index) => (
              <div key={index} className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
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
                <div className="w-28 space-y-1.5">
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
                <div className="w-20 space-y-1.5">
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
            ))}
          </div>
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
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cantidad NVR</Label>
              <Input
                type="number"
                min={0}
                value={cctvConfig.nvr.qty}
                onChange={(e) => updateNvr('qty', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
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
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Almacenamiento por Disco (TB)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={cctvConfig.nvr.storageTB}
                onChange={(e) => updateNvr('storageTB', Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Discos por Bahía</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={cctvConfig.nvr.disksPerBay}
                onChange={(e) => updateNvr('disksPerBay', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distance & Licenses */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <Ruler className="w-5 h-5 text-stone-500" />
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
    </div>
  );
}