'use client';

import {
  Volume2,
  Radio,
  Speaker,
  Cable,
  Ruler,
  Plus,
  Trash2,
  Bluetooth,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useEstimateStore, type SpeakerEntry } from '@/store/estimate-store';

const SPEAKER_TYPES = [
  'Techo (Plafon)',
  'Muro',
  'Exterior',
  'IP',
] as const;

const WATT_OPTIONS = [60, 120, 240, 480] as const;

export default function PagingForm() {
  const config = useEstimateStore((s) => s.pagingConfig);
  const setPagingConfig = useEstimateStore((s) => s.setPagingConfig);

  // Defensa contra `speakers` indefinido al cargar un presupuesto antiguo.
  const speakers = Array.isArray(config?.speakers) ? config.speakers : [];

  const totalSpeakers = speakers.reduce((sum, s) => sum + (s?.qty ?? 0), 0);

  const updateSpeaker = (index: number, field: keyof SpeakerEntry, value: string | number) => {
    const updated = speakers.map((s, i) =>
      i === index ? { ...s, [field]: value } : s,
    );
    setPagingConfig({ ...config, speakers: updated });
  };

  const addSpeaker = () => {
    setPagingConfig({
      ...config,
      speakers: [...speakers, { type: SPEAKER_TYPES[0], qty: 0 }],
    });
  };

  const removeSpeaker = (index: number) => {
    if (speakers.length <= 1) return;
    setPagingConfig({
      ...config,
      speakers: speakers.filter((_, i) => i !== index),
    });
  };

  const updateField = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setPagingConfig({ ...config, [key]: value });
  };

  const updateAmp = (field: 'qty' | 'watts', value: number) => {
    setPagingConfig({
      ...config,
      amplifiers: { ...config.amplifiers, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-sm px-3 py-1">
          {totalSpeakers} bocina{totalSpeakers !== 1 ? 's' : ''} en total
        </Badge>
      </div>

      {/* Speakers */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-700">
              <Volume2 className="w-5 h-5" />
              Bocinas
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSpeaker}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="mr-1 w-4 h-4" />
              Agregar Bocina
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {speakers.map((speaker, index) => (
              <div key={index} className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tipo de Bocina</Label>
                  <Select
                    value={speaker.type}
                    onValueChange={(v) => updateSpeaker(index, 'type', v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEAKER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
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
                    value={speaker.qty}
                    onChange={(e) =>
                      updateSpeaker(index, 'qty', Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="text-center"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSpeaker(index)}
                  disabled={speakers.length <= 1}
                  className="mb-0 shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  aria-label="Eliminar bocina"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Amplifiers */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <Radio className="w-5 h-5 text-stone-500" />
            Amplificadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cantidad</Label>
              <Input
                type="number"
                min={0}
                value={config.amplifiers.qty}
                onChange={(e) =>
                  updateAmp('qty', Math.max(0, parseInt(e.target.value, 10) || 0))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Potencia (W)</Label>
              <Select
                value={String(config.amplifiers.watts)}
                onValueChange={(v) => updateAmp('watts', Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WATT_OPTIONS.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      {w} W
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zones & Others */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-stone-700">
            <Speaker className="w-5 h-5 text-stone-500" />
            Zonas y Otros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cable className="w-3.5 h-3.5" />
                Zonas
              </Label>
              <Input
                type="number"
                min={0}
                value={config.zones}
                onChange={(e) => updateField('zones', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Radio className="w-3.5 h-3.5" />
                Gateways VoIP
              </Label>
              <Input
                type="number"
                min={0}
                value={config.gateways}
                onChange={(e) => updateField('gateways', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bluetooth className="w-3.5 h-3.5" />
                Bocinas Bluetooth
              </Label>
              <Input
                type="number"
                min={0}
                value={config.bluetoothSpeakers}
                onChange={(e) => updateField('bluetoothSpeakers', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Ruler className="w-3.5 h-3.5" />
                Distancia Promedio al IDF (m)
              </Label>
              <Input
                type="number"
                min={0}
                value={config.avgDistanceMeters}
                onChange={(e) => updateField('avgDistanceMeters', Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}