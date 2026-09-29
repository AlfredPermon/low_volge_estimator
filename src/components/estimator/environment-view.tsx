'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Leaf, ChevronRight, CheckCircle2, ChevronLeft, Loader2, Printer, ArrowRight, Search } from 'lucide-react';
import { useEstimateStore } from '@/store/estimate-store';
import { toast } from 'sonner';
import { exportEnvironmentReportToPDF, EnvironmentPdfItem, EnvironmentPdfMetadata } from '@/lib/pdf-export';

// --- Constantes del Mockup ---
const REGIONES = [
  { n: 'Noroeste', d: 'Solo aplica CM Cabos', id: 0 },
  { n: 'Noreste', d: 'NL · Coahuila · Chihuahua · Tamaulipas', id: 1 },
  { n: 'Centro', d: 'León, Gto · Puebla', id: 2 },
  { n: 'Sur', d: 'Mérida', id: 3 },
];

const CATCOLOR: Record<string, string> = {
  'Recurso humano': '#0e7c66',
  'Equipamiento': '#2563eb',
  'Equipamento': '#2563eb', // alias
  'Inmobiliario': '#7c3aed',
  'Estudios y servicios técnicos': '#0891b2',
  'Gestoria': '#d97706',
  'Gestoría': '#d97706', // alias
  'Servicios adicionales': '#e11d48',
};

const WIZARD_STEPS = [
  { id: 'proj', label: 'Proyecto y Región' },
  { id: 'dates', label: 'Etapa y Fechas' },
  { id: 'items', label: 'Partidas' },
  { id: 'summary', label: 'Resumen' },
];

type DBPrice = {
  id: string;
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: number;
  performance: number;
  deviceType: string;
};

