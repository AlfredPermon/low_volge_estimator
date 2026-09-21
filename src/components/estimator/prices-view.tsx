'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  Upload,
  Download,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  FileText,
  CheckCircle2,
  Clock,
  ListChecks,
  AlertTriangle,
  Pencil,
  Trash2,
  Plus,
  DatabaseZap,
  FileDown,
  ChevronDown,
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';

import { toast } from 'sonner';

import { useEstimateStore } from '@/store/estimate-store';
import EditPriceDialog, { type PriceItemFull } from './edit-price-dialog';
import CreatePriceDialog from './create-price-dialog';
import DeletePriceDialog from './delete-price-dialog';
import DuplicatesAnalyzer from './duplicates-analyzer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PriceItem {
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
  active: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PricesResponse {
  data: PriceItem[];
  pagination: Pagination;
}

interface ImportError {
  row: number;
  errors: string[];
}

interface ImportReport {
  total: number;
  imported: number;
  failed: number;
  errors: ImportError[];
  warnings: string[];
  duplicatesInFile: string[];
  unknownUnits: string[];
  refErrors: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYSTEMS = [
  'CCTV',
  'ACCESO',
  'VOCEO',
  'INCENDIO',
  'EXTINTOR',
  'CANALIZACION',
  'CABLEADO',
  'GENERAL',
] as const;

const CATEGORIES = [
  'Equipo',
  'Accesorio',
  'Consumible',
  'Mano de Obra',
  'Servicio',
] as const;

const SYSTEM_BADGE_VARIANT: Record<string, string> = {
  CCTV: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
  ACCESO: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  VOCEO: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  INCENDIO: 'bg-red-100 text-red-800 hover:bg-red-100',
  EXTINTOR: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border border-orange-200',
  CANALIZACION: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
  CABLEADO: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  GENERAL: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
};

const CATEGORY_BADGE_VARIANT: Record<string, string> = {
  Equipo: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200',
  Accesorio: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-50 border border-cyan-200',
  Consumible: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border border-yellow-200',
  'Mano de Obra': 'bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200',
  Servicio: 'bg-violet-50 text-violet-700 hover:bg-violet-50 border border-violet-200',
};

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PricesView() {
  const store = useEstimateStore();

  // --- Filter / pagination state -------------------------------------------
  const [system, setSystem] = useState<string>('Todos');
  const [category, setCategory] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  // --- Data state ----------------------------------------------------------
  const [items, setItems] = useState<PriceItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [exporting, setExporting] = useState(false);

  // --- Dialog state --------------------------------------------------------
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [deletingPrice, setDeletingPrice] = useState<{
    id: string;
    description: string;
    sku: string;
  } | null>(null);

  // --- Clear database dialogs state -----------------------------------------
  const [clearDialog1Open, setClearDialog1Open] = useState(false);
  const [clearDialog2Open, setClearDialog2Open] = useState(false);
  const [clearSuccessDialogOpen, setClearSuccessDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  // --- Fetch prices --------------------------------------------------------
  // Importante: el fetch se hace dentro del useEffect (sin useCallback
  // intermedio) para evitar el doble fetch que se producía al tener:
  //   1) un useEffect que llamaba fetchPrices() con la `page` anterior
  //   2) otro useEffect que reseteaba `page` a 1
  // También añadimos un flag `cancelled` para evitar race conditions
  // cuando el usuario cambia filtros rápidamente.
  //
  // El `refreshKey` permite forzar un re-fetch desde handlers externos
  // (import, seed, create) sin necesidad de recrear la función de fetch.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (system !== 'Todos') params.set('system', system);
        if (category !== 'Todos') params.set('category', category);
        if (search.trim()) params.set('search', search.trim());

        const res = await fetch(`/api/prices?${params.toString()}`);
        if (cancelled) return;
        if (!res.ok) throw new Error('Error al cargar precios');
        const json: PricesResponse = await res.json();
        if (cancelled) return;
        setItems(json.data);
        setPagination(json.pagination);
      } catch (err) {
        if (cancelled) return;
        toast.error('Error al cargar los precios', {
          description: err instanceof Error ? err.message : 'Error desconocido',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();
    return () => {
      cancelled = true;
    };
  }, [system, category, search, page, refreshKey]);

  // --- Handlers ------------------------------------------------------------
  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/prices/template', '_blank');
  };

  const handleExport = async (format: 'xlsx' | 'json') => {
    setExporting(true);
    try {
      const res = await fetch(`/api/prices/export?format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error al exportar como ${format}`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `precios_lve.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Base de datos exportada`, {
        description: `Archivo "${filename}" descargado correctamente.`,
      });
    } catch (err) {
      toast.error('Error al exportar', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo antes de importar');
      return;
    }

    setImporting(true);
    setImportErrors([]);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/prices/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.details && Array.isArray(err.details)) {
           setImportErrors(err.details);
           toast.error(err.error || 'Errores de validación en el archivo');
           return;
        }
        throw new Error(err.error || 'Error al importar archivo');
      }

      const result = await res.json();
      toast.success(`Importación exitosa`, {
        description: `Se importaron ${result.imported} de ${result.report?.total ?? result.imported} registros.`,
      });

      // F1 - Mostrar reporte detallado de importación
      if (result.report) {
        setImportReport(result.report);
        setReportDialogOpen(true);
      }

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImportDialogOpen(false);
      // Resetear a página 1 y forzar refresh tras import masivo
      setPage(1);
      refresh();
    } catch (err) {
      toast.error('Error al importar', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/prices/seed-defaults', {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al cargar precios por defecto');
      }

