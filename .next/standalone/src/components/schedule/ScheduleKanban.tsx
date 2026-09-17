'use client';

import { useMemo, useState } from "react";
import { DndContext, type DragEndEvent, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useScheduleStore, type ScheduleActivity } from "@/store/schedule-store";
import { SCHEDULE_STATUSES } from "@/lib/schedule/schedule-types";
import { KanbanSquare } from "lucide-react";

function KanbanColumn(props: { status: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: props.status });

  return (
    <div ref={setNodeRef} className="flex flex-col gap-2 min-w-65">
      <div
        className={
          isOver
            ? "flex items-center justify-between px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50"
            : "flex items-center justify-between px-3 py-2 rounded-lg border border-stone-200 bg-white"
        }
      >
        <div className="text-sm font-semibold text-stone-700">{props.status}</div>
        <Badge variant="secondary" className="bg-stone-100 text-stone-700">
          {props.count}
        </Badge>
      </div>
      <div className="flex flex-col gap-2">{props.children}</div>
    </div>
  );
}

function KanbanCard(props: { activity: ScheduleActivity }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.activity.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="border-stone-200 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-stone-800 leading-snug">{props.activity.name}</div>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>{props.activity.system}</span>
            <span>{Math.round(props.activity.progress ?? 0)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function buildColumns(activities: ScheduleActivity[]): Record<string, string[]> {
  const cols: Record<string, string[]> = {};
  for (const s of SCHEDULE_STATUSES) cols[s] = [];
  for (const a of activities) {
    const st = SCHEDULE_STATUSES.includes(a.status as any) ? a.status : "Pendiente";
    cols[st].push(a.id);
  }
  return cols;
}

function findColumnForItem(columns: Record<string, string[]>, itemId: string): string | null {
  for (const status of Object.keys(columns)) {
    if (columns[status].includes(itemId)) return status;
  }
  return null;
}

export default function ScheduleKanban() {
  const { schedule, updateActivity } = useScheduleStore();
  const activities = useMemo(() => schedule?.activities ?? [], [schedule]);

  const [columns, setColumns] = useState<Record<string, string[]>>(() => buildColumns(activities));

  const activityById = useMemo(() => {
    const map = new Map<string, ScheduleActivity>();
    for (const a of activities) map.set(a.id, a);
    return map;
  }, [activities]);

  if (!schedule) return null;

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;

    const fromStatus = findColumnForItem(columns, activeId);
    const toStatus = SCHEDULE_STATUSES.includes(overId as any) ? overId : findColumnForItem(columns, overId);
    if (!fromStatus || !toStatus) return;

    if (fromStatus === toStatus) return;

    setColumns((prev) => {
      const next: Record<string, string[]> = { ...prev };
      next[fromStatus] = prev[fromStatus].filter((id) => id !== activeId);
      next[toStatus] = [activeId, ...prev[toStatus]];
      return next;
    });

    updateActivity(activeId, { status: toStatus });
  };

  return (
    <Card className="border-stone-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <KanbanSquare className="w-4 h-4 text-emerald-600" />
          Kanban
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {SCHEDULE_STATUSES.map((status) => {
              const ids = columns[status] ?? [];
              return (
                <SortableContext key={status} items={ids} strategy={verticalListSortingStrategy}>
                  <KanbanColumn status={status} count={ids.length}>
                    {ids.map((id) => {
                      const a = activityById.get(id);
                      if (!a) return null;
                      return <KanbanCard key={id} activity={a} />;
                    })}
                  </KanbanColumn>
                </SortableContext>
              );
            })}
          </div>
        </DndContext>
      </CardContent>
    </Card>
  );
}

