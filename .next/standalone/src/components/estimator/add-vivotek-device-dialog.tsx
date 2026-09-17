'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  Package,
  Layers,
  CheckCircle,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useEstimateStore } from '@/store/estimate-store';
import { toast } from 'sonner';
import { VivotekProductItem } from '@/lib/vivotek-export';

interface PriceCatalogItem {
  id: string;
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: number;
}

interface AddVivotekDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (item: VivotekProductItem) => void;
}

const SUPPORTED_SYSTEMS = [
  { id: 'CCTV', name: 'CCTV — Videovigilancia' },
  { id: 'TODOS', name: 'Todos los Sistemas' },
  { id: 'ACCESO', name: 'Control de Acceso' },
  { id: 'VOCEO', name: 'Sistema de Voceo' },
  { id: 'INCENDIO', name: 'Detección de Incendio' },
];

const CATEGORIES = [
  'Todas',
  'Equipo',
  'Accesorio',
  'Consumible',
  'Mano de Obra',
  'Servicio',
];

function formatMoney(val: number): string {
  const safe = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export default function AddVivotekDeviceDialog({
  open,
  onOpenChange,
  onAddProduct,
}: AddVivotekDeviceDialogProps) {
  const currency = useEstimateStore((s) => s.currency);

  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [selectedSystem, setSelectedSystem] = useState<string>('CCTV');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Items de la BD
  const [catalogItems, setCatalogItems] = useState<PriceCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<PriceCatalogItem | null>(null);

  // Item personalizado
  const [customModel, setCustomModel] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customUnitCost, setCustomUnitCost] = useState<number>(0);
  const [customWarranty, setCustomWarranty] = useState<string>('Sin garantía');
  const [customNotes, setCustomNotes] = useState<string>('');

  // Cantidad común
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (open) {
      setSelectedCatalogItem(null);
      setSearchQuery('');
      setQuantity(1);
      setActiveTab('catalog');
      setCustomModel('');
      setCustomDescription('');
      setCustomUnitCost(0);
      setCustomWarranty('Sin garantía');
      setCustomNotes('');
      fetchPrices();
    }
  }, [open]);

  const fetchPrices = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/prices?limit=1000');
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json ?? [];
        setCatalogItems(data);
      }
    } catch {
      toast.error('No se pudo cargar el catálogo de precios');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper de filtrado VIVOTEK
  const isVivotekEquipmentItem = (item: PriceCatalogItem) => {
    const d = (item.description || '').toLowerCase();
    const b = (item.brand || '').toLowerCase();
    const m = (item.model || '').toLowerCase();

    const excludedBrands = ['samsung', 'unifi', 'ubiquiti', 'netrunner', 'western digital', 'western', 'zkteco', 'accespro', 'surix', 'hochiki', 'belden', 'rymco', 'pannet', 'hkvision', 'hikvision', 'dahua'];
    if (excludedBrands.some((eb) => b.includes(eb) || d.includes(eb) || m.includes(eb))) {
      return false;
    }

    const excludedKeywords = [
      'monitor', 'pantalla', 'montaje', 'organizador', 'disco duro', 'licencia', 'bobina',
      'cable', 'sujeción', 'codo', 'cople', 'terminal', 'chapa', 'botón', 'altavoz',
      'computadora', 'detector', 'estación manual', 'estrobo', 'anunciador', 'conector',
      'tablero', 'base para sensor', 'batería', 'tubería', 'tubo', 'abrazadera'
    ];
    if (excludedKeywords.some((kw) => d.includes(kw))) {
      return false;
    }

    const isVivotekBrand = b.includes('vivotek') || b === '' || m.startsWith('md') || m.startsWith('ib') || m.startsWith('sd') || m.startsWith('fd') || m.startsWith('nr') || m.startsWith('aw-');
    const isCameraNvrSwitch =
      d.includes('camara') || d.includes('cámara') ||
      d.includes('grabador') || d.includes('nvr') ||
      d.includes('switch') || d.includes('poe');

    return isVivotekBrand && isCameraNvrSwitch;
  };

  // Filtrado dinámico del catálogo
  const filteredCatalogItems = useMemo(() => {
    return catalogItems.filter((item) => {
      if (!isVivotekEquipmentItem(item)) {
        return false;
      }
      if (selectedSystem && selectedSystem !== 'TODOS' && item.system !== selectedSystem) {
        return false;
      }
      if (selectedCategory && selectedCategory !== 'Todas' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const skuMatch = item.sku?.toLowerCase().includes(q);
        const brandMatch = item.brand?.toLowerCase().includes(q);
        const modelMatch = item.model?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        if (!skuMatch && !brandMatch && !modelMatch && !descMatch) {
          return false;
        }
      }
      return true;
    });
  }, [catalogItems, selectedSystem, selectedCategory, searchQuery]);

  const subtotalPreview = useMemo(() => {
    const qty = Math.max(0, Number(quantity) || 0);
    const unitPrice =
      activeTab === 'catalog'
        ? selectedCatalogItem?.unitCost ?? 0
        : Math.max(0, Number(customUnitCost) || 0);
    return qty * unitPrice;
  }, [activeTab, selectedCatalogItem, customUnitCost, quantity]);

  const handleConfirmAdd = () => {
    const qty = Math.max(1, Number(quantity) || 1);

    if (activeTab === 'catalog') {
      if (!selectedCatalogItem) {
        toast.error('Selecciona un dispositivo del catálogo');
        return;
      }

      const modelName = selectedCatalogItem.model || selectedCatalogItem.sku || 'Modelo VIVOTEK';
      const cost = Number(selectedCatalogItem.unitCost) || 0;

      onAddProduct({
        modelo: modelName,
        descripcion: selectedCatalogItem.description,
        cantidad: qty,
        precioRegularCompra: 0,
        precioProyecto: 0,
        extensionGarantia: 'Sin garantía',
        precioUnitario: 0,
        precioTotal: 0,
        observaciones: `Marca: ${selectedCatalogItem.brand || 'VIVOTEK'}`,
        comentarios: `SKU: ${selectedCatalogItem.sku}`,
      });

      toast.success(`Producto "${modelName}" agregado al registro`);
    } else {
      if (!customDescription.trim()) {
        toast.error('La descripción del producto es obligatoria');
        return;
      }

      const cost = Math.max(0, Number(customUnitCost) || 0);

      onAddProduct({
        modelo: customModel.trim() || 'Modelo Personalizado',
        descripcion: customDescription.trim(),
        cantidad: qty,
        precioRegularCompra: cost,
        precioProyecto: cost,
        extensionGarantia: customWarranty,
        precioUnitario: cost,
        precioTotal: Math.round(cost * qty * 100) / 100,
        observaciones: customNotes.trim(),
        comentarios: 'Agregado manualmente',
      });

      toast.success(`Producto "${customModel || 'Personalizado'}" agregado`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden border-stone-200">
        {/* Header Modal */}
        <DialogHeader className="p-5 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-stone-800">
                  Agregar Nueva Fila al Registro
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  Selecciona un dispositivo del catálogo de precios o crea una partida personalizada.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold px-3 py-1">
              Sistema: {selectedSystem}
            </Badge>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'catalog' | 'custom')}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <TabsList className="bg-stone-100">
                <TabsTrigger value="catalog" className="gap-2 text-xs font-semibold">
                  <Package className="h-3.5 w-3.5 text-emerald-600" />
                  Buscar en Catálogo
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-2 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Dispositivo Personalizado
                </TabsTrigger>
              </TabsList>

              {/* Selector de Sistema Destino */}
              <div className="flex items-center gap-2">
                <Label htmlFor="viv-system-select" className="text-xs font-medium text-stone-600 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-stone-400" />
                  Sistema:
                </Label>
                <select
                  id="viv-system-select"
                  value={selectedSystem}
                  onChange={(e) => setSelectedSystem(e.target.value)}
                  className="h-8 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {SUPPORTED_SYSTEMS.map((sys) => (
                    <option key={sys.id} value={sys.id}>
                      {sys.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* TAB: BÚSQUEDA EN CATÁLOGO */}
            <TabsContent value="catalog" className="space-y-4 m-0">
              {/* Barra de búsqueda y Filtro de Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por código (SKU), marca, modelo o descripción..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs border-stone-300"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-stone-400 shrink-0" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-stone-300 bg-white px-2.5 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        Categoría: {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabla de resultados del catálogo */}
              <div className="rounded-lg border border-stone-200 overflow-hidden bg-white max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-stone-500">
                    Cargando productos del catálogo...
                  </div>
                ) : filteredCatalogItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-500">
                    No se encontraron dispositivos que coincidan con la búsqueda.
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-stone-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="text-[11px] font-semibold">Código / SKU</TableHead>
                        <TableHead className="text-[11px] font-semibold">Marca / Modelo</TableHead>
                        <TableHead className="text-[11px] font-semibold">Descripción</TableHead>
                        <TableHead className="text-[11px] font-semibold text-center">Unidad</TableHead>
                        <TableHead className="text-[11px] font-semibold text-right">P.U.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCatalogItems.map((item) => {
                        const isSelected = selectedCatalogItem?.id === item.id;
                        return (
                          <TableRow
                            key={item.id}
                            onClick={() => setSelectedCatalogItem(item)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-50/80 hover:bg-emerald-50'
                                : 'hover:bg-stone-50'
                            }`}
                          >
                            <TableCell className="p-2 text-center">
                              <div
                                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-stone-300'
                                }`}
                              >
                                {isSelected && <CheckCircle className="h-3 w-3" />}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono font-semibold text-stone-800 p-2">
                              {item.sku}
                            </TableCell>
                            <TableCell className="text-xs text-stone-600 p-2">
                              {item.brand || '—'} {item.model ? `(${item.model})` : ''}
                            </TableCell>
                            <TableCell className="text-xs text-stone-700 p-2 max-w-xs truncate" title={item.description}>
                              {item.description}
                            </TableCell>
                            <TableCell className="text-xs text-center text-stone-500 p-2">
                              {item.unit}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-right tabular-nums text-emerald-700 p-2">
                              {formatMoney(item.unitCost)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* TAB: DISPOSITIVO PERSONALIZADO */}
            <TabsContent value="custom" className="space-y-3 m-0 bg-stone-50/50 p-4 rounded-lg border border-stone-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-stone-600 font-semibold">Modelo / Nombre</Label>
                  <Input
                    type="text"
                    placeholder="Ej. MD9584-H"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="h-8 text-xs bg-white border-stone-300 mt-1 font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs text-stone-600 font-semibold">Precio de Proyecto (P.U.)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={customUnitCost}
                    onChange={(e) => setCustomUnitCost(Number(e.target.value) || 0)}
                    className="h-8 text-xs bg-white border-stone-300 mt-1 tabular-nums font-semibold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-stone-600 font-semibold">Descripción detallada *</Label>
                <Input
                  type="text"
                  placeholder="Ej. Camara IP domo exterior 5 MP, Lente fijo 3.6mm, IR 50m, IP68, IK10"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="h-8 text-xs bg-white border-stone-300 mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-stone-600">Extensión de Garantía</Label>
                  <select
                    value={customWarranty}
                    onChange={(e) => setCustomWarranty(e.target.value)}
                    className="w-full h-8 rounded-md border border-stone-300 bg-white px-2.5 text-xs text-stone-700 mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Sin garantía">Sin garantía (0%)</option>
                    <option value="1 año (5%)">1 año (5%)</option>
                    <option value="2 años (10%)">2 años (10%)</option>
                    <option value="3 años (15%)">3 años (15%)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-stone-600">Observaciones</Label>
                  <Input
                    type="text"
                    placeholder="Notas u especificaciones adicionales"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="h-8 text-xs bg-white border-stone-300 mt-1"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Panel inferior de Cantidad y Resumen de Importe */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="viv-dialog-qty" className="text-xs font-semibold text-stone-700">
                Cantidad a agregar:
              </Label>
              <Input
                id="viv-dialog-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                className="h-8 w-24 text-right text-xs bg-white border-stone-300 font-semibold tabular-nums"
              />
            </div>
            <div className="text-right">
              <span className="text-[11px] text-stone-500 block uppercase font-medium">Subtotal Estimado:</span>
              <span className="text-base font-bold text-emerald-700 font-mono">
                {formatMoney(subtotalPreview)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-stone-300 text-stone-700 hover:bg-stone-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmAdd}
            disabled={
              activeTab === 'catalog'
                ? !selectedCatalogItem
                : !customDescription.trim()
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Agregar al Registro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
