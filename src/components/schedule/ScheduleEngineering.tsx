'use client';

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useScheduleStore, EngineeringDocument } from "@/store/schedule-store";
import { ENGINEERING_DOCUMENT_STATUSES, ENGINEERING_STATUSES } from "@/lib/schedule/schedule-types";
import {
  FileUp,
  Download,
  Loader2,
  Eye,
  Trash2,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckSquare,
  AlertCircle
} from "lucide-react";

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputDate(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

const ENGINEERING_STATUS_LABELS: Record<string, string> = {
  EXISTE: "Sí, existe ingeniería",
  NO_REQUERIDO: "No requerido",
  EN_PROCESO: "En proceso",
  NO_APLICA: "No aplica (remodelación)",
};

export default function ScheduleEngineering() {
  const {
    schedule,
    saving,
    uploading,
    updateSchedule,
    uploadEngineeringDocument,
    getEngineeringDownloadUrl,
    getEngineeringPreviewUrl,
    downloadEngineeringDocument,
    downloadEngineeringDocuments,
    deleteEngineeringDocument,
    deleteEngineeringDocuments,
  } = useScheduleStore();

  // Subida de archivos
  const [file, setFile] = useState<File | null>(null);
  const [docSystem, setDocSystem] = useState("CCTV");
  const [docRevision, setDocRevision] = useState("Rev. 1");
  const [docStatus, setDocStatus] = useState("Cargado");
  const [docUploadedBy, setDocUploadedBy] = useState("Ingeniería");
  const [docNotes, setDocNotes] = useState("");

  // Selección múltiple
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [systemFilter, setSystemFilter] = useState("ALL");

  // Modal de Previsualización de PDF
  const [previewDoc, setPreviewDoc] = useState<EngineeringDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const engineeringStatus = schedule?.engineeringStatus || "";
  const documents = schedule?.documents || [];

  // Filtrado de documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.system.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSystem = systemFilter === "ALL" || doc.system === systemFilter;
      return matchesSearch && matchesSystem;
    });
  }, [documents, searchQuery, systemFilter]);

  // Lista de sistemas únicos para filtro
  const uniqueSystems = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.system) set.add(d.system);
    });
    return Array.from(set);
  }, [documents]);

  // Limpiar selecciones no existentes
  useEffect(() => {
    const validIds = new Set(documents.map((d) => d.id));
    setSelectedDocIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [documents]);

  const isAllSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((d) => selectedDocIds.includes(d.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredSet = new Set(filteredDocuments.map((d) => d.id));
      setSelectedDocIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const nextSet = new Set([...selectedDocIds, ...filteredDocuments.map((d) => d.id)]);
      setSelectedDocIds(Array.from(nextSet));
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Navegación en el visor de PDF
  const currentPreviewIndex = previewDoc
    ? filteredDocuments.findIndex((d) => d.id === previewDoc.id)
    : -1;

  const handlePrevPreview = () => {
    if (currentPreviewIndex > 0) {
      setPreviewDoc(filteredDocuments[currentPreviewIndex - 1]);
    }
  };

  const handleNextPreview = () => {
    if (currentPreviewIndex >= 0 && currentPreviewIndex < filteredDocuments.length - 1) {
      setPreviewDoc(filteredDocuments[currentPreviewIndex + 1]);
    }
  };

  const openPreview = (doc: EngineeringDocument) => {
    setPreviewDoc(doc);
    setIsPreviewOpen(true);
  };

  const statusOptions = useMemo(
    () => ENGINEERING_STATUSES.map((s) => ({ value: s, label: ENGINEERING_STATUS_LABELS[s] ?? s })),
    []
  );

  if (!schedule) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card: Estatus de Ingeniería */}
        <Card className="border-stone-200 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Estatus de Ingeniería
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              Define el estado general de la documentación técnica y responsables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-stone-700 text-xs font-medium">¿El proyecto cuenta con ingeniería?</Label>
              <Select
                value={engineeringStatus || undefined}
                onValueChange={(v) => updateSchedule(schedule.id, { engineeringStatus: v })}
              >
                <SelectTrigger className="border-stone-200 focus:ring-emerald-500">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-stone-700 text-xs font-medium">Responsable</Label>
                <Input
                  defaultValue={schedule.engineeringResponsible || ""}
                  placeholder="Ej. Ing. Carlos Mendoza"
                  onBlur={(e) => updateSchedule(schedule.id, { engineeringResponsible: e.target.value })}
                  className="border-stone-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-stone-700 text-xs font-medium">Entrega estimada</Label>
                <Input
                  type="date"
                  defaultValue={toInputDate(schedule.engineeringDueDate)}
                  onBlur={(e) => updateSchedule(schedule.id, { engineeringDueDate: fromInputDate(e.target.value) })}
                  className="border-stone-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-stone-700 text-xs font-medium">Justificación / Notas de Ingeniería</Label>
              <Textarea
                defaultValue={schedule.engineeringJustification || ""}
                placeholder="Detalles sobre especificaciones, entregables o pendientes..."
                onBlur={(e) => updateSchedule(schedule.id, { engineeringJustification: e.target.value })}
                className="border-stone-200 min-h-[80px]"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Badge variant="secondary" className="bg-stone-100 text-stone-600 text-xs font-normal">
                {saving ? "Guardando cambios..." : "Guardado automático"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card: Cargar Nuevo Plano PDF */}
        <Card className="border-stone-200 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-emerald-600" />
              Cargar Plano PDF
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              Adjunta un nuevo archivo PDF para vincularlo al proyecto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-stone-700 text-xs font-medium">Sistema</Label>
                <Input
                  value={docSystem}
                  onChange={(e) => setDocSystem(e.target.value)}
                  placeholder="CCTV, ACCESO, INCENDIO..."
                  className="border-stone-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-stone-700 text-xs font-medium">Revisión</Label>
                <Input
                  value={docRevision}
                  onChange={(e) => setDocRevision(e.target.value)}
                  placeholder="Rev. 1, Rev. A, Final..."
                  className="border-stone-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-stone-700 text-xs font-medium">Estatus</Label>
                <Select value={docStatus} onValueChange={setDocStatus}>
                  <SelectTrigger className="border-stone-200">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGINEERING_DOCUMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-stone-700 text-xs font-medium">Subido por</Label>
                <Input
                  value={docUploadedBy}
                  onChange={(e) => setDocUploadedBy(e.target.value)}
                  placeholder="Ingeniería / Consultor"
                  className="border-stone-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-stone-700 text-xs font-medium">Archivo PDF</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                className="border-stone-200 cursor-pointer text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-stone-700 text-xs font-medium">Notas adicionales</Label>
              <Input
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                placeholder="Observaciones sobre esta versión..."
                className="border-stone-200"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={() => {
                  if (!file) return;
                  uploadEngineeringDocument(schedule.id, file, {
                    system: docSystem,
                    revision: docRevision,
                    status: docStatus,
                    uploadedBy: docUploadedBy,
                    notes: docNotes,
                  }).then(() => {
                    setFile(null);
                    setDocNotes("");
                  });
                }}
                disabled={!file || uploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileUp className="w-4 h-4 mr-2" />}
                Subir plano PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Principal: Sección Planos PDF Cargados */}
      <Card className="border-stone-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-stone-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-stone-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Planos PDF Cargados
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1">
                  {documents.length} {documents.length === 1 ? "archivo" : "archivos"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-stone-500 mt-1">
                Visualiza, selecciona y descarga los planos PDF técnicos del proyecto.
              </CardDescription>
            </div>

            {/* Búsqueda y Filtros */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-stone-400" />
                <Input
                  placeholder="Buscar plano o sistema..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 border-stone-200"
                />
              </div>

              {uniqueSystems.length > 0 && (
                <Select value={systemFilter} onValueChange={setSystemFilter}>
                  <SelectTrigger className="w-36 h-9 text-xs border-stone-200">
                    <SelectValue placeholder="Sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los sistemas</SelectItem>
                    {uniqueSystems.map((sys) => (
                      <SelectItem key={sys} value={sys}>
                        {sys}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Barra de Acciones Masivas cuando hay elementos seleccionados */}
          {selectedDocIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-900 transition-all animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-medium">
                <CheckSquare className="w-4 h-4 text-emerald-700" />
                <span>{selectedDocIds.length} {selectedDocIds.length === 1 ? "plano seleccionado" : "planos seleccionados"}</span>
              </div>

              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const firstSelected = documents.find((d) => selectedDocIds.includes(d.id));
                    if (firstSelected) openPreview(firstSelected);
                  }}
                  className="bg-white hover:bg-stone-50 border-emerald-300 text-emerald-800 text-xs h-8"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Visualizar seleccionados
                </Button>

                <Button
                  size="sm"
                  onClick={() => downloadEngineeringDocuments(selectedDocIds)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Descargar {selectedDocIds.length === 1 ? "plano PDF" : `(${selectedDocIds.length}) archivos PDF`}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Estás seguro de eliminar los ${selectedDocIds.length} planos seleccionados?`)) {
                      deleteEngineeringDocuments(selectedDocIds).then(() => setSelectedDocIds([]));
                    }
                  }}
                  className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 text-xs h-8"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Eliminar
                </Button>
              </div>
            </div>
          )}

          {/* Tabla de Documentos PDF */}
          {filteredDocuments.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-stone-200 rounded-lg bg-stone-50/50">
              <AlertCircle className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-700">No se encontraron planos PDF</p>
              <p className="text-xs text-stone-500 mt-1">
                {searchQuery || systemFilter !== "ALL"
                  ? "Prueba cambiando los filtros de búsqueda."
                  : "Usa el formulario superior para subir el primer plano PDF."}
              </p>
            </div>
          ) : (
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-stone-50">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-stone-700">Archivo PDF</TableHead>
                    <TableHead className="font-semibold text-stone-700">Sistema</TableHead>
                    <TableHead className="font-semibold text-stone-700">Revisión</TableHead>
                    <TableHead className="font-semibold text-stone-700">Estatus</TableHead>
                    <TableHead className="font-semibold text-stone-700">Subido por</TableHead>
                    <TableHead className="text-right font-semibold text-stone-700">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <TableRow
                        key={doc.id}
                        className={isSelected ? "bg-emerald-50/50" : "hover:bg-stone-50/80"}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectDoc(doc.id)}
                            aria-label={`Seleccionar ${doc.filename}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-rose-600" />
                            </div>
                            <div>
                              <button
                                onClick={() => openPreview(doc)}
                                className="text-stone-800 hover:text-emerald-600 font-semibold text-xs text-left transition-colors flex items-center gap-1 group"
                              >
                                <span className="group-hover:underline">{doc.filename}</span>
                                <Eye className="w-3 h-3 text-stone-400 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                              {doc.notes && (
                                <p className="text-[11px] text-stone-500 truncate max-w-xs">{doc.notes}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-stone-200 bg-stone-50 text-stone-700 text-[11px]">
                            {doc.system || "General"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-stone-600 font-mono">
                          {doc.revision || "Rev. 1"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              doc.status === "Aprobado"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : doc.status === "En Revisión"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : doc.status === "Rechazado"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-stone-100 text-stone-700 border border-stone-200"
                            }
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-stone-600">
                          {doc.uploadedBy || "Sistema"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Visualizar Plano */}
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Visualizar PDF"
                              onClick={() => openPreview(doc)}
                              className="h-8 w-8 p-0 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Descargar Plano PDF */}
                            <Button
                              size="sm"
                              variant="outline"
                              title="Descargar archivo PDF"
                              onClick={() => downloadEngineeringDocument(doc.id, doc.filename)}
                              className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-600 hover:text-white text-xs px-2.5 gap-1.5 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Descargar PDF</span>
                            </Button>

                            {/* Eliminar Plano */}
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Eliminar plano"
                              onClick={() => {
                                if (confirm(`¿Eliminar el plano "${doc.filename}"?`)) {
                                  deleteEngineeringDocument(doc.id);
                                }
                              }}
                              className="h-8 w-8 p-0 text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal / Visor Interactivo de Archivos PDF */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-stone-900 border-stone-800 text-white shadow-2xl">
          {previewDoc && (
            <>
              {/* Header del Visor */}
              <DialogHeader className="p-4 bg-stone-950 border-b border-stone-800 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3 pr-8">
                  <div className="w-9 h-9 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                      {previewDoc.filename}
                      <Badge variant="outline" className="border-stone-700 text-stone-300 text-[10px] bg-stone-900">
                        {previewDoc.system || "General"}
                      </Badge>
                      <Badge variant="secondary" className="bg-emerald-900/60 text-emerald-300 text-[10px] border border-emerald-700">
                        {previewDoc.revision}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-stone-400 mt-0.5">
                      Subido por: {previewDoc.uploadedBy || "Ingeniería"} • Estatus: {previewDoc.status}
                    </DialogDescription>
                  </div>
                </div>

                {/* Acciones en la barra del visor */}
                <div className="flex items-center gap-2 mr-6">
                  {/* Selector / Navegación si hay múltiples documentos */}
                  {filteredDocuments.length > 1 && (
                    <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-md p-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={currentPreviewIndex <= 0}
                        onClick={handlePrevPreview}
                        className="h-7 w-7 p-0 text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30"
                        title="Plano anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-[11px] text-stone-400 font-mono px-1">
                        {currentPreviewIndex + 1}/{filteredDocuments.length}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={currentPreviewIndex >= filteredDocuments.length - 1}
                        onClick={handleNextPreview}
                        className="h-7 w-7 p-0 text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30"
                        title="Siguiente plano"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Abrir en pestaña nueva */}
                  <a
                    href={getEngineeringPreviewUrl(previewDoc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-stone-700 bg-stone-900 hover:bg-stone-800 text-xs text-stone-300 transition-colors"
                    title="Abrir PDF en pestaña nueva"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Nueva pestaña
                  </a>

                  {/* Botón Descargar PDF */}
                  <Button
                    size="sm"
                    onClick={() => downloadEngineeringDocument(previewDoc.id, previewDoc.filename)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Descargar PDF
                  </Button>
                </div>
              </DialogHeader>

              {/* Visor Iframe PDF */}
              <div className="flex-1 bg-stone-950 p-2 relative overflow-hidden flex items-center justify-center">
                <iframe
                  src={getEngineeringPreviewUrl(previewDoc.id)}
                  className="w-full h-full rounded border border-stone-800 bg-white"
                  title={previewDoc.filename}
                />
              </div>

              {/* Footer con Notas si existen */}
              {previewDoc.notes && (
                <DialogFooter className="p-3 bg-stone-950 border-t border-stone-800 text-xs text-stone-400 flex items-center justify-start">
                  <span className="font-semibold text-stone-300 mr-1">Notas:</span> {previewDoc.notes}
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
