"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeletePriceDialogProps {
  /** ID del precio a eliminar. */
  priceId: string | null;
  /** Descripción del precio a eliminar (para mostrar al usuario). */
  priceDescription: string;
  /** SKU del precio a eliminar (opcional, sólo para mostrar). */
  priceSku: string;
  /** Callback al cerrar el diálogo. */
  onClose: () => void;
  /** Callback cuando se elimina con éxito. */
  onDeleted: (id: string) => void;
}

export default function DeletePriceDialog({
  priceId,
  priceDescription,
  priceSku,
  onClose,
  onDeleted,
}: DeletePriceDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!priceId || deleting) return;
    setDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/prices/${priceId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al eliminar");
      }
      toast.success("Precio eliminado", {
        description: priceSku
          ? `${priceSku} – ${priceDescription}`
          : priceDescription,
      });
      onDeleted(priceId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setErrorMsg(msg);
      toast.error("Error al eliminar", { description: msg });
    } finally {
      setDeleting(false);
    }
  };

  const open = priceId !== null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !deleting) {
          setErrorMsg(null);
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            ¿Eliminar precio?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Estás a punto de eliminar el siguiente precio de la base de
                datos. Esta acción <strong>no se puede deshacer</strong>.
              </p>
              <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-xs">
                {priceSku && (
                  <p className="font-mono font-semibold text-stone-800">
                    {priceSku}
                  </p>
                )}
                <p className="text-stone-600 mt-1">{priceDescription}</p>
              </div>
              {errorMsg && (
                <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {errorMsg}
                </p>
              )}
              <p className="text-stone-500 text-xs italic">
                Nota: si este precio ya está siendo usado en presupuestos
                calculados, sólo se eliminará del catálogo (no de los
                presupuestos existentes).
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Eliminando…
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Eliminar
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
