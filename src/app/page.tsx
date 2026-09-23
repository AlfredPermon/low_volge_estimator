'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useEstimateStore } from '@/store/estimate-store';
import CctvForm from '@/components/estimator/cctv-form';
import AccessForm from '@/components/estimator/access-form';
import PagingForm from '@/components/estimator/paging-form';
import FireForm from '@/components/estimator/fire-form';
import FactorsPanel from '@/components/estimator/factors-panel';
import LaborPanel from '@/components/estimator/labor-panel';
import BudgetView from '@/components/estimator/budget-view';
import PricesView from '@/components/estimator/prices-view';
import ReportsView from '@/components/estimator/reports-view';
import AnalyticsView from '@/components/estimator/analytics-view';
import ValidationPanel from '@/components/estimator/validation-panel';
import FloorplanView from '@/components/estimator/floorplan-view';
import ScheduleView from '@/components/schedule/ScheduleView';
import VivotekForm from '@/components/estimator/vivotek-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Calculator,
  Database,
  FileText,
  Settings2,
  Zap,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Save,
  Loader2,
  Building2,
  User,
  Briefcase,
  CheckCircle2,
  CalendarDays,
  BarChart3,
  PieChart,
  Trash2,
  MapPin,
  LogOut,
  ShieldCheck,
  Users,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import UsersView from '@/components/users/users-view';
import { isAdminRole } from '@/lib/auth-constants';
import {
  normalizeRecentEstimateEntries,
  removeFromRecentEstimateEntries,
  touchRecentEstimateEntries,
  type RecentEstimateEntry,
} from '@/lib/recent-estimates';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EstimateRecord {
  id: string;
  name: string;
  clientName: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  grandTotal: number;
}

type EstimateStatusFilter = 'all' | 'borrador' | 'calculado';
type EstimateDateFilter = 'all' | '7d' | '30d' | '90d';

const RECENT_ESTIMATES_KEY = 'lve.recentEstimates.v1';

