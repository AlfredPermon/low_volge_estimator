'use client';

import { useState, useEffect } from 'react';
import { Edit3, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VivotekProductItem } from '@/lib/vivotek-export';

interface EditVivotekDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: VivotekProductItem | null;
  onSave: (updatedProduct: VivotekProductItem) => void;
}

const WARRANTY_OPTIONS = [
  { label: 'Sin garantía (0%)', value: 'Sin garantía', rate: 0 },
  { label: '1 año (5%)', value: '1 año (5%)', rate: 0.05 },
  { label: '2 años (10%)', value: '2 años (10%)', rate: 0.10 },
  { label: '3 años (15%)', value: '3 años (15%)', rate: 0.15 },
];

export default function EditVivotekDeviceDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: EditVivotekDeviceDialogProps) {
  const [modelo, setModelo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioRegularCompra, setPrecioRegularCompra] = useState(0);
  const [precioProyecto, setPrecioProyecto] = useState(0);
  const [extensionGarantia, setExtensionGarantia] = useState('Sin garantía');
  const [observaciones, setObservaciones] = useState('');
  const [comentarios, setComentarios] = useState('');

  useEffect(() => {
    if (product && open) {
      setModelo(product.modelo || '');
      setDescripcion(product.descripcion || '');
      setCantidad(product.cantidad || 1);
      setPrecioRegularCompra(product.precioRegularCompra || 0);
      setPrecioProyecto(product.precioProyecto || 0);
      setExtensionGarantia(product.extensionGarantia || 'Sin garantía');
      setObservaciones(product.observaciones || '');
      setComentarios(product.comentarios || '');
    }
  }, [product, open]);

  const handleSave = () => {
    const qty = Math.max(1, Number(cantidad) || 1);
    const basePrice = Math.max(0, Number(precioProyecto) || 0);
    const opt = WARRANTY_OPTIONS.find((w) => w.value === extensionGarantia);
    const rate = opt ? opt.rate : 0;
    const unitPrice = Math.round(basePrice * (1 + rate) * 100) / 100;
    const totalPrice = Math.round(qty * unitPrice * 100) / 100;

    onSave({
      modelo: modelo.trim(),
      descripcion: descripcion.trim(),
      cantidad: qty,
      precioRegularCompra: Number(precioRegularCompra) || 0,
      precioProyecto: basePrice,
      extensionGarantia,
      precioUnitario: unitPrice,
      precioTotal: totalPrice,
      observaciones: observaciones.trim(),
      comentarios: comentarios.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-stone-200">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-stone-800">
                Editar Información de Producto
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Actualiza el modelo, descripción, cantidades y precios de la partida.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Modelo *</Label>
              <Input
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ej. MD9584-H"
                className="h-9 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Cantidad *</Label>
              <Input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="h-9 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-stone-700">Descripción detallada *</Label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Camara IP domo exterior 5 Megapixeles, Lente fijo 3.6mm, IR 50 Mts..."
              rows={3}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Precio Regular Compra</Label>
              <Input
                type="number"
                step="any"
                value={precioRegularCompra}
                onChange={(e) => setPrecioRegularCompra(Number(e.target.value))}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Precio de Proyecto</Label>
              <Input
                type="number"
                step="any"
                value={precioProyecto}
                onChange={(e) => setPrecioProyecto(Number(e.target.value))}
                className="h-9 text-xs font-semibold text-emerald-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-stone-700">Extensión de Garantía</Label>
            <Select value={extensionGarantia} onValueChange={setExtensionGarantia}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WARRANTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Observaciones</Label>
              <Input
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones de la partida"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Comentarios</Label>
              <Input
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Comentarios adicionales"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-stone-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5">
            <Check className="w-4 h-4" /> Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
