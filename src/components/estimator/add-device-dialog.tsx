'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  PlusCircle,
  Package,
  Layers,
  CheckCircle,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Wand2,
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
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useEstimateStore, type LineItem } from '@/store/estimate-store';
import { useSkuGenerator } from '@/hooks/use-sku-generator';
import { toast } from 'sonner';

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

interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSystem?: string;
}

const SUPPORTED_SYSTEMS = [
  { id: 'CCTV', name: 'CCTV — Videovigilancia' },
  { id: 'ACCESO', name: 'Control de Acceso' },
  { id: 'VOCEO', name: 'Sistema de Voceo / PA' },
  { id: 'INCENDIO', name: 'Detección y Alarma contra Incendio' },
];

const CATEGORIES = [
  'Todas',
  'Equipo',
  'Accesorio',
  'Consumible',
  'Mano de Obra',
  'Servicio',
  'Ingeniería',
];

const UNITS = ['pza', 'ml', 'lote', 'serv', 'rollo', 'kg', 'm2', 'm3', 'ing', 'hr'];

function formatMoney(val: number, currency: 'MXN' | 'USD' = 'MXN'): string {
  const safe = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export default function AddDeviceDialog({
  open,
  onOpenChange,
  defaultSystem = 'CCTV',
}: AddDeviceDialogProps) {
  const addLineItem = useEstimateStore((s) => s.addLineItem);
  const currency = useEstimateStore((s) => s.currency);

  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [selectedSystem, setSelectedSystem] = useState<string>(defaultSystem);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Items de la BD
  const [catalogItems, setCatalogItems] = useState<PriceCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<PriceCatalogItem | null>(null);

  // Form de item personalizado
  const [customCode, setCustomCode] = useState<string>('');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('Equipo');
  const [customUnit, setCustomUnit] = useState<string>('pza');
  const [customUnitCost, setCustomUnitCost] = useState<number>(0);
  const [autoSkuEnabled, setAutoSkuEnabled] = useState<boolean>(true);
  const userModifiedSkuRef = useRef<boolean>(false);

  // Hook para generación automática de SKU
  const {
    suggestedSku,
    isGenerating: isSkuGenerating,
    exists: skuExists,
    refreshSku,
  } = useSkuGenerator({
    system: selectedSystem,
    category: customCategory,
    enabled: autoSkuEnabled && open,
  });

  // Sincronizar SKU sugerido con customCode solo si el usuario no lo ha modificado manualmente
  useEffect(() => {
    if (autoSkuEnabled && suggestedSku && !userModifiedSkuRef.current) {
      setCustomCode(suggestedSku);
    }
  }, [autoSkuEnabled, suggestedSku]);

  // Cantidad común
  const [quantity, setQuantity] = useState<number>(1);

  // Actualizar sistema seleccionado por defecto cuando abre la modal
  useEffect(() => {
    if (open) {
      setSelectedSystem(defaultSystem || 'CCTV');
      setSelectedCatalogItem(null);
      setSearchQuery('');
      setQuantity(1);
      setActiveTab('catalog');
      resetCustomForm();
      fetchPrices();
    }
  }, [open, defaultSystem]);

  const resetCustomForm = () => {
    setCustomCode('');
    setCustomBrand('');
    setCustomModel('');
    setCustomDescription('');
    setCustomCategory('Equipo');
    setCustomUnit('pza');
    setCustomUnitCost(0);
    setAutoSkuEnabled(true);
    userModifiedSkuRef.current = false;
  };

  // Handler para regenerar SKU manualmente
  const handleRefreshSku = async () => {
    userModifiedSkuRef.current = false;
    await refreshSku();
  };

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

  // Filtrado dinámico del catálogo
  const filteredCatalogItems = useMemo(() => {
    return catalogItems.filter((item) => {
      // Filtro por sistema
      if (selectedSystem && selectedSystem !== 'TODOS' && item.system !== selectedSystem) {
        return false;
      }
      // Filtro por categoría
      if (selectedCategory && selectedCategory !== 'Todas' && item.category !== selectedCategory) {
        return false;
      }
      // Búsqueda por texto (SKU, marca, modelo, descripción)
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

  // Subtotal preliminar
  const subtotalPreview = useMemo(() => {
    const qty = Math.max(0, Number(quantity) || 0);
    const unitPrice =
      activeTab === 'catalog'
        ? selectedCatalogItem?.unitCost ?? 0
        : Math.max(0, Number(customUnitCost) || 0);
    return qty * unitPrice;
  }, [activeTab, selectedCatalogItem, customUnitCost, quantity]);

  const handleConfirmAdd = () => {
    const qty = Math.max(0.01, Number(quantity) || 1);

    if (activeTab === 'catalog') {
      if (!selectedCatalogItem) {
        toast.error('Selecciona un dispositivo del catálogo');
        return;
      }

      addLineItem({
        system: selectedSystem,
        code: selectedCatalogItem.sku || `ITEM-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        description: selectedCatalogItem.description,
        category: selectedCatalogItem.category || 'Equipo',
        unit: selectedCatalogItem.unit || 'pza',
        quantity: qty,
        unitCost: Number(selectedCatalogItem.unitCost) || 0,
        marca: selectedCatalogItem.brand || '',
        modelo: selectedCatalogItem.model || '',
      });

      toast.success(`Dispositivo "${selectedCatalogItem.sku || selectedCatalogItem.description}" agregado`);
    } else {
      if (!customDescription.trim()) {
        toast.error('La descripción del dispositivo es obligatoria');
        return;
      }

      const generatedCode =
        customCode.trim() ||
        `${selectedSystem}-CUST-${Date.now().toString(36).slice(-4).toUpperCase()}`;

      addLineItem({
        system: selectedSystem,
        code: generatedCode,
        description: customDescription.trim(),
        category: customCategory || 'Equipo',
        unit: customUnit || 'pza',
        quantity: qty,
        unitCost: Math.max(0, Number(customUnitCost) || 0),
        marca: customBrand.trim(),
        modelo: customModel.trim(),
      });

      toast.success(`Dispositivo personalizado "${generatedCode}" agregado`);
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
              <div className="rounded-lg bg-teal-500/10 p-2.5 text-teal-600">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-stone-800">
                  Agregar Nueva Fila al Presupuesto
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  Selecciona un dispositivo del catálogo de precios o crea una partida personalizada.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700 font-semibold px-3 py-1">
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
                  <Package className="h-3.5 w-3.5 text-teal-600" />
                  Buscar en Catálogo
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-2 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Dispositivo Personalizado
                </TabsTrigger>
              </TabsList>

              {/* Selector de Sistema Destino */}
              <div className="flex items-center gap-2">
                <Label htmlFor="system-select" className="text-xs font-medium text-stone-600 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-stone-400" />
                  Sistema:
                </Label>
                <select
                  id="system-select"
                  value={selectedSystem}
                  onChange={(e) => setSelectedSystem(e.target.value)}
                  className="h-8 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    className="w-full h-9 rounded-md border border-stone-300 bg-white px-2.5 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                                ? 'bg-teal-50/80 hover:bg-teal-50'
                                : 'hover:bg-stone-50'
                            }`}
                          >
                            <TableCell className="p-2 text-center">
                              <div
                                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-teal-600 bg-teal-600 text-white'
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
                              {formatMoney(item.unitCost, currency)}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="custom-code" className="text-xs text-stone-600">
                      Código / SKU (opcional)
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500">Auto</span>
                      <Switch
                        id="custom-auto-sku"
                        checked={autoSkuEnabled}
                        onCheckedChange={(checked) => {
                          setAutoSkuEnabled(checked);
                          if (checked) {
                            userModifiedSkuRef.current = false;
                            if (suggestedSku) {
                              setCustomCode(suggestedSku);
                            }
                          }
                        }}
                        disabled={isLoading || isSkuGenerating}
                        className="scale-75"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      id="custom-code"
                      type="text"
                      placeholder="Ej. CAM-CUST-01"
                      value={customCode}
                      onChange={(e) => {
                        userModifiedSkuRef.current = true;
                        setCustomCode(e.target.value);
                      }}
                      className="h-8 text-xs bg-white border-stone-300 font-mono flex-1"
                      disabled={autoSkuEnabled && isSkuGenerating}
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
                              disabled={isSkuGenerating}
                              className="h-8 px-2 border-teal-300 text-teal-700 hover:bg-teal-50"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isSkuGenerating ? 'animate-spin' : ''}`} />
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
                        className={`text-[10px] py-0 px-1.5 ${skuExists ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}
                      >
                        <Wand2 className="h-2.5 w-2.5 mr-1" />
                        {skuExists ? 'Ya existe' : 'Sugerido'}: {suggestedSku}
                      </Badge>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-stone-600">Marca (opcional)</Label>
                  <Input
                    type="text"
                    placeholder="Ej. Hikvision, Bosch, etc."
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    className="h-8 text-xs bg-white border-stone-300 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-stone-600">Modelo (opcional)</Label>
                  <Input
                    type="text"
                    placeholder="Ej. DS-2CD2143G0-I"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="h-8 text-xs bg-white border-stone-300 mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-stone-600 font-semibold">Descripción del concepto *</Label>
                <Input
                  type="text"
                  placeholder="Descripción detallada del dispositivo o servicio..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="h-8 text-xs bg-white border-stone-300 mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-stone-600">Categoría</Label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full h-8 rounded-md border border-stone-300 bg-white px-2.5 text-xs text-stone-700 mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-stone-600">Unidad</Label>
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full h-8 rounded-md border border-stone-300 bg-white px-2.5 text-xs text-stone-700 mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-stone-600 font-semibold">Precio Unitario (P.U.)</Label>
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
            </TabsContent>
          </Tabs>

          {/* Panel inferior de Cantidad y Resumen de Importe */}
          <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="dialog-qty" className="text-xs font-semibold text-stone-700">
                Cantidad a agregar:
              </Label>
              <Input
                id="dialog-qty"
                type="number"
                min={0.01}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                className="h-8 w-24 text-right text-xs bg-white border-stone-300 font-semibold tabular-nums"
              />
            </div>
            <div className="text-right">
              <span className="text-[11px] text-stone-500 block uppercase font-medium">Subtotal Estimado:</span>
              <span className="text-base font-bold text-teal-700 font-mono">
                {formatMoney(subtotalPreview, currency)}
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
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-2 shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Agregar al Presupuesto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