const WIZARD_STEPS = [
  { id: 'project', label: 'Proyecto' },
  { id: 'cctv', label: 'CCTV' },
  { id: 'access', label: 'Acceso' },
  { id: 'paging', label: 'Voceo' },
  { id: 'fire', label: 'Incendio' },
  { id: 'factors', label: 'Factores' },
  { id: 'labor', label: 'Mano de Obra' },
  { id: 'validation', label: 'Validaciones' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function Home() {
  const store = useEstimateStore();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<string>('config');
  const [wizardStep, setWizardStep] = useState<number>(0);
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [recentEntries, setRecentEntries] = useState<RecentEstimateEntry[]>([]);
  const [recentSearch, setRecentSearch] = useState('');
  const [recentStatus, setRecentStatus] = useState<EstimateStatusFilter>('all');
  const [recentDate, setRecentDate] = useState<EstimateDateFilter>('all');

  // Verificar la sesión del usuario al cargar
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        if (res.status === 401) {
          window.location.href = '/login';
        }
        return null;
      })
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Sesión cerrada');
      window.location.href = '/login';
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };
  const initialDraftSnapshot = useRef<{
    name: string;
    clientName: string;
    projectName: string;
    currency: string;
    revision: string;
    responsible: string;
    notes: string;
    factorsNotes: string;
  } | null>(null);

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
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(RECENT_ESTIMATES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setRecentEntries(normalizeRecentEstimateEntries(parsed));
    } catch {
      setRecentEntries([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(RECENT_ESTIMATES_KEY, JSON.stringify(recentEntries));
    } catch {
      // silent
    }
  }, [recentEntries]);

  // ─── Carga inicial de presupuestos y seed de precios ──────────────────
  useEffect(() => {
    const loadData = () => {
      fetchEstimates();
      fetch('/api/prices/seed-defaults', { method: 'POST' }).catch(() => {});
    };
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [fetchEstimates]);

  useEffect(() => {
    if (initialDraftSnapshot.current) return;
    initialDraftSnapshot.current = {
      name: store.name,
      clientName: store.clientName,
      projectName: store.projectName,
      currency: store.currency,
      revision: store.revision,
      responsible: store.responsible,
      notes: store.notes,
      factorsNotes: store.factorsNotes,
    };
  }, [store.name, store.clientName, store.projectName, store.currency, store.revision, store.responsible, store.notes, store.factorsNotes]);

  // ─── BUDGET-PERSISTENCE: recuperar estimate de sesión anterior ────────
  useEffect(() => {
    let cancelled = false;
    const persistedId =
      typeof window !== 'undefined'
        ? localStorage.getItem('lve.currentEstimateId')
        : null;
    if (!persistedId) return;

    (async () => {
      try {
        const res = await fetch(`/api/estimates/${persistedId}`);
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        store.loadEstimate(data);
        store.setActiveEstimate(persistedId);
        setRecentEntries((prev) => touchRecentEstimateEntries(prev, persistedId));
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lve.currentEstimateId');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createDraftEstimate = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      if (!opts?.force && (creatingDraft || store.estimateId)) return store.estimateId;
      setCreatingDraft(true);
      try {
        const state = useEstimateStore.getState();
        const body: Record<string, unknown> = {
          name: state.name,
          clientName: state.clientName,
          projectName: state.projectName,
          currency: state.currency,
          revision: state.revision,
          responsible: state.responsible,
          notes: state.notes,
          factorsNotes: state.factorsNotes,
          wasteFactorCable: state.factors.wasteFactorCable,
          wasteFactorConduit: state.factors.wasteFactorConduit,
          verticalDrop: state.factors.verticalDrop,
          rackAllowance: state.factors.rackAllowance,
          indirectFactor: state.factors.indirectFactor,
          utilityFactor: state.factors.utilityFactor,
          ivaRate: state.factors.ivaRate,
          roundingPolicy: state.factors.roundingPolicy,
          laborTechnicianRate: state.factors.laborRates.technician,
          laborOfficerRate: state.factors.laborRates.officer,
          laborHelperRate: state.factors.laborRates.helper,
          useCrewBasedLabor: state.factors.useCrewBasedLabor,
          cctvConfig: JSON.stringify(state.cctvConfig),
          accessConfig: JSON.stringify(state.accessConfig),
          pagingConfig: JSON.stringify(state.pagingConfig),
          fireConfig: JSON.stringify(state.fireConfig),
          floorplanConfig: JSON.stringify({
            buildingLevels: state.buildingLevels,
            activeFloorplanId: state.activeFloorplanId,
            floorplans: state.floorplans,
          }),
        };

        const res = await fetch('/api/estimates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const id: unknown = data?.id;
        if (typeof id !== 'string') return null;

        store.setEstimateId(id);
        store.setActiveEstimate(id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lve.currentEstimateId', id);
        }
        setRecentEntries((prev) => touchRecentEstimateEntries(prev, id));
        fetchEstimates();
        if (!opts?.silent) toast.success('Proyecto creado');
        return id;
      } catch {
        return null;
      } finally {
        setCreatingDraft(false);
      }
    },
    [creatingDraft, store, fetchEstimates],
  );

  useEffect(() => {
    if (store.estimateId) return;
    if (creatingDraft) return;
    if (!initialDraftSnapshot.current) return;
    const snap = initialDraftSnapshot.current;
    const changed =
      store.name !== snap.name ||
      store.clientName !== snap.clientName ||
      store.projectName !== snap.projectName ||
      store.currency !== snap.currency ||
      store.revision !== snap.revision ||
      store.responsible !== snap.responsible ||
      store.notes !== snap.notes ||
      store.factorsNotes !== snap.factorsNotes;
    if (!changed) return;
    createDraftEstimate({ silent: true });
  }, [
    store.estimateId,
    creatingDraft,
    store.name,
    store.clientName,
    store.projectName,
    store.currency,
    store.revision,
    store.responsible,
    store.notes,
    store.factorsNotes,
    createDraftEstimate,
  ]);

  // ─── Save estimate ─────────────────────────────────────────────────────

  const handleSave = async (): Promise<string | null> => {
    setSaving(true);
    try {
      // Si el usuario tiene ediciones manuales en las líneas del presupuesto,
      // las persistimos en BD sin forzar recálculo del motor. Esto evita que
      // los valores editados (P.U., Cantidad, código) se pierdan al volver a
      // la pestaña de Presupuesto.
      const hasLineEdits = store.isDirty && store.result !== null;

      const body: Record<string, unknown> = {
        name: store.name,
        clientName: store.clientName,
        projectName: store.projectName,
        currency: store.currency,
        revision: store.revision,
        responsible: store.responsible,
        notes: store.notes,
        factorsNotes: store.factorsNotes,
        wasteFactorCable: store.factors.wasteFactorCable,
        wasteFactorConduit: store.factors.wasteFactorConduit,
        verticalDrop: store.factors.verticalDrop,
        rackAllowance: store.factors.rackAllowance,
        indirectFactor: store.factors.indirectFactor,
        utilityFactor: store.factors.utilityFactor,
        ivaRate: store.factors.ivaRate,
        roundingPolicy: store.factors.roundingPolicy,
        // A2
        laborTechnicianRate: store.factors.laborRates.technician,
        laborOfficerRate: store.factors.laborRates.officer,
        laborHelperRate: store.factors.laborRates.helper,
        useCrewBasedLabor: store.factors.useCrewBasedLabor,
        cctvConfig: JSON.stringify(store.cctvConfig),
        accessConfig: JSON.stringify(store.accessConfig),
        pagingConfig: JSON.stringify(store.pagingConfig),
        fireConfig: JSON.stringify(store.fireConfig),
        floorplanConfig: JSON.stringify({
          buildingLevels: store.buildingLevels,
          activeFloorplanId: store.activeFloorplanId,
          floorplans: store.floorplans,
        }),
      };

      if (hasLineEdits) {
        body.lineItems = store.result!.lineItems.map((it) => ({
          id: it.id,
          partida: it.partida,
          code: it.code,
          description: it.description,
          unit: it.unit,
          quantity: it.quantity,
          unitCost: it.unitCost,
          total: it.total,
          system: it.system,
          category: it.category,
          marca: it.marca ?? "",
          modelo: it.modelo ?? "",
        }));
        // BUGFIX: marcar explícitamente que NO se debe recalcular. Sin esto,
        // si el usuario tocó CUALQUIER factor (IVA, indirecto, etc.) entre
        // el guardado y la próxima vista, el backend sobreescribía las
        // ediciones manuales con el cálculo del motor.
        body.forceRecalc = false;
      }

      let id: string | null = store.estimateId;
      if (id) {
        const res = await fetch(`/api/estimates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        // BUGFIX: cuando hay ediciones manuales, recargar el `result` desde
        // la respuesta del servidor para garantizar que la próxima vista
        // refleje exactamente lo persistido.
        if (hasLineEdits && res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.lineItems)) {
            store.setResult({
              lineItems: data.lineItems,
              subtotalMaterials: data.subtotalMaterials ?? 0,
              subtotalLabor: data.subtotalLabor ?? 0,
              subtotalEngineering: data.subtotalEngineering ?? 0,
              subtotalDirect: data.subtotalDirect ?? 0,
              subtotalIndirects: data.subtotalIndirects ?? 0,
              subtotalUtility: data.subtotalUtility ?? 0,
              grandTotal: data.grandTotal ?? 0,
              iva: data.iva ?? 0,
              totalWithIva: data.totalWithIva ?? data.grandTotal ?? 0,
            });
          }
        }
      } else {
        const res = await fetch('/api/estimates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        const newId: unknown = data?.id;
        if (typeof newId === 'string') {
          id = newId;
          store.setEstimateId(newId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('lve.currentEstimateId', newId);
          }
        }
      }
      if (hasLineEdits) {
        store.markResultPersisted();
        toast.success('Ediciones del presupuesto guardadas');
      } else {
        toast.success('Presupuesto guardado correctamente');
      }
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

  /**
   * Calcula (o recalcula) el presupuesto desde la base de precios usando el
   * motor. Esta acción SOBREESCRIBE las ediciones manuales del usuario.
   *
   * Importante: ANTES de recalcular, hacemos un `handleSave` SIN enviar
   * `lineItems` para que el backend guarde solo los configs/factores, y
   * luego el `/calculate` regenera las líneas desde la BD de precios.
   * Si pasáramos las líneas editadas, el motor las sobreescribiría
   * igualmente, pero evitando un `data.lineItems` intermedio prevenimos
   * que `configsChanged` evalúe incorrectamente.
   */
  const handleCalculate = async (force: boolean = true) => {
    // BUGFIX: forzar un guardado limpio antes del recálculo. Limpiamos
    // isDirty y result para que handleSave no envíe lineItems que serían
    // sobreescritas inmediatamente por el motor.
    if (force && store.isDirty) {
      // Avisar al usuario que las ediciones manuales se van a perder.
      const ok = window.confirm(
        'Tienes ediciones manuales sin guardar. Al "Generar Paramétrico" se recalcularán TODAS las líneas desde la base de precios y se perderán los cambios manuales. ¿Deseas continuar?',
      );
      if (!ok) return;
      // Descartar el resultado manual para evitar que se envíe en el save.
      store.revertLineItems();
    }
    const id = await handleSave();
    if (!id) {
      toast.error('No se pudo guardar el presupuesto');
      return;
    }

    store.setIsCalculating(true);
    try {
      // Si force=true, pedimos al backend que regenere los lineItems desde
      // los precios. La respuesta del API ya contendrá el nuevo cálculo y
      // se inyecta en el store (lo que automáticamente limpia isDirty).
      const res = await fetch(`/api/estimates/${id}/calculate?force=${force ? '1' : '0'}`, { method: 'POST' });
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
        iva: data.iva ?? 0,
        totalWithIva: data.totalWithIva ?? data.grandTotal ?? 0,
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

  const handleLoadEstimate = async (id: string, skipTabSwitch: boolean = false) => {
    try {
      const res = await fetch(`/api/estimates/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      store.loadEstimate(data);
      store.setActiveEstimate(id);
      setRecentEntries((prev) => touchRecentEstimateEntries(prev, id));
      if (typeof window !== 'undefined') {
        localStorage.setItem('lve.currentEstimateId', id);
      }
      if (!skipTabSwitch) {
        setActiveMainTab('config');
        setWizardStep(0); // Reset wizard to first step
        toast.success('Presupuesto cargado');
      }
    } catch {
      toast.error('Error al cargar el presupuesto');
    }
  };

  // ─── Delete estimate ───────────────────────────────────────────────────

  const handleDeleteEstimate = async (id: string) => {
    try {
      await fetch(`/api/estimates/${id}`, { method: 'DELETE' });
      if (store.estimateId === id) {
        store.resetAll();
        setActiveMainTab('config');
        setWizardStep(0);
      }
      setRecentEntries((prev) => removeFromRecentEstimateEntries(prev, id));
      fetchEstimates();
      toast.success('Presupuesto eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // ─── New estimate ──────────────────────────────────────────────────────

  const handleNew = async () => {
    store.resetAll();
    setActiveMainTab('config');
    setWizardStep(0);
    await createDraftEstimate({ silent: true, force: true });
  };

  // ─── Format currency ───────────────────────────────────────────────────

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const getStatus = (est: EstimateRecord) => (est.grandTotal > 0 ? 'calculado' : 'borrador');

  const recentEntriesById = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of recentEntries) m.set(e.id, e.lastAccessed);
    return m;
  }, [recentEntries]);

  const orderedEstimates = useMemo(() => {
    const byId = new Map(estimates.map((e) => [e.id, e]));
    const out: EstimateRecord[] = [];
    const used = new Set<string>();
    for (const r of recentEntries) {
      const e = byId.get(r.id);
      if (!e) continue;
      out.push(e);
      used.add(e.id);
    }
    const rest = estimates
      .filter((e) => !used.has(e.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    out.push(...rest);
    return out;
  }, [estimates, recentEntries]);

  const visibleEstimates = useMemo(() => {
    const q = recentSearch.trim().toLowerCase();
    const now = Date.now();
    const dateCutoff =
      recentDate === '7d'
        ? now - 7 * 24 * 60 * 60 * 1000
        : recentDate === '30d'
          ? now - 30 * 24 * 60 * 60 * 1000
          : recentDate === '90d'
            ? now - 90 * 24 * 60 * 60 * 1000
            : null;

    return orderedEstimates
      .map((e) => {
        const lastAccessed = recentEntriesById.get(e.id) ?? new Date(e.updatedAt).getTime();
        return { e, lastAccessed };
      })
      .filter(({ e, lastAccessed }) => {
        if (dateCutoff !== null && lastAccessed < dateCutoff) return false;
        if (recentStatus !== 'all' && getStatus(e) !== recentStatus) return false;
        if (!q) return true;
        const haystack = `${e.name} ${e.clientName ?? ''} ${e.projectName ?? ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, 25);
  }, [orderedEstimates, recentEntriesById, recentSearch, recentStatus, recentDate]);

  // ─── Wizard Sub-components ─────────────────────────────────────────────

  const renderProjectInfoForm = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-2">
      <div className="space-y-2">
        <Label htmlFor="est-name" className="text-sm font-medium text-stone-700">Nombre del Presupuesto</Label>
        <Input
          id="est-name"
          value={store.name}
          onChange={(e) => store.setName(e.target.value)}
          placeholder="Ej: Cotización Edificio A"
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client" className="text-sm font-medium text-stone-700 flex items-center gap-2">
          <User className="w-4 h-4" /> Cliente
        </Label>
        <Input
          id="client"
          value={store.clientName}
          onChange={(e) => store.setClientName(e.target.value)}
          placeholder="Nombre de la empresa"
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project" className="text-sm font-medium text-stone-700 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Proyecto
        </Label>
        <Input
          id="project"
          value={store.projectName}
          onChange={(e) => store.setProjectName(e.target.value)}
          placeholder="Ubicación o alcance"
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-stone-700">Moneda</Label>
        <Select value={store.currency} onValueChange={(v) => store.setCurrency(v as 'MXN' | 'USD')}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
            <SelectItem value="USD">USD - Dólar Americano</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="revision" className="text-sm font-medium text-stone-700">Revisión</Label>
        <Input
          id="revision"
          value={store.revision}
          onChange={(e) => store.setRevision(e.target.value)}
          placeholder="Rev. 1"
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="responsible" className="text-sm font-medium text-stone-700">Responsable</Label>
        <Input
          id="responsible"
          value={store.responsible}
          onChange={(e) => store.setResponsible(e.target.value)}
          placeholder="Nombre del responsable"
          className="h-10"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes" className="text-sm font-medium text-stone-700">Observaciones</Label>
        <textarea
          id="notes"
          value={store.notes}
          onChange={(e) => store.setNotes(e.target.value)}
          placeholder="Notas generales del proyecto…"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        />
      </div>
    </div>
  );

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

              {currentUser && (
                <div className="flex items-center gap-2 pl-2 border-l border-stone-200 ml-1">
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-semibold text-stone-800 leading-tight">{currentUser.name}</span>
                    <span className="text-[10px] text-stone-500">{currentUser.email}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                      currentUser.role === 'ADMINISTRADOR'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : currentUser.role === 'SUPERVISOR'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-stone-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    {currentUser.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    title="Cerrar Sesión"
                    className="text-stone-500 hover:text-red-600 hover:bg-red-50 p-2 h-8 w-8"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Navigation Tabs ─────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
            <TabsList className="bg-transparent h-12 p-0 gap-1 w-full justify-start overflow-x-auto custom-scrollbar flex-nowrap shrink-0">
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
              <TabsTrigger
                value="floorplan"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-none px-4 h-12 text-sm font-medium gap-2 text-stone-600 data-[state=active]:text-emerald-700"
              >
                <MapPin className="w-4 h-4 text-emerald-600" />
                Plano Espacial
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-none px-4 h-12 text-sm font-medium gap-2 text-stone-600 data-[state=active]:text-emerald-700"
              >
                <CalendarDays className="w-4 h-4" />
                Cronograma
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-none px-4 h-12 text-sm font-medium gap-2 text-stone-600 data-[state=active]:text-emerald-700"
              >
                <BarChart3 className="w-4 h-4" />
                Reportes
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-none px-4 h-12 text-sm font-medium gap-2 text-stone-600 data-[state=active]:text-emerald-700"
              >
                <PieChart className="w-4 h-4" />
                Análisis
              </TabsTrigger>
              <TabsTrigger
                value="vivotek"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-none px-4 h-12 text-sm font-medium gap-2 text-stone-600 data-[state=active]:text-emerald-700 shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Reg. VIVOTEK
              </TabsTrigger>
              {currentUser && isAdminRole(currentUser.role) && (
                <TabsTrigger
                  value="users"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:shadow-none px-4 h-12 text-sm font-medium gap-2 text-stone-600 data-[state=active]:text-emerald-700 shrink-0"
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  Usuarios
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── Config Tab Content ─────────────────────────────────── */}
            <TabsContent value="config" className="mt-0">
              <div className="max-w-7xl mx-auto py-6 px-0 lg:px-0">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Wizard content */}
                  <div className="flex-1 min-w-0">
                    
                    {/* Stepper Header */}
                    <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
                      {WIZARD_STEPS.map((s, i) => (
                        <div key={s.id} className="flex items-center min-w-max px-2">
                          <div
                            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2
                              ${i < wizardStep ? 'bg-emerald-600 text-white' : i === wizardStep ? 'bg-emerald-100 text-emerald-700 border border-emerald-600' : 'bg-stone-100 text-stone-400'}`}
                          >
                            {i < wizardStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                          </div>
                          <span className={`text-sm font-medium ${i <= wizardStep ? 'text-stone-800' : 'text-stone-400'}`}>
                            {s.label}
                          </span>
                          {i < WIZARD_STEPS.length - 1 && (
                            <ChevronRight className="w-4 h-4 mx-3 text-stone-300" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Step Content */}
                    <Card className="border-stone-200 shadow-sm min-h-100">
                      <CardHeader className="pb-3 border-b border-stone-100 bg-stone-50/50 rounded-t-xl">
                        <CardTitle className="text-lg font-semibold text-stone-800 flex items-center gap-2">
                          {WIZARD_STEPS[wizardStep].label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {wizardStep === 0 && renderProjectInfoForm()}
                        {wizardStep === 1 && <CctvForm />}
                        {wizardStep === 2 && <AccessForm />}
                        {wizardStep === 3 && <PagingForm />}
                        {wizardStep === 4 && <FireForm />}
                        {wizardStep === 5 && <FactorsPanel />}
                        {wizardStep === 6 && <LaborPanel />}
                        {wizardStep === 7 && <ValidationPanel />}
                      </CardContent>
                    </Card>

                    {/* Wizard Controls */}
                    <div className="flex justify-between mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setWizardStep(w => w - 1)}
                        disabled={wizardStep === 0}
                        className="gap-2 text-stone-600"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                      </Button>
                      
                      {wizardStep < WIZARD_STEPS.length - 1 ? (
                        <Button
                          onClick={() => setWizardStep(w => w + 1)}
                          className="gap-2 bg-stone-800 hover:bg-stone-900 text-white"
                        >
                          Siguiente
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        // Paso 7 (Validaciones) — el último paso del wizard
                        // muestra directamente "Generar Paramétrico" en
                        // lugar de "Siguiente" (que no tiene sentido aquí).
                        <Button
                          onClick={() => handleCalculate(true)}
                          disabled={store.isCalculating}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md px-6"
                        >
                          {store.isCalculating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Calculator className="w-4 h-4" />
                          )}
                          Generar Paramétrico
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right: Sidebar */}
                  <div className="w-full lg:w-80 xl:w-96 space-y-6 shrink-0">
                    <Card className="border-stone-200 shadow-sm sticky top-24">
                      <CardHeader className="pb-3 bg-stone-50/50 rounded-t-xl border-b border-stone-100">
                        <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          Presupuestos Recientes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {loadingEstimates ? (
                          <div className="space-y-3">
                            <Skeleton className="h-12 w-full rounded-lg" />
                            <Skeleton className="h-12 w-full rounded-lg" />
                          </div>
                        ) : estimates.length === 0 ? (
                          <div className="text-center py-8">
                            <Briefcase className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                            <p className="text-xs text-stone-500">No hay presupuestos guardados</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-2">
                              <Input
                                value={recentSearch}
                                onChange={(e) => setRecentSearch(e.target.value)}
                                placeholder="Buscar por nombre, cliente o proyecto…"
                                className="h-9 bg-white"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Select value={recentStatus} onValueChange={(v) => setRecentStatus(v as EstimateStatusFilter)}>
                                  <SelectTrigger className="h-9 bg-white">
                                    <SelectValue placeholder="Estado" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="borrador">Borrador</SelectItem>
                                    <SelectItem value="calculado">Calculado</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select value={recentDate} onValueChange={(v) => setRecentDate(v as EstimateDateFilter)}>
                                  <SelectTrigger className="h-9 bg-white">
                                    <SelectValue placeholder="Fecha" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="7d">Últimos 7 días</SelectItem>
                                    <SelectItem value="30d">Últimos 30 días</SelectItem>
                                    <SelectItem value="90d">Últimos 90 días</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {visibleEstimates.length === 0 ? (
                              <div className="text-center py-6">
                                <Briefcase className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                                <p className="text-xs text-stone-500">No hay resultados con los filtros actuales</p>
                              </div>
                            ) : (
                              <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto pr-1.5 space-y-2 custom-scrollbar border-t border-stone-100/80 pt-2">
                                {visibleEstimates.map(({ e: est, lastAccessed }) => {
                                  const status = getStatus(est);
                                  return (
                                    <div
                                      key={est.id}
                                      className={`flex items-start justify-between p-3 rounded-lg cursor-pointer transition-all group ${
                                        store.estimateId === est.id
                                          ? 'bg-emerald-50 border border-emerald-200 shadow-sm'
                                          : 'bg-white hover:bg-stone-50 border border-stone-200'
                                      }`}
                                      onClick={() => handleLoadEstimate(est.id)}
                                    >
                                      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                                            <p className="text-sm font-semibold text-stone-900 wrap-break-word min-w-0">
                                              {est.name}
                                            </p>
                                            <Badge
                                              variant="outline"
                                              className={
                                                status === 'calculado'
                                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                  : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                              }
                                            >
                                              {status === 'calculado' ? 'Calculado' : 'Borrador'}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-stone-500 mt-0.5 whitespace-normal wrap-break-word">
                                            {(est.clientName || 'Sin cliente') + ' · ' + (est.projectName || 'Sin proyecto')}
                                          </p>
                                          <p className="text-[11px] text-stone-400 mt-1">
                                            Accedido:{' '}
                                            {new Date(lastAccessed).toLocaleDateString('es-MX', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                            })}
                                          </p>
                                        </div>
                                        <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start sm:pt-0.5">
                                          {est.grandTotal > 0 ? (
                                            <span className="text-xs sm:text-[13px] font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                                              {fmt(est.grandTotal)}
                                            </span>
                                          ) : (
                                            <span className="text-xs font-medium text-stone-400">—</span>
                                          )}
                                          <button
                                            onClick={(ev) => {
                                              ev.stopPropagation();
                                              handleDeleteEstimate(est.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition-opacity p-1 rounded-md hover:bg-red-50"
                                            title="Eliminar"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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

            {/* ── Floorplan Tab Content ───────────────────────────────── */}
            <TabsContent value="floorplan" className="mt-0">
              <div className="max-w-7xl mx-auto py-6">
                <FloorplanView onSave={handleSave} isSaving={saving} />
              </div>
            </TabsContent>

            {/* ── Schedule Tab Content ───────────────────────────────── */}
            <TabsContent value="schedule" className="mt-0">
              <div className="max-w-7xl mx-auto py-6">
                <ScheduleView
                  estimateId={store.estimateId}
                  activeEstimateId={store.activeEstimateId}
                  projectName={store.projectName}
                />
              </div>
            </TabsContent>

            {/* ── Reports Tab Content (D3, TASK §17) ────────────────── */}
            <TabsContent value="reports" className="mt-0">
              <div className="max-w-7xl mx-auto py-6">
                <ReportsView />
              </div>
            </TabsContent>

            {/* ── Analytics Tab Content (E3, TASK §17) ─────────────── */}
            <TabsContent value="analytics" className="mt-0">
              <div className="max-w-7xl mx-auto py-6">
                <AnalyticsView />
              </div>
            </TabsContent>

            {/* ── Registro VIVOTEK / TVC Tab Content ─────────────── */}
            <TabsContent value="vivotek" className="mt-0">
              <div className="max-w-7xl mx-auto py-6">
                <VivotekForm />
              </div>
            </TabsContent>

            {/* ── Users Module Tab Content (Exclusivo Admin) ───────── */}
            {currentUser && isAdminRole(currentUser.role) && (
              <TabsContent value="users" className="mt-0">
                <UsersView />
              </TabsContent>
            )}
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
              Cálculo paramétrico asistido
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
