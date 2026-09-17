'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  AlertTriangle,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DuplicateItem {
  id: string;
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: number;
  deviceType: string;
  active: boolean;
  createdAt: string;
}

interface DuplicateGroup {
  key: string;
  field: 'sku' | 'model' | 'description';
  items: DuplicateItem[];
}

interface AnalysisSummary {
  totalGroups: number;
  totalDuplicates: number;
  fieldsAnalyzed: string[];
  totalItemsAnalyzed: number;
}

interface AnalysisResult {
  success: boolean;
  duplicates: DuplicateGroup[];
  summary: AnalysisSummary;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DuplicatesAnalyzerProps {
  currency?: string;
  onDuplicatesResolved?: () => void;
}

export default function DuplicatesAnalyzer({
  currency = 'MXN',
  onDuplicatesResolved,
}: DuplicatesAnalyzerProps) {
  // --- State ----------------------------------------------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedField, setSelectedField] = useState<'all' | 'sku' | 'model' | 'description'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- Handlers -------------------------------------------------------------

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setSelectedItems(new Set());
    try {
      const res = await fetch(`/api/prices/duplicates?field=${selectedField}&threshold=2`);
      if (!res.ok) throw new Error('Error al analizar duplicados');
      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
      
      // Expandir automáticamente los primeros grupos pequeños
      const firstGroups = data.duplicates.slice(0, 3).map(g => `${g.field}:${g.key}`);
      setExpandedGroups(new Set(firstGroups));
      
      if (data.summary.totalDuplicates === 0) {
        toast.success('No se encontraron duplicados', {
          description: `Se analizaron ${data.summary.totalItemsAnalyzed} items en la base de datos.`,
        });
      } else {
        toast.info(`Se encontraron ${data.summary.totalDuplicates} registros duplicados`, {
          description: `Organizados en ${data.summary.totalGroups} grupos.`,
        });
      }
    } catch (err) {
      toast.error('Error al analizar duplicados', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedField]);

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllInGroup = (group: DuplicateGroup, select: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      group.items.forEach((item) => {
        if (select) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
      });
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedItems);
      let successful = 0;
      let failed = 0;

      for (const id of idsToDelete) {
        try {
          const res = await fetch(`/api/prices/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            successful++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      if (failed === 0) {
        toast.success(`Se eliminaron ${successful} registros duplicados`);
      } else {
        toast.warning(`Se eliminaron ${successful} de ${successful + failed} registros`);
      }

      setSelectedItems(new Set());
      setShowDeleteConfirm(false);
      
      // Re-analizar para actualizar resultados
      await handleAnalyze();
      
      // Notificar al componente padre
      onDuplicatesResolved?.();
    } catch (err) {
      toast.error('Error al eliminar duplicados', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Render helpers -------------------------------------------------------

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'sku': return 'SKU';
      case 'model': return 'Modelo';
      case 'description': return 'Descripción';
      default: return field;
    }
  };

  const getFieldBadgeColor = (field: string) => {
    switch (field) {
      case 'sku': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'model': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'description': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
      >
        <Copy className="mr-1.5 h-4 w-4" />
        Analizar Duplicados
      </Button>

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <Copy className="h-5 w-5 text-amber-600" />
              Análisis de Registros Duplicados
            </DialogTitle>
            <DialogDescription>
              Identifica y gestiona registros duplicados en la base de datos de precios.
            </DialogDescription>
          </DialogHeader>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-700">Campo de análisis:</span>
            </div>
            <Select
              value={selectedField}
              onValueChange={(value: 'all' | 'sku' | 'model' | 'description') => setSelectedField(value)}
              disabled={isAnalyzing}
            >
              <SelectTrigger className="w-44 border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los campos</SelectItem>
                <SelectItem value="sku">Solo SKU</SelectItem>
                <SelectItem value="model">Solo Modelo</SelectItem>
                <SelectItem value="description">Solo Descripción</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Analizando…
                </>
              ) : (
                <>
                  <Search className="mr-1.5 h-4 w-4" />
                  Iniciar Análisis
                </>
              )}
            </Button>

            {analysisResult && analysisResult.summary.totalDuplicates > 0 && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedItems.size === 0 || isDeleting}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Eliminar ({selectedItems.size})
                </Button>
              </>
            )}
          </div>

          {/* Summary Stats */}
          {analysisResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Items Analizados"
                value={analysisResult.summary.totalItemsAnalyzed}
                icon={Database}
                color="blue"
              />
              <StatCard
                label="Grupos Duplicados"
                value={analysisResult.summary.totalGroups}
                icon={Copy}
                color="amber"
              />
              <StatCard
                label="Total Duplicados"
                value={analysisResult.summary.totalDuplicates}
                icon={AlertTriangle}
                color="red"
              />
              <StatCard
                label="Seleccionados"
                value={selectedItems.size}
                icon={CheckCircle2}
                color="emerald"
              />
            </div>
          )}

          {/* Results */}
          {analysisResult && analysisResult.duplicates.length > 0 ? (
            <div className="space-y-3">
              {analysisResult.duplicates.map((group, groupIndex) => {
                const groupKey = `${group.field}:${group.key}`;
                const isExpanded = expandedGroups.has(groupKey);
                const allSelected = group.items.every((item) => selectedItems.has(item.id));
                const someSelected = group.items.some((item) => selectedItems.has(item.id)) && !allSelected;

                return (
                  <Card key={groupKey} className="border-slate-200 overflow-hidden">
                    {/* Group Header */}
                    <div
                      className="flex items-center gap-3 p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleGroupExpansion(groupKey)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}

                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.dataset.state = someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked';
                        }}
                        onCheckedChange={(checked) => selectAllInGroup(group, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <Badge className={getFieldBadgeColor(group.field)}>
                        {getFieldLabel(group.field)}
                      </Badge>

                      <span className="font-medium text-sm text-slate-700 truncate max-w-md">
                        {group.key}
                      </span>

                      <Badge variant="secondary" className="ml-auto">
                        {group.items.length} duplicados
                      </Badge>
                    </div>

                    {/* Group Details */}
                    {isExpanded && (
                      <div className="border-t border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50">
                              <TableHead className="w-10"></TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Sistema</TableHead>
                              <TableHead>Marca</TableHead>
                              <TableHead>Modelo</TableHead>
                              <TableHead className="max-w-xs">Descripción</TableHead>
                              <TableHead>Costo</TableHead>
                              <TableHead>Creado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item) => (
                              <TableRow
                                key={item.id}
                                className={selectedItems.has(item.id) ? 'bg-emerald-50/50' : ''}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedItems.has(item.id)}
                                    onCheckedChange={() => toggleItemSelection(item.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-xs">{item.sku || '—'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {item.system}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{item.brand || '—'}</TableCell>
                                <TableCell className="text-sm">{item.model || '—'}</TableCell>
                                <TableCell className="max-w-xs">
                                  <p className="text-sm text-slate-600 truncate" title={item.description}>
                                    {item.description}
                                  </p>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatCurrency(item.unitCost, currency as "MXN" | "USD")}
                                </TableCell>
                                <TableCell className="text-xs text-slate-500">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : analysisResult && analysisResult.duplicates.length === 0 ? (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800">No se encontraron duplicados</AlertTitle>
              <AlertDescription className="text-emerald-700">
                Se analizaron {analysisResult.summary.totalItemsAnalyzed} items y no se detectaron duplicados por {analysisResult.summary.fieldsAnalyzed.join(', ')}.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmar Eliminación
                </DialogTitle>
                <DialogDescription>
                  Está a punto de eliminar <strong>{selectedItems.size}</strong> registros duplicados.
                  Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Recomendación:</strong> Mantenga al menos un registro de cada grupo de duplicados para preservar la integridad de los datos.
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Eliminando…
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Eliminar {selectedItems.size} items
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Copy;
  color: 'blue' | 'amber' | 'red' | 'emerald';
}) {
  const colorStyles = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  return (
    <div className={`rounded-lg border p-3 ${colorStyles[color]}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 opacity-60" />
      </div>
      <p className="text-xl font-bold font-mono mt-0.5">{value.toLocaleString()}</p>
    </div>
  );
}
