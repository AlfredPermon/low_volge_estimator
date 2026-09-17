'use client';

/**
 * E2 - Paso de Validaciones del wizard (TASK §11, §12, §13).
 *
 * Muestra el resumen de alertas detectadas en las partidas del presupuesto
 * (si ya fue calculado). Permite continuar incluso con advertencias.
 */

import { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldCheck,
  ShieldAlert,
  ListChecks,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  validateLineItems,
  summarizeAlerts,
  type ValidationAlert,
} from '@/lib/validators';
import { useEstimateStore } from '@/store/estimate-store';

export default function ValidationPanel() {
  const result = useEstimateStore((s) => s.result);

  const alerts: ValidationAlert[] = useMemo(
    () => (result ? validateLineItems(result.lineItems) : []),
    [result]
  );
  const summary = useMemo(() => summarizeAlerts(alerts), [alerts]);

  if (!result) {
    return (
      <div className="space-y-4">
        <Alert className="border-stone-300 bg-stone-50">
          <Info className="h-4 w-4 text-stone-500" />
          <AlertTitle className="text-stone-700">Sin presupuesto calculado</AlertTitle>
          <AlertDescription className="text-stone-600 text-xs">
            Aún no se ha calculado un presupuesto. Complete los pasos anteriores y
            presione <span className="font-semibold">"Generar Paramétrico"</span> para
            poder ejecutar las validaciones.
          </AlertDescription>
        </Alert>
        <ValidationChecklist />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ValidationChecklist />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <SeverityCard
          label="Errores"
          count={summary.errors}
          variant="error"
          icon={ShieldAlert}
        />
        <SeverityCard
          label="Advertencias"
          count={summary.warnings}
          variant="warning"
          icon={AlertTriangle}
        />
        <SeverityCard
          label="Notas"
          count={summary.info}
          variant="info"
          icon={Info}
        />
        <SeverityCard
          label="Total alertas"
          count={alerts.length}
          variant="total"
          icon={ListChecks}
        />
      </div>

      {alerts.length === 0 ? (
        <Alert className="border-emerald-300 bg-emerald-50">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <AlertTitle className="text-emerald-700">
            Validación exitosa — 0 problemas detectados
          </AlertTitle>
          <AlertDescription className="text-emerald-700 text-xs">
            Todas las partidas cumplen las reglas del TASK §11 y §12. El presupuesto
            está listo para ser exportado o enviado al cliente.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-600" />
              Detalle de alertas ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
              {alerts.map((a, i) => (
                <AlertItem key={i} alert={a} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ValidationChecklist() {
  const items = [
    {
      code: 'B1',
      label: 'Códigos duplicados',
      desc: 'No se permiten dos partidas con el mismo código de negocio.',
    },
    {
      code: 'B1',
      label: 'Cantidad cero con costo',
      desc: 'Una partida con costo mayor a 0 no debe tener cantidad 0.',
    },
    {
      code: 'B1',
      label: 'Material / MO en cero',
      desc: 'Categorías Equipo y Mano de Obra deben tener importe > 0.',
    },
    {
      code: 'B3',
      label: 'Unidades normalizadas',
      desc: 'Las unidades deben estar en formato canónico (ML, PZA, LOTE, etc).',
    },
    {
      code: 'B1',
      label: 'Sin valores negativos',
      desc: 'Cantidad, P.U. e importe no deben ser negativos.',
    },
  ];
  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Reglas de validación aplicadas (TASK §11, §12)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-xs">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] font-mono">
                {it.code}
              </Badge>
              <div>
                <p className="font-semibold text-stone-700">{it.label}</p>
                <p className="text-muted-foreground">{it.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SeverityCard({
  label,
  count,
  variant,
  icon: Icon,
}: {
  label: string;
  count: number;
  variant: 'error' | 'warning' | 'info' | 'total';
  icon: typeof ShieldAlert;
}) {
  const styles: Record<typeof variant, { bg: string; text: string; border: string }> = {
    error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    info: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300' },
    total: { bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-300' },
  };
  const s = styles[variant];
  return (
    <Card className={`${s.border}`}>
      <CardContent className={`p-3 flex items-center gap-3 ${s.bg}`}>
        <Icon className={`w-5 h-5 ${s.text}`} />
        <div>
          <p className={`text-xs ${s.text} font-medium`}>{label}</p>
          <p className={`text-xl font-bold ${s.text} font-mono`}>{count}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertItem({ alert }: { alert: ValidationAlert }) {
  const styles = {
    error: {
      bg: 'border-red-300 bg-red-50',
      text: 'text-red-700',
      label: 'bg-red-100 text-red-800',
    },
    warning: {
      bg: 'border-amber-300 bg-amber-50',
      text: 'text-amber-700',
      label: 'bg-amber-100 text-amber-800',
    },
    info: {
      bg: 'border-sky-300 bg-sky-50',
      text: 'text-sky-700',
      label: 'bg-sky-100 text-sky-800',
    },
  };
  const s = styles[alert.severity];
  return (
    <div className={`rounded-md border p-2.5 ${s.bg}`}>
      <div className="flex items-start gap-2">
        <Badge variant="outline" className={`text-[10px] font-mono ${s.label}`}>
          {alert.code}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${s.text}`}>{alert.message}</p>
          {(alert.itemCode || alert.system) && (
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {alert.itemCode && `Código: ${alert.itemCode}`}
              {alert.itemCode && alert.system && ' · '}
              {alert.system && `Sistema: ${alert.system}`}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] uppercase">
          {alert.severity}
        </Badge>
      </div>
    </div>
  );
}
