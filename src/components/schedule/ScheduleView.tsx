'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CalendarDays, ListTodo, KanbanSquare, FileUp, Truck, AlertTriangle, Lock, Flag } from "lucide-react";
import { useScheduleStore } from "@/store/schedule-store";
import ScheduleSummary from "./ScheduleSummary";
import ScheduleGantt from "./ScheduleGantt";
import ScheduleKanban from "./ScheduleKanban";
import ScheduleEngineering from "./ScheduleEngineering";
import ScheduleProcurement from "./ScheduleProcurement";
import ScheduleBlockers from "./ScheduleBlockers";
import ScheduleMilestones from "./ScheduleMilestones";
import ScheduleAlertsPanel from "./ScheduleAlertsPanel";

export default function ScheduleView(props: { estimateId: string | null; activeEstimateId?: string | null; projectName?: string }) {
  const estimateId = props.estimateId;
  const activeEstimateId = props.activeEstimateId ?? estimateId;
  const projectName = props.projectName ?? '';
  const {
    schedule,
    alerts,
    loading,
    creating,
    error,
    loadByEstimateId,
    createForEstimate,
  } = useScheduleStore();

  const [tab, setTab] = useState("summary");

  useEffect(() => {
    if (!estimateId) return;
    loadByEstimateId(estimateId);
  }, [estimateId, loadByEstimateId]);

  if (!activeEstimateId) {
    return (
      <Card className="border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-stone-800 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            Cronograma de Sistemas Especiales
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-stone-600">
          <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Primero selecciona un proyecto</p>
              <p className="text-amber-700 mt-1">
                Ve a la sección <strong>&quot;Presupuestos Recientes&quot;</strong> en el panel lateral y selecciona un proyecto para ver o crear su cronograma.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-stone-800 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            Cronograma de Sistemas Especiales
            {projectName && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 ml-2">
                {projectName}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                {alerts.length} alerta{alerts.length === 1 ? "" : "s"}
              </Badge>
            )}
            {schedule === null && (
              <Button
                onClick={() => createForEstimate(activeEstimateId!)}
                disabled={creating || loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Crear cronograma
              </Button>
            )}
          </div>
        </CardHeader>
        {error ? (
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
      </Card>

      {loading ? (
        <Card className="border-stone-200 shadow-sm">
          <CardContent className="py-10 flex items-center justify-center text-stone-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Cargando cronograma...
          </CardContent>
        </Card>
      ) : schedule === null ? (
        <Card className="border-stone-200 shadow-sm">
          <CardContent className="py-10 text-center text-stone-600">
            No existe cronograma para este presupuesto. Haz clic en “Crear cronograma”.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white border border-stone-200 rounded-xl p-1 h-12">
            <TabsTrigger value="summary" className="gap-2">
              <ListTodo className="w-4 h-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Gantt
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <KanbanSquare className="w-4 h-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="blockers" className="gap-2">
              <Lock className="w-4 h-4" />
              Bloqueos
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Flag className="w-4 h-4" />
              Hitos
            </TabsTrigger>
            <TabsTrigger value="engineering" className="gap-2">
              <FileUp className="w-4 h-4" />
              Ingeniería
            </TabsTrigger>
            <TabsTrigger value="procurement" className="gap-2">
              <Truck className="w-4 h-4" />
              Suministro
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alertas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <ScheduleSummary />
          </TabsContent>
          <TabsContent value="gantt" className="mt-4">
            <ScheduleGantt />
          </TabsContent>
          <TabsContent value="kanban" className="mt-4">
            <ScheduleKanban />
          </TabsContent>
          <TabsContent value="engineering" className="mt-4">
            <ScheduleEngineering />
          </TabsContent>
          <TabsContent value="procurement" className="mt-4">
            <ScheduleProcurement />
          </TabsContent>
          <TabsContent value="blockers" className="mt-4">
            <ScheduleBlockers />
          </TabsContent>
          <TabsContent value="milestones" className="mt-4">
            <ScheduleMilestones />
          </TabsContent>
          <TabsContent value="alerts" className="mt-4">
            <ScheduleAlertsPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

