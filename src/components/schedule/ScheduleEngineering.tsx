'use client';

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useScheduleStore } from "@/store/schedule-store";
import { ENGINEERING_DOCUMENT_STATUSES, ENGINEERING_STATUSES } from "@/lib/schedule/schedule-types";
import { FileUp, Download, Loader2 } from "lucide-react";

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
  const { schedule, saving, uploading, updateSchedule, uploadEngineeringDocument, getEngineeringDownloadUrl } =
    useScheduleStore();
  const [file, setFile] = useState<File | null>(null);
  const [docSystem, setDocSystem] = useState("CCTV");
  const [docRevision, setDocRevision] = useState("");
  const [docStatus, setDocStatus] = useState("Cargado");
  const [docUploadedBy, setDocUploadedBy] = useState("");
  const [docNotes, setDocNotes] = useState("");

  const engineeringStatus = schedule?.engineeringStatus || "";

  const statusOptions = useMemo(() => ENGINEERING_STATUSES.map((s) => ({ value: s, label: ENGINEERING_STATUS_LABELS[s] ?? s })), []);

  if (!schedule) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-stone-700">Estatus de ingeniería</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>¿El proyecto cuenta con ingeniería?</Label>
            <Select
              value={engineeringStatus || undefined}
              onValueChange={(v) => updateSchedule(schedule.id, { engineeringStatus: v })}
            >
              <SelectTrigger>
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
              <Label>Responsable</Label>
              <Input
                defaultValue={schedule.engineeringResponsible || ""}
                onBlur={(e) => updateSchedule(schedule.id, { engineeringResponsible: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Entrega estimada</Label>
              <Input
                type="date"
                defaultValue={toInputDate(schedule.engineeringDueDate)}
                onBlur={(e) => updateSchedule(schedule.id, { engineeringDueDate: fromInputDate(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Justificación / Nota</Label>
            <Textarea
              defaultValue={schedule.engineeringJustification || ""}
              onBlur={(e) => updateSchedule(schedule.id, { engineeringJustification: e.target.value })}
            />
          </div>

          <div className="flex justify-end">
            <Badge variant="secondary" className="bg-stone-100 text-stone-700">
              {saving ? "guardando" : "listo"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <FileUp className="w-4 h-4 text-emerald-600" />
            Planos PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Sistema</Label>
              <Input value={docSystem} onChange={(e) => setDocSystem(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Revisión</Label>
              <Input value={docRevision} onChange={(e) => setDocRevision(e.target.value)} placeholder="Rev. 1" />
            </div>
            <div className="space-y-2">
              <Label>Estatus</Label>
              <Select value={docStatus} onValueChange={setDocStatus}>
                <SelectTrigger>
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
              <Label>Subido por</Label>
              <Input value={docUploadedBy} onChange={(e) => setDocUploadedBy(e.target.value)} placeholder="Ingeniería" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Archivo PDF</Label>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={docNotes} onChange={(e) => setDocNotes(e.target.value)} />
          </div>

          <div className="flex justify-end">
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
                });
              }}
              disabled={!file || uploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Subir plano
            </Button>
          </div>

          <div className="border-t border-stone-200 pt-4">
            <div className="text-sm font-semibold text-stone-700 mb-2">Documentos</div>
            {schedule.documents.length === 0 ? (
              <div className="text-sm text-stone-500">Sin documentos cargados.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.documents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-stone-800">{d.filename}</TableCell>
                      <TableCell className="text-stone-600">{d.system}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-stone-100 text-stone-700">
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={getEngineeringDownloadUrl(d.id)}
                          className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-stone-200 bg-white hover:bg-stone-50 text-sm text-stone-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

