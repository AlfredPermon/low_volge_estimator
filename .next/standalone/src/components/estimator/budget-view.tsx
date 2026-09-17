'use client';

import { useId, useMemo, useState } from 'react';
import {
  FileText,
  Download,
  DollarSign,
  Users,
  Wrench,
  TrendingUp,
  Building2,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  AlertCircle,
  RotateCcw,
  Plus,
  Trash2,
  History,
  Save,
  Clock,
} from 'lucide-react';
import { useEstimateStore, type LineItem, type EstimateFactors } from '@/store/estimate-store';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { validateLineItems, summarizeAlerts, type ValidationAlert } from '@/lib/validators';
import { exportBudgetToPDF } from '@/lib/pdf-export';
import { filterLineItemsForExport } from '@/lib/export-filters';
import { buildBudgetCsvContent } from '@/lib/budget-csv';
import ApuDialog from '@/components/estimator/apu-dialog';
import AddDeviceDialog from '@/components/estimator/add-device-dialog';
import { toast } from 'sonner';

// ─── System color mapping ──────────────────────────────────────────────

/**
 * NOTA: las clases `hover:bg-*` deben estar como literales aquí porque
 * Tailwind JIT no procesa template strings dinámicos (`hover:${style.bg}`
 * no genera CSS en producción).
 */
const SYSTEM_STYLES: Record<
  string,
  { bg: string; hoverBg: string; text: string; border: string; badge: string }