      const result = await res.json();
      toast.success('Precios por defecto cargados', {
        description: result.message || `Se crearon ${result.created} registros.`,
      });
      setPage(1);
      refresh();
    } catch (err) {
      toast.error('Error al cargar por defecto', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleClearDatabase = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/prices/clear', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al limpiar la base de datos');
      }

      setClearDialog2Open(false);
      setClearSuccessDialogOpen(true);
      setPage(1);
      refresh();
    } catch (err) {
      toast.error('Error al limpiar la base de datos', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
      setClearDialog2Open(false);
    } finally {
      setClearing(false);
    }
  };

  /**
   * Handler común: aplica una mutación al array de items local tras un CRUD
   * exitoso para mantener la UI sincronizada con la BD sin re-fetchear
   * toda la página (más rápido y mejor UX).
   */
  const applyLocalMutation = (
    type: 'create' | 'update' | 'delete',
    payload: PriceItem | PriceItemFull | { id: string },
  ) => {
    setItems((prev) => {
      if (type === 'delete') {
        return prev.filter((it) => it.id !== (payload as { id: string }).id);
      }
      if (type === 'create') {
        // Mapear PriceItemFull → PriceItem (que sólo usa los campos visibles)
        const p = payload as PriceItemFull;
        const item: PriceItem = {
          id: p.id,
          sku: p.sku,
          system: p.system,
          category: p.category,
          brand: p.brand,
          model: p.model,
          description: p.description,
          unit: p.unit,
          unitCost: p.unitCost,
          performance: p.performance,
          deviceType: p.deviceType,
          active: p.active,
        };
        // Evitar duplicados si ya existe
        if (prev.some((it) => it.id === item.id)) {
          return prev.map((it) => (it.id === item.id ? item : it));
        }
        return [item, ...prev];
      }
      // update
      const p = payload as PriceItemFull;
      const item: PriceItem = {
        id: p.id,
        sku: p.sku,
        system: p.system,
        category: p.category,
        brand: p.brand,
        model: p.model,
        description: p.description,
        unit: p.unit,
        unitCost: p.unitCost,
        performance: p.performance,
        deviceType: p.deviceType,
        active: p.active,
      };
      return prev.map((it) => (it.id === item.id ? item : it));
    });
    // Ajustar el contador total sin re-fetchear
    setPagination((prev) => {
      if (type === 'delete') {
        return { ...prev, total: Math.max(0, prev.total - 1) };
      }
      if (type === 'create') {
        return { ...prev, total: prev.total + 1 };
      }
      return prev;
    });
  };

  const handlePriceUpdated = (updated: PriceItemFull) => {
    applyLocalMutation('update', updated);
  };

  const handlePriceCreated = (created: PriceItemFull) => {
    setCreateDialogOpen(false);
    applyLocalMutation('create', created);
    // Refrescar en background para re-sincronizar contadores y paginación
    refresh();
  };

  const handlePriceDeleted = (id: string) => {
    setDeletingPrice(null);
    applyLocalMutation('delete', { id });
    // Si la página actual queda vacía tras eliminar (y no estamos en
    // la página 1), ir a la página 1 para evitar mostrar tabla vacía.
    // En cualquier caso, refrescar para re-sincronizar con la BD.
    if (items.length <= 1 && page > 1) {
      setPage(1);
    }
    refresh();
  };

  // --- Truncate helper -----------------------------------------------------
  const truncate = (str: string, max: number) =>
    str.length > max ? str.slice(0, max) + '…' : str;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card className="w-full border border-emerald-500/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xl rounded-xl overflow-hidden transition-all">
        {/* ---- Header ------------------------------------------------------ */}
        <CardHeader className="pb-4 bg-gradient-to-r from-emerald-50/50 via-white/40 to-slate-50/30 dark:from-slate-800/40 dark:to-slate-900/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/20">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-2.5">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-900 via-teal-800 to-slate-800 dark:from-emerald-300 dark:to-white bg-clip-text text-transparent">
                  Base de Datos de Precios
                </CardTitle>
                {pagination.total > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-800"
                  >
                    {pagination.total} items
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Nuevo precio (alta individual) */}
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Nuevo Precio
              </Button>

              {/* Exportar BD — Excel / JSON */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    disabled={exporting}
                    id="export-db-btn"
                  >
                    {exporting ? (
                      <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="mr-1.5 h-4 w-4" />
                    )}
                    {exporting ? 'Exportando…' : 'Exportar BD'}
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    id="export-xlsx-item"
                    onClick={() => handleExport('xlsx')}
                    className="cursor-pointer"
                  >
                    <FileDown className="mr-2 h-4 w-4 text-emerald-600" />
                    Exportar Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    id="export-json-item"
                    onClick={() => handleExport('json')}
                    className="cursor-pointer"
                  >
                    <FileDown className="mr-2 h-4 w-4 text-emerald-600" />
                    Exportar JSON (.json)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Seed Defaults Button */}
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={handleSeedDefaults}
                disabled={seeding}
              >
                <RefreshCw
                  className={`mr-1.5 h-4 w-4 ${seeding ? 'animate-spin' : ''}`}
                />
                {seeding ? 'Cargando…' : 'Cargar Precios por Defecto'}
              </Button>

              {/* Import Dialog */}
              <Dialog
                open={importDialogOpen}
                onOpenChange={(open) => {
                  setImportDialogOpen(open);
                  if (!open) setImportErrors([]);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <Upload className="mr-1.5 h-4 w-4" />
                    Importar Excel
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-emerald-900">
                      <Upload className="h-5 w-5 text-emerald-600" />
                      Importar Precios desde Excel
                    </DialogTitle>
                  </DialogHeader>

                  <Separator className="my-2" />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <p className="text-stone-600">Sube tu archivo respetando las columnas exactas.</p>
                      <Button variant="link" size="sm" onClick={handleDownloadTemplate} className="text-emerald-600 h-auto p-0">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Descargar Plantilla
                      </Button>
                    </div>

                    <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center">
                      <Upload className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
                      <p className="mb-1 text-sm font-medium text-emerald-800">
                        {selectedFile
                          ? selectedFile.name
                          : 'Arrastra o selecciona un archivo'}
                      </p>
                      <p className="text-xs text-emerald-600/70">
                        Formatos aceptados: .xlsx, .xls, .csv, .json
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv,.json"
                        className="mt-3 w-full text-sm text-emerald-800 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-emerald-700"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setSelectedFile(file);
                          setImportErrors([]);
                        }}
                      />
                    </div>

                    {importErrors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Errores de validación</AlertTitle>
                        <AlertDescription>
                          <ul className="mt-2 text-xs list-disc pl-4 space-y-1 max-h-40 overflow-y-auto">
                            {importErrors.map((err, i) => (
                              <li key={i}>
                                <strong>Fila {err.row}:</strong> {err.errors.join(' | ')}
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImportDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={handleImport}
                        disabled={importing || !selectedFile}
                      >
                        {importing ? (
                          <>
                            <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                            Importando…
                          </>
                        ) : (
                          <>
                            <Upload className="mr-1.5 h-4 w-4" />
                            Importar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* F1 - Reporte de Importación */}
              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-emerald-900">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      Reporte de Importación
                    </DialogTitle>
                  </DialogHeader>
                  {importReport && <ImportReportPanel report={importReport} />}
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => setReportDialogOpen(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Botón para analizar duplicados */}
              <DuplicatesAnalyzer
                currency={store.currency}
                onDuplicatesResolved={refresh}
              />

              {/* Botón Limpiar Base de Datos */}
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => setClearDialog1Open(true)}
              >
                <DatabaseZap className="mr-1.5 h-4 w-4" />
                Limpiar Base de Datos
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* ---- Filters ----------------------------------------------------- */}
        <CardContent className="space-y-4 pb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <Filter className="h-4 w-4" />
            Filtros
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* System filter */}
            <Select
              value={system}
              onValueChange={(value) => {
                setSystem(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                <SelectValue placeholder="Sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos los Sistemas</SelectItem>
                {SYSTEMS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todas las Categorías</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              <Input
                placeholder="Buscar por SKU, marca, modelo, descripción…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="border-emerald-200 pl-9 focus:ring-emerald-500"
              />
            </div>
          </div>

          <Separator />

          {/* ---- Table ------------------------------------------------------ */}
          <div className="max-h-125 overflow-auto rounded-lg border border-emerald-200/60">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-emerald-50/80 hover:bg-emerald-50/80">
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 w-32">
                    SKU
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 w-24">
                    Sistema
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 w-28">
                    Categoría
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 w-28">
                    Marca
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 w-32">
                    Modelo
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 min-w-62.5">
                    Descripción
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 w-36">
                    Tipo Disp.
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 text-right w-20">
                    Unidad
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 text-right w-28">
                    Costo Unitario
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800 text-right w-20">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  // Skeleton rows
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`skel-${i}`} className="hover:bg-transparent">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-32 text-center text-emerald-600"
                    >
                      No se encontraron precios con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="transition-colors hover:bg-emerald-50/40"
                    >
                      <TableCell className="font-mono text-xs font-medium text-emerald-900">
                        {item.sku || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={SYSTEM_BADGE_VARIANT[item.system] ?? ''}
                        >
                          {item.system}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={CATEGORY_BADGE_VARIANT[item.category] ?? ''}
                        >
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm truncate">{item.brand || '—'}</TableCell>
                      <TableCell className="text-sm truncate">{item.model || '—'}</TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground min-w-62.5"
                        title={item.description}
                      >
                        <p className="wrap-break-word leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-stone-500 truncate">
                        {item.deviceType || '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm truncate">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium text-emerald-800">
                        {formatCurrency(
                          Number.isFinite(item.unitCost) ? item.unitCost : 0,
                          store.currency,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPriceId(item.id)}
                            className="h-7 w-7 p-0 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Editar precio"
                            aria-label={`Editar ${item.sku || item.description}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeletingPrice({
                                id: item.id,
                                description: item.description,
                                sku: item.sku,
                              })
                            }
                            className="h-7 w-7 p-0 text-stone-500 hover:text-red-600 hover:bg-red-50"
                            title="Eliminar precio"
                            aria-label={`Eliminar ${item.sku || item.description}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ---- Pagination footer ----------------------------------------- */}
          {!loading && items.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
              <p className="text-xs text-muted-foreground">
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, pagination.total)}–
                {Math.min(page * PAGE_SIZE, pagination.total)} de{' '}
                {pagination.total} registros
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="min-w-24 text-center text-sm text-emerald-800">
                  Página {page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Diálogos CRUD (fuera del Card para mejor layering) ──────────── */}
      <CreatePriceDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handlePriceCreated}
        currency={store.currency}
      />

      <EditPriceDialog
        priceId={editingPriceId}
        onClose={() => setEditingPriceId(null)}
        onSaved={handlePriceUpdated}
        currency={store.currency}
      />

      <DeletePriceDialog
        priceId={deletingPrice?.id ?? null}
        priceDescription={deletingPrice?.description ?? ''}
        priceSku={deletingPrice?.sku ?? ''}
        onClose={() => setDeletingPrice(null)}
        onDeleted={handlePriceDeleted}
      />

      {/* ── Diálogo de Confirmación 1: Advertencia de irreversibilidad ───── */}
      <Dialog open={clearDialog1Open} onOpenChange={setClearDialog1Open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Limpiar Base de Datos de Precios
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive" className="border-red-300 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-red-800">Esta acción es irreversible</AlertTitle>
              <AlertDescription className="text-red-700 text-sm">
                Se eliminarán <strong>todos</strong> los registros de precios almacenados en la
                base de datos. Esta operación no se puede deshacer.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-stone-600">
              Los datos de precios son independientes del sistema de estimaciones y cotizaciones.
              Después de limpiar, podrás importar una nueva base de datos utilizando el botón{' '}
              <strong>&quot;Importar Excel&quot;</strong>.
            </p>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClearDialog1Open(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setClearDialog1Open(false);
                  setClearDialog2Open(true);
                }}
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de Confirmación 2: Confirmación explícita final ────── */}
      <Dialog open={clearDialog2Open} onOpenChange={setClearDialog2Open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              ¿Estás seguro de que deseas eliminar <strong>todos</strong> los registros de
              precios? Esta acción eliminará:
            </p>
            <ul className="text-sm text-stone-600 list-disc pl-5 space-y-1">
              <li>Todos los precios cargados manualmente</li>
              <li>Todos los precios importados desde Excel</li>
              <li>El historial de cambios de precios</li>
            </ul>
            <Alert className="border-amber-300 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 text-sm">Nota</AlertTitle>
              <AlertDescription className="text-amber-700 text-xs">
                Los estimaciones y cotizaciones existentes <strong>no</strong> se verán
                afectadas, ya que sus totales se calcularon con los precios al momento de su
                creación.
              </AlertDescription>
            </Alert>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClearDialog2Open(false)}
                disabled={clearing}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearDatabase}
                disabled={clearing}
              >
                {clearing ? (
                  <>
                    <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                    Eliminando…
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Eliminar Todos los Precios
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo de Éxito ──────────────────────────────────────────────── */}
      <Dialog open={clearSuccessDialogOpen} onOpenChange={setClearSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Base de Datos Limpiada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-emerald-300 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800">Operación exitosa</AlertTitle>
              <AlertDescription className="text-emerald-700 text-sm">
                La base de datos de precios ha sido limpiada correctamente. Ahora puedes
                importar una nueva base de datos utilizando el botón{' '}
                <strong>&quot;Importar Excel&quot;</strong>.
              </AlertDescription>
            </Alert>
            <Separator />
            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => setClearSuccessDialogOpen(false)}
              >
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── F1 - Panel de Reporte de Importación ─────────────────────────────────

function ImportReportPanel({ report }: { report: ImportReport }) {
  const { total, imported, failed, errors, warnings, duplicatesInFile, unknownUnits, refErrors, durationMs } = report;
  const hasErrors = failed > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Total filas"
          value={total}
          variant="default"
          icon={ListChecks}
        />
        <MetricCard
          label="Importados"
          value={imported}
          variant="success"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Con errores"
          value={failed}
          variant={hasErrors ? 'error' : 'default'}
          icon={AlertCircle}
        />
        <MetricCard
          label="Duración"
          value={`${durationMs}ms`}
          variant="default"
          icon={Clock}
        />
      </div>

      {/* Resumen destacado */}
      {hasErrors ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Importación con errores</AlertTitle>
          <AlertDescription className="text-xs">
            Se importaron {imported} de {total} filas. {failed} filas fallaron y no se
            cargaron a la base de datos.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-emerald-300 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-700">
            Importación 100% exitosa
          </AlertTitle>
          <AlertDescription className="text-emerald-700 text-xs">
            {imported} filas importadas correctamente en {durationMs}ms.
          </AlertDescription>
        </Alert>
      )}

      {/* Alertas adicionales */}
      {(duplicatesInFile.length > 0 || unknownUnits.length > 0 || refErrors > 0) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Alertas detectadas
            </h4>
            {duplicatesInFile.length > 0 && (
              <div>
                <p className="text-xs text-amber-800 font-semibold">
                  SKUs duplicados en el archivo ({duplicatesInFile.length}):
                </p>
                <p className="text-[10px] font-mono text-amber-700 mt-1">
                  {duplicatesInFile.join(', ')}
                </p>
              </div>
            )}
            {refErrors > 0 && (
              <p className="text-xs text-amber-800">
                <span className="font-semibold">{refErrors}</span> filas con errores
                de fórmula Excel (#REF!, #NAME?, #VALUE!, etc.).
              </p>
            )}
            {unknownUnits.length > 0 && (
              <div>
                <p className="text-xs text-amber-800 font-semibold">
                  Unidades no canónicas ({unknownUnits.length}):
                </p>
                <p className="text-[10px] font-mono text-amber-700 mt-1">
                  {unknownUnits.join(', ')}
                </p>
                <p className="text-[10px] text-amber-600 mt-1 italic">
                  Se recomienda usar: ML, PZA, LOTE, SERV, ROLLO, KG, M2, M3.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Errores detallados por fila */}
      {hasErrors && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Errores por fila ({Math.min(errors.length, 50)}
              {errors.length > 50 ? ` de ${errors.length}` : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto rounded-md border border-red-200 bg-red-50/30 p-2 space-y-1.5">
              {errors.map((err, i) => (
                <div
                  key={i}
                  className="text-xs border-l-2 border-red-400 bg-white rounded-sm p-2"
                >
                  <p className="font-mono font-semibold text-red-700">
                    Fila {err.row}
                  </p>
                  <ul className="text-red-600 list-disc pl-4 mt-1 space-y-0.5">
                    {err.errors.map((e, j) => (
                      <li key={j}>{e}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advertencias */}
      {hasWarnings && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Advertencias ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto rounded-md border border-amber-200 bg-amber-50/30 p-2">
              <ul className="text-xs text-amber-800 space-y-1">
                {warnings.slice(0, 30).map((w, i) => (
                  <li key={i} className="font-mono">
                    {w}
                  </li>
                ))}
                {warnings.length > 30 && (
                  <li className="text-muted-foreground italic">
                    … y {warnings.length - 30} más
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  variant,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  variant: 'default' | 'success' | 'error';
  icon: typeof ListChecks;
}) {
  const styles = {
    default: 'border-stone-200 bg-stone-50 text-stone-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-red-200 bg-red-50 text-red-700',
  } as const;
  return (
    <div className={`rounded-lg border p-3 ${styles[variant]}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 opacity-60" />
      </div>
      <p className="text-xl font-bold font-mono mt-0.5">{value}</p>
    </div>
  );
}
