'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  Upload,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

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

import { toast } from 'sonner';

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYSTEMS = [
  'CCTV',
  'ACCESO',
  'VOCEO',
  'INCENDIO',
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

const currencyFmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PricesView() {
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

  // --- Dialog state --------------------------------------------------------
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- Fetch prices --------------------------------------------------------
  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (system !== 'Todos') params.set('system', system);
      if (category !== 'Todos') params.set('category', category);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/prices?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar precios');
      const json: PricesResponse = await res.json();
      setItems(json.data);
      setPagination(json.pagination);
    } catch (err) {
      toast.error('Error al cargar los precios', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setLoading(false);
    }
  }, [system, category, search, page]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [system, category, search]);

  // --- Handlers ------------------------------------------------------------
  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo antes de importar');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/prices/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al importar archivo');
      }

      const result = await res.json();
      toast.success(`Importación exitosa`, {
        description: `Se importaron ${result.imported} de ${result.total} registros.`,
      });

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImportDialogOpen(false);
      fetchPrices();
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
      fetchPrices();
    } catch (err) {
      toast.error('Error al cargar por defecto', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setSeeding(false);
    }
  };

  // --- Truncate helper -----------------------------------------------------
  const truncate = (str: string, max: number) =>
    str.length > max ? str.slice(0, max) + '…' : str;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <Card className="w-full border border-emerald-200/60">
      {/* ---- Header ------------------------------------------------------ */}
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Database className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-xl font-semibold text-emerald-900">
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
              onOpenChange={setImportDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Upload className="mr-1.5 h-4 w-4" />
                  Importar Excel
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-emerald-900">
                    <Upload className="h-5 w-5 text-emerald-600" />
                    Importar Precios desde Excel
                  </DialogTitle>
                </DialogHeader>

                <Separator className="my-2" />

                <div className="space-y-4">
                  <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center">
                    <Upload className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
                    <p className="mb-1 text-sm font-medium text-emerald-800">
                      {selectedFile
                        ? selectedFile.name
                        : 'Arrastra o selecciona un archivo'}
                    </p>
                    <p className="text-xs text-emerald-600/70">
                      Formatos aceptados: .xlsx, .xls, .csv
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="mt-3 w-full text-sm text-emerald-800 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-emerald-700"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setSelectedFile(file);
                      }}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
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
          <Select value={system} onValueChange={setSystem}>
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
          <Select value={category} onValueChange={setCategory}>
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
        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-emerald-200/60">
          <Table>
            <TableHeader>
              <TableRow className="bg-emerald-50/80 hover:bg-emerald-50/80">
                <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800">
                  SKU
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800">
                  Sistema
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800">
                  Categoría
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800">
                  Marca
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800">
                  Modelo
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-emerald-50 text-emerald-800">
                  Descripción
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-emerald-50 text-right text-emerald-800">
                  Unidad
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-emerald-50 text-right text-emerald-800">
                  Costo Unitario
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-emerald-50 text-right text-emerald-800">
                  Rendimiento
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                // Skeleton rows
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`skel-${i}`} className="hover:bg-transparent">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
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
                      {item.sku}
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
                    <TableCell className="text-sm">{item.brand}</TableCell>
                    <TableCell className="text-sm">{item.model}</TableCell>
                    <TableCell
                      className="max-w-[200px] text-sm text-muted-foreground"
                      title={item.description}
                    >
                      {truncate(item.description, 50)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {item.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium text-emerald-800">
                      {currencyFmt.format(item.unitCost)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {item.performance > 0 ? item.performance : '—'}
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
              <span className="min-w-[6rem] text-center text-sm text-emerald-800">
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
  );
}