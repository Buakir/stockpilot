"use client";

import { LoaderCircle, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { ApiErrorBody } from "@/lib/api-error";
import { formatDateTime, formatDelta, formatNumber } from "@/lib/format";
import type { ProductWithCategory, StockMovementDetailed } from "@/lib/types";
import { cn } from "@/lib/utils";
import { COMMON_REASONS } from "@/lib/validators/stock";
import type { FieldErrors } from "@/lib/validators/utils";

type Direction = "in" | "out";

export function StockDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithCategory;
}) {
  const router = useRouter();

  const [direction, setDirection] = useState<Direction>("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const [movements, setMovements] = useState<StockMovementDetailed[] | null>(null);

  // El historial se pide al abrir. `ignore` evita que una respuesta lenta de un
  // producto ya cerrado pise el estado de otro abierto después.
  useEffect(() => {
    if (!open) return;
    let ignore = false;

    void (async () => {
      try {
        const response = await fetch(`/api/products/${product.id}/stock`);
        if (!response.ok) return;
        const data = (await response.json()) as StockMovementDetailed[];
        if (!ignore) setMovements(data);
      } catch {
        // El historial es informativo: si falla, el ajuste sigue disponible.
      }
    })();

    return () => {
      ignore = true;
    };
  }, [open, product.id]);

  const parsedQuantity = Number(quantity);
  const hasValidQuantity = Number.isInteger(parsedQuantity) && parsedQuantity > 0;
  const delta = direction === "in" ? parsedQuantity : -parsedQuantity;
  const nextStock = hasValidQuantity ? product.stock + delta : product.stock;
  const wouldGoNegative = hasValidQuantity && nextStock < 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrors({});
    setIsSaving(true);

    try {
      const response = await fetch(`/api/products/${product.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason }),
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorBody;
        setErrors(body.error.details ?? {});
        toast.error(body.error.message);
        return;
      }

      toast.success(`Stock de ${product.sku} actualizado a ${formatNumber(nextStock)}.`);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {product.name} ({product.sku}) — stock actual:{" "}
            <strong className="text-foreground">{formatNumber(product.stock)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <div className="space-y-2">
              <Label>Movimiento</Label>
              {/* Se elige entrada/salida y una cantidad positiva; el signo lo
                  pone el formulario. Escribir "-5" a mano se presta a errores. */}
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={direction === "in" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDirection("in")}
                  aria-pressed={direction === "in"}
                >
                  <Plus className="size-4" />
                  Entrada
                </Button>
                <Button
                  type="button"
                  variant={direction === "out" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDirection("out")}
                  aria-pressed={direction === "out"}
                >
                  <Minus className="size-4" />
                  Salida
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="0"
                required
                aria-invalid={wouldGoNegative || Boolean(errors.delta)}
              />
            </div>
          </div>

          <p
            className={cn(
              "text-sm",
              wouldGoNegative ? "text-destructive" : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {wouldGoNegative
              ? `No se puede descontar ${formatNumber(parsedQuantity)}: sólo hay ${formatNumber(product.stock)}.`
              : `Stock resultante: ${formatNumber(nextStock)}`}
          </p>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Por qué se ajusta el stock"
              required
              aria-invalid={Boolean(errors.reason)}
            />
            {errors.reason?.[0] && <p className="text-destructive text-xs">{errors.reason[0]}</p>}
            <div className="flex flex-wrap gap-1 pt-1">
              {COMMON_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground rounded-md px-2 py-1 text-xs transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !hasValidQuantity || wouldGoNegative}>
              {isSaving && <LoaderCircle className="size-4 animate-spin" />}
              Registrar ajuste
            </Button>
          </DialogFooter>
        </form>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Historial de movimientos</h3>
          <MovementHistory movements={movements} />
        </section>
      </DialogContent>
    </Dialog>
  );
}

function MovementHistory({ movements }: { movements: StockMovementDetailed[] | null }) {
  if (movements === null) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (movements.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Este producto todavía no tiene movimientos.</p>
    );
  }

  return (
    <ul className="max-h-52 space-y-0 divide-y overflow-y-auto">
      {movements.map((movement) => (
        <li key={movement.id} className="flex items-start justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate">{movement.reason}</p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(movement.created_at)} · {movement.user_name ?? "Usuario eliminado"}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 font-medium tabular-nums",
              movement.delta > 0 ? "text-emerald-600" : "text-destructive",
            )}
          >
            {formatDelta(movement.delta)}
          </span>
        </li>
      ))}
    </ul>
  );
}