> = {
  CCTV: {
    bg: 'bg-slate-50',
    hoverBg: 'hover:bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  ACCESO: {
    bg: 'bg-amber-50',
    hoverBg: 'hover:bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  VOCEO: {
    bg: 'bg-purple-50',
    hoverBg: 'hover:bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  INCENDIO: {
    bg: 'bg-red-50',
    hoverBg: 'hover:bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-800 border-red-300',
  },
  CANALIZACION: {
    bg: 'bg-teal-50',
    hoverBg: 'hover:bg-teal-100',
    text: 'text-teal-800',
    border: 'border-teal-300',
    badge: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  CABLEADO: {
    bg: 'bg-orange-50',
    hoverBg: 'hover:bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  GENERAL: {
    bg: 'bg-gray-50',
    hoverBg: 'hover:bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined, currency: 'MXN' | 'USD'): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

function formatQty(value: number | null | undefined): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return safe.toFixed(2);
}

function getSystemStyle(system: string) {
  return SYSTEM_STYLES[system] ?? SYSTEM_STYLES.GENERAL;
}

function getSystemDisplayName(system: string): string {
  const names: Record<string, string> = {
    CCTV: 'CCTV — Videovigilancia',
    ACCESO: 'Control de Acceso',
    VOCEO: 'Sistema de Voceo / PA',
    INCENDIO: 'Detección y Alarma contra Incendio',
    CANALIZACION: 'Canalización',
    CABLEADO: 'Cableado Estructurado',
    GENERAL: 'Generales y Servicios',
  };
  return names[system] ?? system;
}

// ─── CSV Export ────────────────────────────────────────────────────────

function exportToCSV(
  lineItems: LineItem[],
  currency: 'MXN' | 'USD',
  result: NonNullable<ReturnType<typeof useEstimateStore.getState>['result']>,
  name: string,
  clientName: string,
  projectName: string,
  notes: string,
  factorsNotes: string,
) {
  const csvContent = buildBudgetCsvContent({
    lineItems,
    currency,
    result: {
      subtotalDirect: result.subtotalDirect ?? 0,
      subtotalIndirects: result.subtotalIndirects ?? 0,
      subtotalUtility: result.subtotalUtility ?? 0,
      grandTotal: result.grandTotal ?? 0,
      iva: result.iva ?? 0,
      totalWithIva: result.totalWithIva ?? 0,
    },
    meta: { name, clientName, projectName },
    notes,
    factorsNotes,
  });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _-]/g, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────

export default function BudgetView() {
  const result = useEstimateStore((s) => s.result);
  const currency = useEstimateStore((s) => s.currency);
  const name = useEstimateStore((s) => s.name);
  const clientName = useEstimateStore((s) => s.clientName);
  const projectName = useEstimateStore((s) => s.projectName);
  const revision = useEstimateStore((s) => s.revision);
  const responsible = useEstimateStore((s) => s.responsible);
  const notes = useEstimateStore((s) => s.notes);
  const factorsNotes = useEstimateStore((s) => s.factorsNotes);
  const factors = useEstimateStore((s) => s.factors);
  const updateLineItem = useEstimateStore((s) => s.updateLineItem);
  const removeLineItem = useEstimateStore((s) => s.removeLineItem);
  const activeEstimateId = useEstimateStore((s) => s.activeEstimateId);
  const estimateId = useEstimateStore((s) => s.estimateId);
  const saveEstimateToDb = useEstimateStore((s) => s.saveEstimateToDb);
  const isDirty = useEstimateStore((s) => s.isDirty);
  const revertLineItems = useEstimateStore((s) => s.revertLineItems);
  const restoreHistoryVersion = useEstimateStore((s) => s.restoreHistoryVersion);

  // Estados de modales (Agregar dispositivo / Confirmar eliminación / Historial / Alerta de error)
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addModalSystem, setAddModalSystem] = useState<string>('CCTV');
  const [deletingItem, setDeletingItem] = useState<LineItem | null>(null);
  const [errorAlert, setErrorAlert] = useState<{ title: string; message: string } | null>(null);

  // Historial
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyEntries, setHistoryEntries] = useState<Array<{ id: string; changeType: string; user: string; details: string; snapshot?: string; createdAt: string }>>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  const fetchHistory = async () => {
    const targetId = activeEstimateId || estimateId;
    if (!targetId) return;
    try {
      setIsHistoryLoading(true);
      const res = await fetch(`/api/estimates/${targetId}/history`);
      if (res.ok) {
        const json = await res.json();
        setHistoryEntries(json.data ?? []);
      }
    } catch {
      toast.error('No se pudo cargar el historial de cambios');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSelectHistoryVersion = (entry: { id: string; changeType: string; user: string; details: string; snapshot?: string; createdAt: string }) => {
    try {
      if (!entry.snapshot || entry.snapshot === '{}') {
        setErrorAlert({
          title: 'No se puede restaurar la versión',
          message: 'La versión seleccionada no cuenta con un respaldo (snapshot) de partidas grabado. Por favor selecciona una versión guardada mediante el botón "Guardar Cambios".',
        });
        return;
      }

      const dateObj = new Date(entry.createdAt);
      const formattedDate = dateObj.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const ok = restoreHistoryVersion(entry.snapshot);
      if (ok) {
        setIsHistoryOpen(false);
        toast.success(`Versión del ${formattedDate} cargada exitosamente en el presupuesto.`);
      } else {
        setErrorAlert({
          title: 'Fallo de actualización del presupuesto',
          message: 'No se pudieron extraer las partidas de la versión seleccionada. El respaldo contiene un formato no soportado.',
        });
      }
    } catch (err) {
      console.error('Error al seleccionar versión del historial:', err);
      setErrorAlert({
        title: 'Error durante la selección de versión',
        message: 'Ocurrió un fallo inesperado al actualizar la vista de presupuesto. Reintente la acción.',
      });
    }
  };

  const handleOpenAddModal = (system: string) => {
    setAddModalSystem(system);
    setIsAddModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    const partidaNum = deletingItem.partida;
    const codeStr = deletingItem.code;
    removeLineItem(deletingItem.id);
    toast.success(`Partida ${partidaNum} ("${codeStr}") eliminada`);
    setDeletingItem(null);
  };

  // Validación dinámica de partidas (TASK §12, §13)
  const alerts: ValidationAlert[] = useMemo(
    () => (result ? validateLineItems(result.lineItems) : []),
    [result]
  );
  const alertSummary = useMemo(() => summarizeAlerts(alerts), [alerts]);

  // Group line items by system, preserving order (CCTV, ACCESO, VOCEO, INCENDIO)
  const groupedItems = useMemo(() => {
    if (!result) return [];
    const systemOrder = [
      'CCTV',
      'ACCESO',
      'VOCEO',
      'INCENDIO',
    ];
    const map = new Map<string, LineItem[]>();
    for (const item of result.lineItems) {
      const list = map.get(item.system) ?? [];
      list.push(item);
      map.set(item.system, list);
    }
    const ordered: { system: string; items: LineItem[]; subtotal: number }[] = [];
    for (const sys of systemOrder) {
      const items = map.get(sys) ?? [];
      ordered.push({
        system: sys,
        items,
        subtotal: items.reduce((sum, it) => sum + (it.total ?? 0), 0),
      });
    }
    // Add any systems not in the predefined order if they contain items
    for (const [sys, items] of map) {
      if (!systemOrder.includes(sys) && items.length > 0) {
        ordered.push({
          system: sys,
          items,
          subtotal: items.reduce((sum, it) => sum + (it.total ?? 0), 0),
        });
      }
    }
    return ordered;
  }, [result]);

  // ── Placeholder ──────────────────────────────────────────────────────
  if (!result) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="rounded-full bg-teal-50 p-5">
            <Building2 className="h-10 w-10 text-teal-500" />
          </div>
          <p className="text-center text-muted-foreground max-w-md leading-relaxed">
            Configure los sistemas y presione &lsquo;Calcular Presupuesto&rsquo;
            para ver el desglose.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-teal-50 p-2.5">
            <FileText className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{name}</h2>
            <p className="text-sm text-muted-foreground">
              {clientName && `Cliente: ${clientName}`}
              {clientName && projectName && ' · '}
              {projectName && `Proyecto: ${projectName}`}
              {(clientName || projectName) && ' · '}
              <span className="font-mono text-xs">{revision}</span>
              {responsible && ` · Responsable: ${responsible}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Indicador de ediciones manuales sin guardar (BUDGET-PERSISTENCE) */}
          {isDirty && (
            <Badge
              variant="outline"
              className="border-amber-400 bg-amber-50 text-amber-800 font-semibold gap-1.5 px-3 py-1"
              title="Tienes ediciones manuales que aún no se han guardado en la base de datos"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Ediciones sin guardar
            </Badge>
          )}
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold px-3 py-1">
            {currency}
          </Badge>
          {/* Botón para revertir todas las ediciones al último snapshot persistido */}
          {isDirty && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => {
                revertLineItems();
                toast.info('Ediciones revertidas al último estado guardado');
              }}
              title="Descartar todas las ediciones manuales y volver al último estado guardado"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Revertir
            </Button>
          )}
          {/* Botón Guardar Cambios en BD */}
          <Button
            size="sm"
            onClick={async () => {
              const ok = await saveEstimateToDb();
              if (ok) {
                toast.success('Presupuesto guardado exitosamente en la base de datos');
              } else {
                toast.error('Ocurrió un error al guardar el presupuesto en la base de datos');
              }
            }}
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm"
            title="Guardar versión editada del presupuesto en la base de datos"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar Cambios
          </Button>
          {/* Botón Historial de Cambios */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-stone-300 text-stone-700 hover:bg-stone-100"
            onClick={() => {
              setIsHistoryOpen(true);
              fetchHistory();
            }}
            title="Ver el historial completo de modificaciones de este presupuesto"
          >
            <History className="h-3.5 w-3.5 text-stone-600" />
            Historial
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-stone-300 text-stone-700 hover:bg-stone-50"
            onClick={() =>
              exportToCSV(
                result.lineItems,
                currency,
                result,
                name,
                clientName,
                projectName,
                notes,
                factorsNotes,
              )
            }
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={async () => {
              try {
                // Enriquecer las partidas con Marca y Modelo desde el catálogo
                // de Precios. Esto garantiza que las columnas siempre tengan
                // datos, incluso cuando los lineItems fueron guardados antes de
                // que se agregaran los campos marca/modelo.
                const enrichedItems = await (async () => {
                  try {
                    const res = await fetch('/api/prices?limit=1000');
                    if (!res.ok) return result.lineItems;
                    const json = await res.json();
                    const prices: Array<{ sku: string; brand: string; model: string; description: string; unitCost: number }> =
                      json.data ?? json ?? [];

                    // ─── Algoritmo de matching mejorado ───────────────────────────────────────
                    // Extrae palabras clave de la descripción para filtrar por tipo de producto
                    function extractKeywords(desc: string): Set<string> {
                      const normalized = desc.toLowerCase().replace(/[^\w\s]/g, ' ');
                      const words = normalized.split(/\s+/).filter(w => w.length >= 3);
                      return new Set(words);
                    }

                    // Calcula el score de overlap entre dos conjuntos de keywords
                    function keywordOverlap(itemKw: Set<string>, catalogKw: Set<string>): number {
                      let overlap = 0;
                      for (const w of itemKw) {
                        if (catalogKw.has(w)) overlap++;
                      }
                      return overlap;
                    }

                    // Mejor match: combina keywords + substring matching inteligente
                    function findBestMatch(itemDesc: string, itemCode: string): { brand: string; model: string; score: number } | null {
                      const itemKw = extractKeywords(itemDesc);
                      const itemDescNorm = itemDesc.toLowerCase().replace(/\s+/g, ' ');
                      const itemCodeNorm = (itemCode || '').toLowerCase().trim();
                      let bestMatch: { brand: string; model: string; score: number } | null = null;

                      for (const p of prices) {
                        if (!p.brand || p.brand === '—') continue;
                        if (!p.description) continue;

                        const catDescNorm = p.description.toLowerCase().replace(/\s+/g, ' ');
                        const catKw = extractKeywords(p.description);
                        const pSkuNorm = (p.sku || '').toLowerCase().trim();
                        const pModelNorm = (p.model || '').toLowerCase().trim();
                        let score = 0;

                        // 1) Match exacto de SKU (alta prioridad)
                        if (itemCodeNorm && pSkuNorm && itemCodeNorm === pSkuNorm) {
                          score += 150;
                        }
                        if (itemCodeNorm && pModelNorm && itemCodeNorm === pModelNorm) {
                          score += 170;
                        }

                        // 2) Overlap de keywords (palabras en común)
                        score += keywordOverlap(itemKw, catKw) * 2;

                        // 3) Descripción exacta normalizada
                        if (itemDescNorm === catDescNorm) {
                          score += 200;
                        }

                        // 4) Substring match mejorado: usar palabras completas, no fragmentos
                        // Buscar si palabras significativas del catálogo aparecen en el item
                        const significantWords = [...catKw].filter(w => w.length >= 4);
                        let wordMatches = 0;
                        for (const word of significantWords.slice(0, 5)) { // max 5 palabras significativas
                          if (itemDescNorm.includes(word)) wordMatches++;
                        }
                        score += wordMatches * 10;

                        // 5) Si la descripción del catálogo está contenida en la del item (longitud mínima)
                        if (catDescNorm.length >= 20 && itemDescNorm.includes(catDescNorm.slice(0, 40))) {
                          score += 50;
                        }

                        // 6) Si la descripción del item está al inicio de la del catálogo (longitud mínima)
                        if (itemDescNorm.length >= 20 && catDescNorm.startsWith(itemDescNorm.slice(0, 30))) {
                          score += 40;
                        }

                        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                          bestMatch = { brand: p.brand, model: p.model || p.sku, score };
                        }
                      }

                      // Solo retornar si el score es suficientemente alto (umbral)
                      if (bestMatch && bestMatch.score >= 20) {
                        return bestMatch;
                      }
                      return null;
                    }

                    return result.lineItems.map((item) => {
                      // Si ya tiene marca y modelo, no cambiar
                      if (item.marca && item.modelo) return item;
                      
                      const match = findBestMatch(item.description ?? '', item.code ?? '');
                      if (match) {
                        return { ...item, marca: match.brand, modelo: match.model };
                      }
                      return item;
                    });
                  } catch {
                    return result.lineItems;
                  }
                })();

                const filename = exportBudgetToPDF(enrichedItems, result, {
                  name,
                  clientName,
                  projectName,
                  revision,
                  responsible,
                  notes,
                  factorsNotes,
                  currency,
                });
                toast.success(`PDF generado: ${filename}`);
              } catch {
                toast.error('Error al generar el PDF');
              }
            }}
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Alerts Panel (TASK §12, §13) */}
      {alerts.length > 0 && (
        <Alert
          className={
            alertSummary.errors > 0
              ? "border-red-300 bg-red-50"
              : "border-amber-300 bg-amber-50"
          }
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            {alertSummary.errors > 0
              ? `Se detectaron ${alertSummary.errors} error(es) y ${alertSummary.warnings} advertencia(s)`
              : `Se detectaron ${alertSummary.warnings} advertencia(s) y ${alertSummary.info} nota(s)`}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 text-xs max-h-48 overflow-y-auto">
              {alerts.slice(0, 20).map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className={
                      a.severity === "error"
                        ? "text-red-700 font-semibold"
                        : a.severity === "warning"
                          ? "text-amber-700"
                          : "text-sky-700"
                    }
                  >
                    [{a.code}]
                  </span>
                  <span>{a.message}</span>
                </li>
              ))}
              {alerts.length > 20 && (
                <li className="text-muted-foreground italic">
                  … y {alerts.length - 20} más
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {alerts.length === 0 && (
        <Alert className="border-emerald-300 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-700">Validación correcta</AlertTitle>
          <AlertDescription className="text-emerald-700 text-xs">
            Todas las partidas cumplen las reglas de validación.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Materiales */}
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2.5">
              <DollarSign className="h-5 w-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                Total Materiales
              </p>
              <p className="text-lg font-bold text-slate-800 truncate">
                {formatCurrency(result.subtotalMaterials, currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mano de Obra */}
        <Card className="border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                Mano de Obra
              </p>
              <p className="text-lg font-bold text-amber-800 truncate">
                {formatCurrency(result.subtotalLabor, currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Costos Indirectos */}
        <Card className="border-teal-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-teal-50 p-2.5">
              <Wrench className="h-5 w-5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                Costos Indirectos
              </p>
              <p className="text-lg font-bold text-teal-700 truncate">
                {formatCurrency(result.subtotalIndirects, currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* TOTAL CON IVA (TASK §7) */}
        <Card className="border-emerald-300 bg-emerald-50/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-emerald-700 font-semibold truncate">
                TOTAL CON IVA
              </p>
              <p className="text-xl font-bold text-emerald-600 truncate">
                {formatCurrency(result.totalWithIva ?? result.grandTotal, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Line Items Table */}
      <Card>
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20 text-xs font-semibold">
                  Partida
                </TableHead>
                <TableHead className="w-28 text-xs font-semibold">
                  Código
                </TableHead>
                <TableHead className="text-xs font-semibold min-w-0">
                  Descripción
                </TableHead>
                <TableHead className="w-16 text-xs font-semibold text-center">
                  Unidad
                </TableHead>
                <TableHead className="w-24 text-xs font-semibold text-right">
                  Cantidad
                </TableHead>
                <TableHead className="w-28 text-xs font-semibold text-right">
                  P.U.
                </TableHead>
                <TableHead className="w-32 text-xs font-semibold text-right">
                  Importe
                </TableHead>
                <TableHead className="w-16 text-xs font-semibold text-center">
                  APU
                </TableHead>
                <TableHead className="w-20 text-xs font-semibold text-center">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedItems.map((group) => {
                const style = getSystemStyle(group.system);
                return (
                  <GroupedRows
                    key={group.system}
                    group={group}
                    style={style}
                    currency={currency}
                    factors={factors}
                    onUpdate={updateLineItem}
                    onAddRow={handleOpenAddModal}
                    onDeleteRow={setDeletingItem}
                  />
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      {/* Totals Section */}
      <Card className="border-emerald-200">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Resumen de Totales
          </h3>
          <div className="space-y-2 max-w-sm ml-auto">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal Directo</span>
              <span className="font-medium">
                {formatCurrency(result.subtotalDirect, currency)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground -mt-1 ml-auto max-w-sm text-right">
              (Materiales + Mano de Obra)
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Costos Indirectos</span>
              <span className="font-medium">
                {formatCurrency(result.subtotalIndirects, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilidad</span>
              <span className="font-medium">
                {formatCurrency(result.subtotalUtility, currency)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <span className="text-base font-semibold text-stone-700">
                GRAN TOTAL (sin IVA)
              </span>
              <span className="text-base font-bold text-stone-700">
                {formatCurrency(result.grandTotal, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">IVA</span>
              <span className="font-medium">
                {formatCurrency(result.iva ?? 0, currency)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <span className="text-lg font-bold text-emerald-600">
                TOTAL CON IVA
              </span>
              <span className="text-xl font-bold text-emerald-600">
                {formatCurrency(result.totalWithIva ?? result.grandTotal, currency)}
              </span>
            </div>
            {notes && (
              <>
                <Separator className="my-3" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold mb-1">Observaciones:</p>
                  <p className="italic whitespace-pre-wrap">{notes}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Búsqueda y Selección de Dispositivos */}
      <AddDeviceDialog
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        defaultSystem={addModalSystem}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent className="border-stone-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700 flex items-center gap-2 text-base">
              <Trash2 className="h-5 w-5" />
              Confirmar Eliminación de Fila
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 pt-1 text-stone-600 text-sm">
                <p>¿Estás seguro de que deseas eliminar permanentemente esta partida del presupuesto?</p>
                {deletingItem && (
                  <div className="rounded-md border border-stone-200 bg-stone-50 p-3 mt-2 font-mono text-xs text-stone-700 space-y-1">
                    <div><span className="font-semibold text-stone-500 font-sans">Partida:</span> {deletingItem.partida}</div>
                    <div><span className="font-semibold text-stone-500 font-sans">Código:</span> {deletingItem.code}</div>
                    <div><span className="font-semibold text-stone-500 font-sans">Descripción:</span> {deletingItem.description}</div>
                    <div><span className="font-semibold text-stone-500 font-sans">Sistema:</span> {getSystemDisplayName(deletingItem.system)}</div>
                    <div><span className="font-semibold text-stone-500 font-sans">Importe:</span> {formatCurrency(deletingItem.total, currency)}</div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stone-300 text-stone-750">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Eliminar Partida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Historial de Cambios */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-stone-200">
          <DialogHeader className="p-5 border-b border-stone-100 bg-stone-50/70">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-stone-500/10 p-2.5 text-stone-700">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-stone-800">
                  Historial de Cambios del Presupuesto
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  Registro cronológico de todas las modificaciones y auditoría de este presupuesto.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {isHistoryLoading ? (
              <div className="p-8 text-center text-xs text-stone-500">
                Cargando historial de cambios...
              </div>
            ) : historyEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No hay modificaciones registradas aún en el historial.
              </div>
            ) : (
              <div className="relative border-l-2 border-stone-200 ml-3 space-y-4">
                {historyEntries.map((entry) => {
                  const dateObj = new Date(entry.createdAt);
                  const dateStr = dateObj.toLocaleString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  });
                  const hasSnapshot = Boolean(entry.snapshot && entry.snapshot !== '{}');
                  return (
                    <div key={entry.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-teal-500 border-2 border-white" />
                      <div
                        onClick={() => handleSelectHistoryVersion(entry)}
                        className={`rounded-lg border bg-white p-3.5 shadow-xs space-y-1.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                          hasSnapshot
                            ? 'border-stone-200 hover:border-teal-400 hover:shadow-md hover:bg-teal-50/20 group'
                            : 'border-stone-200 bg-stone-50/50 hover:border-amber-300'
                        }`}
                        title={
                          hasSnapshot
                            ? 'Haz clic para cargar y restaurar esta versión en el presupuesto'
                            : 'Versión sin snapshot de partidas almacenado'
                        }
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700 font-semibold text-[10px]">
                              {entry.changeType}
                            </Badge>
                            {hasSnapshot && (
                              <span className="text-[10px] font-medium text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                Clic para restaurar ↵
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-400 font-mono">
                            {dateStr}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-stone-800 pt-0.5">
                          {entry.details}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          Realizado por: <span className="font-medium text-stone-700">{entry.user || 'José Alfredo Pérez Monroy'}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Alerta para Manejo de Errores en Selección de Versión */}
      <AlertDialog open={!!errorAlert} onOpenChange={(open) => !open && setErrorAlert(null)}>
        <AlertDialogContent className="border-red-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700 flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5" />
              {errorAlert?.title || 'Fallo de Actualización'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 pt-1 text-stone-600 text-sm">
                <p>{errorAlert?.message}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setErrorAlert(null)}
              className="bg-stone-800 hover:bg-stone-900 text-white font-semibold"
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Grouped Table Rows (sub-component) ────────────────────────────────

const SYSTEM_LABELS: Record<string, string> = {
  CCTV: '5.7.3 Sistema CCTV',
  ACCESO: '5.7.4 Sistema de Control de Acceso',
  VOCEO: '5.7.5 Sistema de Voceo',
  INCENDIO: '5.7.5 Sistema Contra Incendio',
  CANALIZACION: 'Canalización',
  CABLEADO: 'Cableado',
  GENERAL: 'Servicios Generales',
};

function DescriptionWithTooltip({
  description,
  label,
}: {
  description: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="block w-full min-w-0 text-left truncate rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={label}
          aria-describedby={open ? tooltipId : undefined}
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setOpen(false)}
          onMouseLeave={() => setOpen(false)}
        >
          {description || '—'}
        </button>
      </TooltipTrigger>
      <TooltipContent id={tooltipId} side="top" sideOffset={6} className="max-w-md">
        <div className="whitespace-pre-wrap wrap-break-word">{description || '—'}</div>
      </TooltipContent>
    </Tooltip>
  );
}

function GroupedRows({
  group,
  style,
  currency,
  factors,
  onUpdate,
  onAddRow,
  onDeleteRow,
}: {
  group: { system: string; items: LineItem[]; subtotal: number };
  style: { bg: string; text: string; border: string; badge: string };
  currency: 'MXN' | 'USD';
  factors: EstimateFactors;
  onUpdate: (
    id: string,
    patch: Partial<Pick<LineItem, 'quantity' | 'unitCost' | 'code'>>,
  ) => void;
  onAddRow: (system: string) => void;
  onDeleteRow: (item: LineItem) => void;
}) {
  return (
    <>
      {/* System group header */}
      <TableRow className={`${style.bg} hover:${style.bg}`}>
        <TableCell
          colSpan={9}
          className={`py-2 px-4 font-semibold text-sm ${style.text}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold">{getSystemDisplayName(group.system)}</span>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${style.badge} text-xs font-semibold`}
              >
                {formatCurrency(group.subtotal, currency)}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 bg-white text-xs font-medium border-stone-300 hover:bg-stone-50 text-stone-700 shadow-2xs"
                onClick={() => onAddRow(group.system)}
                title={`Agregar fila a ${getSystemDisplayName(group.system)}`}
              >
                <Plus className="h-3.5 w-3.5 text-teal-600" />
                Agregar Fila
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>

      {/* State for empty items in system */}
      {group.items.length === 0 && (
        <TableRow>
          <TableCell colSpan={9} className="text-center py-3 text-xs text-stone-500 italic bg-stone-50/30">
            Sin partidas registradas en {getSystemDisplayName(group.system)}. Haz clic en &quot;+ Agregar Fila&quot; para añadir dispositivos.
          </TableCell>
        </TableRow>
      )}

      {/* Line items for this system */}
      {group.items.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="text-xs text-muted-foreground font-mono">
            {item.partida}
          </TableCell>
          <TableCell className="text-xs font-mono p-1">
            <Input
              type="text"
              value={item.code}
              onChange={(e) => onUpdate(item.id, { code: e.target.value })}
              className="h-7 text-xs font-mono px-2"
              aria-label={`Código ${item.partida}`}
            />
          </TableCell>
          <TableCell className="text-sm min-w-0">
            <DescriptionWithTooltip
              description={item.description}
              label={`Descripción ${item.partida}`}
            />
          </TableCell>
          <TableCell className="text-xs text-center text-muted-foreground">
            {item.unit}
          </TableCell>
          <TableCell className="text-xs text-right tabular-nums p-1">
            <Input
              type="number"
              min={0}
              step="any"
              value={Number.isFinite(item.quantity) ? item.quantity : 0}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onUpdate(item.id, { quantity: 0 });
                  return;
                }
                const parsed = Number(raw);
                if (Number.isFinite(parsed) && parsed >= 0) {
                  onUpdate(item.id, { quantity: parsed });
                }
              }}
              className="h-7 ml-auto text-right text-xs tabular-nums px-2"
              aria-label={`Cantidad ${item.code}`}
            />
          </TableCell>
          <TableCell className="text-xs text-right tabular-nums p-1">
            <Input
              type="number"
              min={0}
              step="any"
              value={Number.isFinite(item.unitCost) ? item.unitCost : 0}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onUpdate(item.id, { unitCost: 0 });
                  return;
                }
                const parsed = Number(raw);
                if (Number.isFinite(parsed) && parsed >= 0) {
                  onUpdate(item.id, { unitCost: parsed });
                }
              }}
              className="h-7 ml-auto text-right text-xs tabular-nums px-2"
              aria-label={`Precio unitario ${item.code}`}
            />
          </TableCell>
          <TableCell className="text-sm text-right font-medium tabular-nums">
            {formatCurrency(item.total, currency)}
          </TableCell>
          <TableCell className="text-center p-1">
            <ApuDialog
              item={item}
              factors={factors}
              currency={currency}
              systemLabel={SYSTEM_LABELS[item.system] ?? item.system}
            />
          </TableCell>
          <TableCell className="text-center p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={() => onDeleteRow(item)}
              title={`Eliminar partida ${item.partida}`}
              aria-label={`Eliminar partida ${item.partida}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
