'use client';

import { DoorOpen, Fingerprint, Cpu, ShieldCheck, Cable, Ruler } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

interface PriceModel {
  id: string;
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: number;
  deviceType: string;
}

function useModelsByDeviceType(deviceTypes: string[]) {
  const [models, setModels] = useState<PriceModel[]>([]);
  const [loading, setLoading] = useState(false);
  const prevKeyRef = useRef<string>('');
  const key = deviceTypes.length > 0 ? deviceTypes.join(',') : '';

  useEffect(() => {
    if (!key || key === prevKeyRef.current) return;

    prevKeyRef.current = key;
    setLoading(true);

    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set('deviceTypes', key);

    fetch(`/api/prices/models?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((json) => {
        setModels(json.data ?? []);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Error fetching models:', err);
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

export default function AccessForm() {
  const config = useEstimateStore((s) => s.accessConfig);
  const setAccessConfig = useEstimateStore((s) => s.setAccessConfig);

  const { models, loading: modelsLoading } = useModelsByDeviceType([
    'access_reader',
    'access_controller',
  ]);

  const readerModels = models.filter((m) => m.deviceType === 'access_reader');
  const controllerModels = models.filter((m) => m.deviceType === 'access_controller');

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
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Fingerprint className="w-3.5 h-3.5" />
                Modelo de Lectora
              </Label>
              <Select
                value={config.readerModelSku || '__auto__'}
                onValueChange={(v) => update('readerModelSku', v === '__auto__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={modelsLoading ? 'Cargando…' : 'Seleccionar modelo'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">
                    <span className="text-muted-foreground">Automático</span>
                  </SelectItem>
                  {readerModels.length === 0 && !modelsLoading && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Sin modelos disponibles
                    </div>
                  )}
                  {readerModels.map((m) => (
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
                {key === 'controllers' && (
                  <div className="pt-2 space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Cpu className="w-3.5 h-3.5" />
                      Modelo de Controladora
                    </Label>
                    <Select
                      value={config.controllerModelSku || '__auto__'}
                      onValueChange={(v) =>
                        update('controllerModelSku', v === '__auto__' ? '' : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={modelsLoading ? 'Cargando…' : 'Seleccionar modelo'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__auto__">
                          <span className="text-muted-foreground">Automático</span>
                        </SelectItem>
                        {controllerModels.length === 0 && !modelsLoading && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            Sin modelos disponibles
                          </div>
                        )}
                        {controllerModels.map((m) => (
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
                )}
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
