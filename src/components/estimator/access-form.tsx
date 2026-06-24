'use client';

import { DoorOpen, Fingerprint, Cpu, ShieldCheck, Cable, Ruler } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useEstimateStore, type AccessConfig } from '@/store/estimate-store';

export default function AccessForm() {
  const config = useEstimateStore((s) => s.accessConfig);
  const setAccessConfig = useEstimateStore((s) => s.setAccessConfig);

  const update = (key: keyof AccessConfig, value: AccessConfig[keyof AccessConfig]) => {
    setAccessConfig({ ...config, [key]: value });
  };

  const totalDevices =
    config.doors +
    config.controllers +
    config.turnstiles +
    config.magneticLocks +
    config.exitButtons +
    config.touchlessButtons;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-sm px-3 py-1">
          {totalDevices} dispositivo{totalDevices !== 1 ? 's' : ''} en total
        </Badge>
      </div>

      {/* Doors & Readers */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-700">
            <DoorOpen className="w-5 h-5" />
            Puertas y Lectoras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DoorOpen className="w-3.5 h-3.5" />
                Puertas
              </Label>
              <Input
                type="number"
                min={0}
                value={config.doors}
                onChange={(e) => update('doors', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Fingerprint className="w-3.5 h-3.5" />
                Tipo de Lectora
              </Label>
              <Select
                value={config.readerType}
                onValueChange={(v) => update('readerType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Biometrica">
                    <Fingerprint className="inline w-3 h-3 mr-1.5" />
                    Biométrica
                  </SelectItem>
                  <SelectItem value="Proximidad RFID">Proximidad RFID</SelectItem>
                  <SelectItem value="Tarjeta + PIN">Tarjeta + PIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <ShieldCheck className="w-5 h-5 text-stone-500" />
            Equipos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'controllers' as const, label: 'Controladoras', icon: Cpu },
              { key: 'turnstiles' as const, label: 'Torniquetes', icon: ShieldCheck },
              { key: 'magneticLocks' as const, label: 'Cerraduras Magnéticas', icon: DoorOpen },
              { key: 'exitButtons' as const, label: 'Botones de Salida', icon: DoorOpen },
              { key: 'touchlessButtons' as const, label: 'Botones Touchless', icon: DoorOpen },
              { key: 'softwareLicenses' as const, label: 'Licencias de Software', icon: Cpu },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={config[key]}
                  onChange={(e) =>
                    update(key, Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                />
              </div>
            ))}
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
              onChange={(e) =>
                update('avgDistanceMeters', Math.max(0, parseFloat(e.target.value) || 0))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}