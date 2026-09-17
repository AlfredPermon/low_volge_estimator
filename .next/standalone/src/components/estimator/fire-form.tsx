'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Flame,
  Siren,
  Thermometer,
  AlertTriangle,
  Cable,
  Ruler,
  ShieldAlert,
} from 'lucide-react';
import { useEstimateStore } from '@/store/estimate-store';

const LOOP_OPTIONS = [1, 2, 4] as const;

export default function FireForm() {
  const config = useEstimateStore((s) => s.fireConfig);
  const setFireConfig = useEstimateStore((s) => s.setFireConfig);

  const update = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setFireConfig({ ...config, [key]: value });
  };

  const updatePanel = (field: 'qty' | 'loops', value: number) => {
    setFireConfig({
      ...config,
      panels: { ...config.panels, [field]: value },
    });
  };

  const totalDevices =
    config.smokeDetectors +
    config.heatDetectors +
    config.coDetectors +
    config.manualStations +
    config.strobes +
    config.hornStrobes;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-sm px-3 py-1">
          {totalDevices} dispositivo{totalDevices !== 1 ? 's' : ''} en total
        </Badge>
      </div>

      {/* Detectors */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-700">
            <Flame className="w-5 h-5" />
            Detectores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Flame className="w-3.5 h-3.5" />
                Detectores de Humo
              </Label>
              <Input
                type="number"
                min={0}
                value={config.smokeDetectors}
                onChange={(e) => update('smokeDetectors', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Thermometer className="w-3.5 h-3.5" />
                Detectores de Temperatura
              </Label>
              <Input
                type="number"
                min={0}
                value={config.heatDetectors}
                onChange={(e) => update('heatDetectors', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5" />
                Detectores de CO
              </Label>
              <Input
                type="number"
                min={0}
                value={config.coDetectors}
                onChange={(e) => update('coDetectors', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alarm Devices */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <Siren className="w-5 h-5 text-stone-500" />
            Dispositivos de Alarma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5" />
                Estaciones Manuales
              </Label>
              <Input
                type="number"
                min={0}
                value={config.manualStations}
                onChange={(e) => update('manualStations', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Siren className="w-3.5 h-3.5" />
                Estrobos
              </Label>
              <Input
                type="number"
                min={0}
                value={config.strobes}
                onChange={(e) => update('strobes', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldAlert className="w-3.5 h-3.5" />
                Horn/Strobes
              </Label>
              <Input
                type="number"
                min={0}
                value={config.hornStrobes}
                onChange={(e) => update('hornStrobes', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel & Communication */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <Cable className="w-5 h-5 text-stone-500" />
            Panel y Comunicación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Paneles de Alarma</Label>
              <Input
                type="number"
                min={0}
                value={config.panels.qty}
                onChange={(e) => updatePanel('qty', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Lazos por Panel</Label>
              <Select
                value={String(config.panels.loops)}
                onValueChange={(v) => updatePanel('loops', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOP_OPTIONS.map((l) => (
                    <SelectItem key={l} value={String(l)}>{l} lazo{l !== 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Anunciadores</Label>
              <Input
                type="number"
                min={0}
                value={config.annunciators}
                onChange={(e) => update('annunciators', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distance */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <Ruler className="w-5 h-5 text-stone-500" />
            Distancia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-w-sm">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cable className="w-3.5 h-3.5" />
              Distancia Promedio al IDF (m)
            </Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={config.avgDistanceMeters}
              onChange={(e) => update('avgDistanceMeters', Math.max(0, parseFloat(e.target.value) || 0))}
            />
            <p className="text-xs text-stone-400">
              Distancia promedio de los dispositivos al gabinete de control (IDF/MDF)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}