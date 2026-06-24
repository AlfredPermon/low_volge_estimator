'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEstimateStore } from '@/store/estimate-store';
import CctvForm from '@/components/estimator/cctv-form';
import AccessForm from '@/components/estimator/access-form';
import PagingForm from '@/components/estimator/paging-form';
import FireForm from '@/components/estimator/fire-form';
import FactorsPanel from '@/components/estimator/factors-panel';
import BudgetView from '@/components/estimator/budget-view';
import PricesView from '@/components/estimator/prices-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calculator,
  Database,
  FileText,
  Settings2,
  Zap,
  ChevronRight,
  RotateCcw,
  Save,
  Loader2,
  Building2,
  User,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EstimateRecord {
  id: string;
  name: string;
  createdAt: string;
  grandTotal: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Home() {
  const store = useEstimateStore();
  const [activeMainTab, setActiveMainTab] = useState<string>('config');
  const [activeSystemTab, setActiveSystemTab] = useState<string>('cctv');
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [saving, setSaving] = useState(false);

  // ─── Fetch existing estimates ──────────────────────────────────────────

  const fetchEstimates = useCallback(async () => {
    try {
      const res = await fetch('/api/estimates');
      if (res.ok) {
        const json = await res.json();
        setEstimates(json.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingEstimates(false);
    }
  }, []);

  useEffect(() => {
    fetchEstimates();
    // Seed default prices on first load
    fetch('/api/prices/seed-defaults', { method: 'POST' }).catch(() => {});
  }, [fetchEstimates]);

  // ─── Save estimate ─────────────────────────────────────────────────────

  const handleSave = async (): Promise<string | null> => {
    setSaving(true);
    try {
      const body = {
        name: store.name,
        clientName: store.clientName,
        projectName: store.projectName,
        currency: store.currency,
        wasteFactorCable: store.factors.wasteFactorCable,
        wasteFactorConduit: store.factors.wasteFactorConduit,
        verticalDrop: store.factors.verticalDrop,
        rackAllowance: store.factors.rackAllowance,
        indirectFactor: store.factors.indirectFactor,
        utilityFactor: store.factors.utilityFactor,
        cctvConfig: JSON.stringify(store.cctvConfig),
        accessConfig: JSON.stringify(store.accessConfig),
        pagingConfig: JSON.stringify(store.pagingConfig),
        fireConfig: JSON.stringify(store.fireConfig),
      };

      let id = store.estimateId;
      if (id) {
        await fetch(`/api/estimates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        const res = await fetch('/api/estimates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        id = data.id;
        store.setEstimateId(id);
      }
      toast.success('Presupuesto guardado correctamente');
      fetchEstimates();
      return id;
    } catch {
      toast.error('Error al guardar el presupuesto');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // ─── Calculate ─────────────────────────────────────────────────────────

  const handleCalculate = async () => {
    const id = await handleSave();
    if (!id) {
      toast.error('No se pudo guardar el presupuesto');
      return;
    }

    store.setIsCalculating(true);
    try {
      const res = await fetch(`/api/estimates/${id}/calculate`, { method: 'POST' });
      if (!res.ok) throw new Error('Calculation failed');
      const data = await res.json();

      store.setResult({
        lineItems: data.lineItems || [],
        subtotalMaterials: data.subtotalMaterials || 0,
        subtotalLabor: data.subtotalLabor || 0,
        subtotalEngineering: data.subtotalEngineering || 0,
        subtotalDirect: data.subtotalDirect || 0,
        subtotalIndirects: data.subtotalIndirects || 0,
        subtotalUtility: data.subtotalUtility || 0,
        grandTotal: data.grandTotal || 0,
      });

      // Switch to budget view
      setActiveMainTab('budget');
      toast.success('Presupuesto calculado exitosamente');
    } catch {
      toast.error('Error al calcular. Verifique que la base de datos de precios esté cargada.');
    } finally {
      store.setIsCalculating(false);
    }
  };

  // ─── Load estimate ─────────────────────────────────────────────────────

  const handleLoadEstimate = async (id: string) => {
    try {
      const res = await fetch(`/api/estimates/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      store.loadEstimate(data);
      setActiveMainTab('config');
      toast.success('Presupuesto cargado');
    } catch {
      toast.error('Error al cargar el presupuesto');
    }
  };

  // ─── Delete estimate ───────────────────────────────────────────────────

  const handleDeleteEstimate = async (id: string) => {
    try {
      await fetch(`/api/estimates/${id}`, { method: 'DELETE' });
      if (store.estimateId === id) store.resetAll();
      fetchEstimates();
      toast.success('Presupuesto eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // ─── New estimate ──────────────────────────────────────────────────────

  const handleNew = () => {
    store.resetAll();
    setActiveMainTab('config');
  };

  // ─── Format currency ───────────────────────────────────────────────────

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-stone-800 leading-tight">Low-Voltage Estimator</h1>
                <p className="text-xs text-stone-500 hidden sm:block">Estimador de Costos de Bajo Voltaje</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleNew} className="gap-1.5 text-stone-600">
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nuevo</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-stone-600">
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar'}</span>
              </Button>
              <Button
                size="sm"
                onClick={handleCalculate}
                disabled={store.isCalculating}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {store.isCalculating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Calculator className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {store.isCalculating ? 'Calculando...' : 'Calcular Presupuesto'}
                </span>
                <span className="sm:hidden">
                  {store.isCalculating ? '...' : 'Calcular'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Navigation Tabs ─────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
            <TabsList className="bg-transparent h-12 p-0 gap-1">
              <TabsTrigger
                value="config"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-none px-4 h-12 text-sm font-medium gap-2 text-stone-600 data-[state=active]:text-emerald-700"
              >
                <Settings2 className="w-4 h-4" />
                Configuración
              </TabsTrigger>
              <TabsTrigger
                value="prices"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-none px-4 h-12 text-sm font-medium gap-2 text-stone-600 data-[state=active]:text-emerald-700"
              >
                <Database className="w-4 h-4" />
                Precios
              </TabsTrigger>
              <TabsTrigger
                value="budget"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-none px-4 h-12 text-sm font-medium gap-2 text-stone-600 data-[state=active]:text-emerald-700"
              >
                <FileText className="w-4 h-4" />
                Presupuesto
                {store.result && store.result.grandTotal > 0 && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs ml-1">
                    {fmt(store.result.grandTotal)}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Config Tab Content ─────────────────────────────────── */}
            <TabsContent value="config" className="mt-0">
              <div className="max-w-7xl mx-auto py-6 px-0 lg:px-0">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: System configs */}
                  <div className="flex-1 min-w-0">
                    {/* Project Info Card */}
                    <Card className="mb-6 border-stone-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-stone-800 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-emerald-600" />
                          Información del Proyecto
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="est-name" className="text-xs text-stone-500">Nombre del Presupuesto</Label>
                            <Input
                              id="est-name"
                              value={store.name}
                              onChange={(e) => store.setName(e.target.value)}
                              placeholder="Ej: Cotización Escuela UDEM"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="client" className="text-xs text-stone-500 flex items-center gap-1">
                              <User className="w-3 h-3" /> Cliente
                            </Label>
                            <Input
                              id="client"
                              value={store.clientName}
                              onChange={(e) => store.setClientName(e.target.value)}
                              placeholder="Nombre del cliente"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="project" className="text-xs text-stone-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Proyecto
                            </Label>
                            <Input
                              id="project"
                              value={store.projectName}
                              onChange={(e) => store.setProjectName(e.target.value)}
                              placeholder="Nombre del proyecto"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-stone-500">Moneda</Label>
                            <Select value={store.currency} onValueChange={(v) => store.setCurrency(v as 'MXN' | 'USD')}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                                <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* System Tabs */}
                    <Tabs value={activeSystemTab} onValueChange={setActiveSystemTab}>
                      <TabsList className="grid grid-cols-4 w-full h-10 bg-stone-100 p-1">
                        <TabsTrigger
                          value="cctv"
                          className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                        >
                          CCTV
                        </TabsTrigger>
                        <TabsTrigger
                          value="access"
                          className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                        >
                          Acceso
                        </TabsTrigger>
                        <TabsTrigger
                          value="paging"
                          className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                        >
                          Voceo
                        </TabsTrigger>
                        <TabsTrigger
                          value="fire"
                          className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                        >
                          Incendio
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="cctv" className="mt-4">
                        <CctvForm />
                      </TabsContent>
                      <TabsContent value="access" className="mt-4">
                        <AccessForm />
                      </TabsContent>
                      <TabsContent value="paging" className="mt-4">
                        <PagingForm />
                      </TabsContent>
                      <TabsContent value="fire" className="mt-4">
                        <FireForm />
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Right: Sidebar */}
                  <div className="w-full lg:w-80 xl:w-96 space-y-6 flex-shrink-0">
                    {/* Factors Panel */}
                    <FactorsPanel />

                    {/* Recent Estimates */}
                    <Card className="border-stone-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-stone-500" />
                          Presupuestos Guardados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingEstimates ? (
                          <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                          </div>
                        ) : estimates.length === 0 ? (
                          <p className="text-xs text-stone-400 text-center py-4">No hay presupuestos guardados</p>
                        ) : (
                          <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {estimates.slice(0, 10).map((est) => (
                              <div
                                key={est.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors group ${
                                  store.estimateId === est.id
                                    ? 'bg-emerald-50 border border-emerald-200'
                                    : 'hover:bg-stone-50 border border-transparent'
                                }`}
                                onClick={() => handleLoadEstimate(est.id)}
                              >
                                <div className="flex-1 min-w-0 mr-2">
                                  <p className="text-sm font-medium text-stone-700 truncate">{est.name}</p>
                                  <p className="text-xs text-stone-400">
                                    {new Date(est.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {est.grandTotal > 0 && (
                                    <span className="text-xs font-medium text-emerald-600">{fmt(est.grandTotal)}</span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEstimate(est.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-opacity p-0.5"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Prices Tab Content ──────────────────────────────────── */}
            <TabsContent value="prices" className="mt-0">
              <div className="max-w-7xl mx-auto py-6">
                <PricesView />
              </div>
            </TabsContent>

            {/* ── Budget Tab Content ──────────────────────────────────── */}
            <TabsContent value="budget" className="mt-0">
              <div className="max-w-7xl mx-auto py-6">
                <BudgetView />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-white border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-400">
            <p>Low-Voltage Estimator &copy; {new Date().getFullYear()} &mdash; Plataforma de Cotización de Sistemas de Bajo Voltaje</p>
            <p className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-500" />
              Cálculo paramétrico sin planos arquitectónicos
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}