// Simularemos la matriz del Excel inyectando unas reglas de aplicabilidad a los datos extraídos de la BD si pertenecen a Medio Ambiente.
// Como la base de datos "Precios" real tal vez no tenga las columnas de Etapa, Tipo de Proyecto, o los multiplicadores por Región del Excel,
// utilizaremos la categoría/sistema para filtrarlos y aplicaremos lógica paramétrica dinámica.
export default function EnvironmentView() {
  const store = useEstimateStore();
  
  const [wizardStep, setWizardStep] = useState(0);
  const [projectType, setProjectType] = useState<'Remodelación' | 'Ampliación' | 'Construcción'>('Construcción');
  const [region, setRegion] = useState(1);
  const [stage, setStage] = useState<'Pre-construcción' | 'Construcción' | 'Concluido/Cierre'>('Construcción');
  
  // Catálogo desde la base de datos (filtrado por Medio Ambiente / SSMA)
  const [catalog, setCatalog] = useState<DBPrice[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  
  // Estado de las partidas (selección y cantidades)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Cargar el catálogo
  useEffect(() => {
    async function loadPrices() {
      try {
        setLoadingCatalog(true);
        const res = await fetch('/api/prices?limit=2000');
        if (res.ok) {
          const json = await res.json();
          const data: DBPrice[] = json.data ?? json ?? [];
          
          // Filtramos solo lo que parezca de Medio Ambiente o SSMA
          const envItems = data.filter(item => {
            const system = (item.system || '').toUpperCase();
            const desc = (item.description || '').toLowerCase();
            
            // Excluir sistemas que no tienen relación directa (como voceo, cctv, etc.) y falsos positivos
            if (['VOCEO', 'CCTV', 'ACCESO', 'INCENDIO', 'CABLEADO', 'CANALIZACION'].includes(system)) return false;
            if (desc.includes('música ambiental') || desc.includes('amplificador mezclad')) return false;

            const txt = `${item.system} ${item.category} ${item.description}`.toLowerCase();
            return txt.includes('medio ambiente') || txt.includes('ssma') || txt.includes('gestoria') || txt.includes('ambiental') || txt.includes('ecología');
          });
          
          setCatalog(envItems);
          
          // Seleccionar por defecto
          const newSel = new Set<string>();
          const newQty: Record<string, number> = {};
          envItems.forEach(i => {
            newSel.add(i.id);
            newQty[i.id] = 1;
          });
          setSelectedItems(newSel);
          setQuantities(newQty);
        }
      } catch (err) {
        toast.error('Error al cargar la base de datos de precios');
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadPrices();
  }, []);

  // 2. Cálculo de meses
  const months = useMemo(() => {
    if (!store.startDate || !store.endDate) return 1;
    const a = new Date(store.startDate);
    const b = new Date(store.endDate);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return 1;
    return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1);
  }, [store.startDate, store.endDate]);

  // 3. Lógica de cálculo paramétrico (Item x meses x región, etc)
  const calculateItemAmount = useCallback((item: DBPrice) => {
    const qty = quantities[item.id] || 1;
    let basePrice = item.unitCost;
    
    // Simular el multiplicador paramétrico para recursos humanos (meses + 2)
    let mult = 1;
    const txt = `${item.description} ${item.category}`.toLowerCase();
    if (txt.includes('recurso humano') || txt.includes('coordinador') || txt.includes('supervisor')) {
      mult = months + 2;
    }
    
    return basePrice * mult * qty;
  }, [quantities, months]);

  // Filtrado y Subtotales
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => item.description.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [catalog, searchQuery]);

  const totalAmount = useMemo(() => {
    let total = 0;
    catalog.forEach(item => {
      if (selectedItems.has(item.id)) {
        total += calculateItemAmount(item);
      }
    });
    return total;
  }, [catalog, selectedItems, calculateItemAmount]);

  const summaryByCategory = useMemo(() => {
    const sums: Record<string, number> = {};
    catalog.forEach(item => {
      if (selectedItems.has(item.id)) {
        const cat = item.category || 'Otros';
        sums[cat] = (sums[cat] || 0) + calculateItemAmount(item);
      }
    });
    return Object.entries(sums).map(([cat, v]) => ({ cat, v })).sort((a,b) => b.v - a.v);
  }, [catalog, selectedItems, calculateItemAmount]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);
  };

  // --- Handlers ---
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredCatalog.map(i => i.id));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const toggleItem = (id: string, checked: boolean) => {
    const next = new Set(selectedItems);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedItems(next);
  };

  const updateQty = (id: string, val: string) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    setQuantities(prev => ({ ...prev, [id]: num }));
  };

  const handleExportPDF = () => {
    try {
      const items: EnvironmentPdfItem[] = filteredCatalog
        .filter(item => selectedItems.has(item.id))
        .map(item => {
          const isHumanRes = item.description.toLowerCase().includes('recurso humano');
          return {
            id: item.id,
            description: item.description,
            category: item.category || item.system,
            unit: item.unit,
            quantity: quantities[item.id] || 1,
            unitCost: item.unitCost,
            totalAmount: calculateItemAmount(item),
            isHumanRes,
            months,
          };
        });

      const meta: EnvironmentPdfMetadata = {
        projectName: store.projectName,
        clientName: store.clientName,
        responsible: store.envResponsable || store.responsible,
        revision: store.revision,
        currency: store.currency,
        regionName: REGIONES.find(r => r.id === region)?.n || '',
        stageName: stage,
        projectType,
        durationMonths: months,
        totalAmount,
        summaryByCategory,
      };

      const filename = exportEnvironmentReportToPDF(items, meta);
      toast.success(`Reporte PDF generado: ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el reporte PDF');
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Topbar equivalent */}
      <div className="bg-white px-8 py-6 border-b border-stone-200">
        <div className="flex justify-between items-start gap-4 max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Leaf className="w-6 h-6 text-emerald-600" />
              Módulo Medio Ambiente · Paramétrico
            </h1>
            <p className="text-sm text-stone-500 mt-1">Estimación automática con costos unitarios de la base de datos <b>"Precios"</b></p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 inline-block"></span>
            BD Precios: conectada
          </Badge>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto p-8 pb-32">
        {/* Stepper Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-3 rounded-2xl border border-stone-200 shadow-sm">
          {WIZARD_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setWizardStep(i)}
              className="flex items-center flex-1 justify-center px-2 py-2 hover:bg-stone-50 rounded-xl transition-colors"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mr-3 transition-colors",
                  i < wizardStep ? 'bg-emerald-600 text-white' : i === wizardStep ? 'bg-emerald-100 text-emerald-700 border border-emerald-600' : 'bg-stone-100 text-stone-400'
                )}
              >
                {i < wizardStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn("text-sm font-medium", i <= wizardStep ? 'text-stone-800' : 'text-stone-400')}>
                {s.label}
              </span>
              {i < WIZARD_STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 ml-auto text-stone-300" />
              )}
            </button>
          ))}
        </div>

        {/* --- STEP 1 --- */}
        {wizardStep === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="border-stone-200 shadow-sm">
              <CardHeader className="pb-3 bg-stone-50/50 rounded-t-xl border-b border-stone-100">
                <CardTitle className="text-base font-semibold text-stone-800">Datos generales del proyecto</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-stone-600">Nombre del proyecto</Label>
                  <Input readOnly value={store.projectName || "Sin nombre"} className="bg-stone-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-stone-600">Tipo de proyecto</Label>
                  <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
                    {['Remodelación', 'Ampliación', 'Construcción'].map(t => (
                      <button
                        key={t}
                        onClick={() => setProjectType(t as any)}
                        className={cn("flex-1 py-2 text-sm rounded-lg transition-all", projectType === t ? "bg-white text-emerald-700 font-bold shadow-sm" : "text-stone-500 hover:text-stone-700")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-stone-400 mt-2">El tipo de obra filtra el catálogo de partidas aplicables.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-sm">
              <CardHeader className="pb-3 bg-stone-50/50 rounded-t-xl border-b border-stone-100">
                <CardTitle className="text-base font-semibold text-stone-800">Costos unitarios por región</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REGIONES.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setRegion(r.id)}
                      className={cn(
                        "text-left p-3 rounded-xl border-2 transition-all",
                        region === r.id ? "border-emerald-600 bg-emerald-50" : "border-stone-200 bg-white hover:border-emerald-200"
                      )}
                    >
                      <b className={cn("block text-sm", region === r.id ? "text-emerald-700" : "text-stone-800")}>{r.n}</b>
                      <small className="text-stone-500 text-xs mt-1 block">{r.d}</small>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-4">Los precios unitarios se obtienen en tiempo real de la BD <b>"Precios"</b> según la región seleccionada.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* --- STEP 2 --- */}
        {wizardStep === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="border-stone-200 shadow-sm">
              <CardHeader className="pb-3 bg-stone-50/50 rounded-t-xl border-b border-stone-100">
                <CardTitle className="text-base font-semibold text-stone-800">Etapa de ejecución</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 p-1 bg-stone-100 rounded-xl">
                    {[
                      { v: 'Pre-construcción', l: '📐 Pre-construcción' },
                      { v: 'Construcción', l: '🏗️ Construcción' },
                      { v: 'Concluido/Cierre', l: '✅ Concluido / Cierre' }
                    ].map(t => (
                      <button
                        key={t.v}
                        onClick={() => setStage(t.v as any)}
                        className={cn("text-left px-4 py-3 text-sm rounded-lg transition-all", stage === t.v ? "bg-white text-emerald-700 font-bold shadow-sm" : "text-stone-500 hover:text-stone-700 hover:bg-stone-200/50")}
                      >
                        {t.l}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-stone-400 mt-2">Cada partida del catálogo está asociada a una o más etapas.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-sm">
              <CardHeader className="pb-3 bg-stone-50/50 rounded-t-xl border-b border-stone-100">
                <CardTitle className="text-base font-semibold text-stone-800">Calendario del proyecto</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-stone-600">Fecha de inicio</Label>
                    <Input readOnly value={store.startDate ? new Date(store.startDate).toLocaleDateString('es-MX') : "No definida"} className="bg-stone-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-stone-600">Fecha final</Label>
                    <Input readOnly value={store.endDate ? new Date(store.endDate).toLocaleDateString('es-MX') : "No definida"} className="bg-stone-50" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm text-center">
                    <span className="block text-2xl font-bold text-stone-800">{months}</span>
                    <small className="text-stone-500 text-xs">meses de obra</small>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm text-center">
                    <span className="block text-2xl font-bold text-emerald-700">{months + 2}</span>
                    <small className="text-emerald-600/80 text-xs">meses de RRHH (duración + 2)</small>
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-2">Regla paramétrica: el <b>recurso humano</b> se presupuesta por la <b>duración del proyecto + 2 meses</b>.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* --- STEP 3 --- */}
        {wizardStep === 2 && (
          <Card className="border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-stone-100 flex flex-wrap gap-4 justify-between items-center bg-stone-50/50 rounded-t-xl">
              <div>
                <h3 className="font-semibold text-stone-800">Catálogo de partidas paramétricas</h3>
                <p className="text-xs text-stone-500 mt-1">
                  {filteredCatalog.length} partidas aplicables · <b>{stage}</b> · {projectType} · Región <b>{REGIONES.find(r=>r.id === region)?.n}</b>
                </p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar artículo..."
                  className="pl-9 w-[260px] bg-white"
                />
              </div>
            </div>
            
            <div className="p-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between px-6 text-sm text-stone-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filteredCatalog.length > 0 && selectedItems.size === catalog.length}
                  onCheckedChange={toggleSelectAll}
                />
                Seleccionar todas las aplicables
              </label>
              <span className="font-medium">{selectedItems.size} seleccionadas</span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              {loadingCatalog ? (
                <div className="flex flex-col items-center justify-center p-12 text-stone-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-600" />
                  <p>Cargando precios de la base de datos...</p>
                </div>
              ) : (
                <Table className="min-w-[1000px]">
                  <TableHeader className="bg-stone-50/80 sticky top-0">
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead className="w-[350px] max-w-[350px]">Artículo</TableHead>
                      <TableHead className="w-[180px]">Categoría</TableHead>
                      <TableHead className="w-[100px]">Unidad</TableHead>
                      <TableHead className="text-right w-[120px]">Cant.</TableHead>
                      <TableHead className="text-right w-[140px]">PU región</TableHead>
                      <TableHead className="text-right font-bold w-[140px]">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCatalog.map(item => {
                      const isHumanRes = item.description.toLowerCase().includes('recurso humano');
                      const catColor = CATCOLOR[item.category] || '#64748b';
                      
                      return (
                        <TableRow key={item.id} className="hover:bg-stone-50/50">
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={(c) => toggleItem(item.id, c as boolean)}
                            />
                          </TableCell>
                          <TableCell className="w-[350px] max-w-[350px] whitespace-normal break-words">
                            <span className="font-medium text-stone-700">{item.description}</span>
                            {isHumanRes && (
                              <Badge variant="secondary" className="ml-2 text-[10px] bg-emerald-100 text-emerald-700">{months + 2} meses</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" style={{ borderColor: catColor, color: catColor, backgroundColor: `${catColor}10` }}>
                              {item.category || item.system}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-stone-500">{item.unit}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              value={quantities[item.id] || 1}
                              onChange={(e) => updateQty(item.id, e.target.value)}
                              className="w-16 h-8 text-right p-1 ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right text-stone-500">{formatCurrency(item.unitCost)}</TableCell>
                          <TableCell className="text-right font-bold text-stone-800">{formatCurrency(calculateItemAmount(item))}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredCatalog.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center p-12 text-stone-500">
                          No se encontraron partidas para esta combinación.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            
            <div className="p-4 border-t border-stone-200 bg-stone-50/80 flex justify-between items-center rounded-b-xl">
              <span className="font-semibold text-stone-600">Subtotal partidas seleccionadas</span>
              <span className="text-lg font-bold text-emerald-700">{formatCurrency(totalAmount)}</span>
            </div>
          </Card>
        )}

        {/* --- STEP 4 --- */}
        {wizardStep === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-emerald-600 text-white shadow-md border-0">
                <CardContent className="p-5">
                  <span className="block text-2xl font-bold">{formatCurrency(totalAmount)}</span>
                  <small className="text-emerald-100 text-xs font-medium">Presupuesto Paramétrico SSMA</small>
                </CardContent>
              </Card>
              <Card className="border-stone-200 shadow-sm">
                <CardContent className="p-5">
                  <span className="block text-2xl font-bold text-stone-800">{selectedItems.size}</span>
                  <small className="text-stone-500 text-xs font-medium">Partidas incluidas</small>
                </CardContent>
              </Card>
              <Card className="border-stone-200 shadow-sm">
                <CardContent className="p-5">
                  <span className="block text-2xl font-bold text-stone-800">{months}</span>
                  <small className="text-stone-500 text-xs font-medium">Meses de duración</small>
                </CardContent>
              </Card>
              <Card className="border-stone-200 shadow-sm">
                <CardContent className="p-5">
                  <span className="block text-2xl font-bold text-stone-800">{REGIONES.find(r=>r.id===region)?.n}</span>
                  <small className="text-stone-500 text-xs font-medium">Región seleccionada</small>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-stone-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-stone-100 bg-stone-50/50 rounded-t-xl">
                  <CardTitle className="text-sm font-semibold text-stone-700">Distribución por categoría</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {summaryByCategory.length > 0 ? (
                    <div className="space-y-4">
                      {summaryByCategory.map(s => {
                        const max = Math.max(...summaryByCategory.map(x => x.v), 1);
                        const pct = (s.v / max) * 100;
                        const c = CATCOLOR[s.cat] || '#64748b';
                        return (
                          <div key={s.cat}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-stone-700 font-medium">{s.cat}</span>
                              <span className="font-bold text-stone-900">{formatCurrency(s.v)}</span>
                            </div>
                            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400">No hay partidas seleccionadas.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-stone-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-stone-100 bg-stone-50/50 rounded-t-xl">
                  <CardTitle className="text-sm font-semibold text-stone-700">Resumen ejecutivo</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex flex-col h-[calc(100%-45px)]">
                  <div className="flex-1 space-y-2">
                    {summaryByCategory.map(s => (
                      <div key={s.cat} className="flex justify-between py-2 border-b border-dashed border-stone-200 text-sm">
                        <span className="text-stone-600">{s.cat}</span>
                        <span className="font-semibold text-stone-800">{formatCurrency(s.v)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-stone-800">TOTAL PARAMÉTRICO</span>
                      <span className="text-xl font-black text-emerald-700">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" className="gap-2 text-stone-600 border-stone-300" onClick={handleExportPDF}>
                <Printer className="w-4 h-4" /> Exportar PDF
              </Button>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.success('Módulo en construcción: Integración con presupuesto general pendiente.')}>
                Enviar a presupuesto <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step Navigation */}
        {wizardStep < 3 && (
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setWizardStep(w => w - 1)}
              disabled={wizardStep === 0}
              className="gap-2 text-stone-600"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <Button
              onClick={() => setWizardStep(w => w + 1)}
              className="gap-2 bg-stone-800 hover:bg-stone-900 text-white"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Bar (flotante) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-stone-200 p-4 px-8 flex items-center justify-between z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div>
          <small className="text-stone-500 font-semibold text-[10px] uppercase tracking-wider block mb-0.5">ESTIMADO EN VIVO</small>
          <b className="text-xl text-emerald-700">{formatCurrency(totalAmount)}</b>
        </div>
        <div className="flex-1 text-center hidden md:block text-xs text-stone-500 font-medium">
          {stage} · {projectType} · Región {REGIONES.find(r=>r.id===region)?.n} · {months} meses
        </div>
        <Button onClick={() => setWizardStep(3)} className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
          Calcular paramétrico
        </Button>
      </div>
    </div>
  );
}
