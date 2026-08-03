"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  MoreHorizontal,
  Pencil,
  PackagePlus,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ProductDialog } from "@/components/products/product-dialog";
import { StockDialog } from "@/components/products/stock-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiErrorBody } from "@/lib/api-error";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { CategoryWithCount, ProductWithCategory } from "@/lib/types";
import { LOW_STOCK_THRESHOLD, type ProductSortField } from "@/lib/validators/product";
import { cn } from "@/lib/utils";

const COLUMNS: ReadonlyArray<{ field: ProductSortField; label: string; numeric?: boolean }> = [
  { field: "sku", label: "SKU" },
  { field: "name", label: "Producto" },
  { field: "price", label: "Precio", numeric: true },
  { field: "stock", label: "Stock", numeric: true },
];

export function ProductsTable({
  products,
  categories,
  canWrite,
  canDelete,
  canAdjustStock,
}: {
  products: ProductWithCategory[];
  categories: CategoryWithCount[];
  canWrite: boolean;
  canDelete: boolean;
  canAdjustStock: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [editing, setEditing] = useState<ProductWithCategory | null>(null);
  const [adjusting, setAdjusting] = useState<ProductWithCategory | null>(null);
  const [deleting, setDeleting] = useState<ProductWithCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeSort = searchParams.get("sort");
  const activeOrder = searchParams.get("order") === "asc" ? "asc" : "desc";

  /** Alterna el orden de una columna: primera vez asc, segunda desc. */
  function toggleSort(field: ProductSortField): void {
    const params = new URLSearchParams(searchParams.toString());
    const nextOrder = activeSort === field && activeOrder === "asc" ? "desc" : "asc";
    params.set("sort", field);
    params.set("order", nextOrder);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/products/${deleting.id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorBody;
        toast.error(body.error.message);
        return;
      }

      toast.success(`Se eliminó ${deleting.sku}.`);
      setDeleting(null);
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">No hay productos que coincidan con los filtros.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Probá con otro término de búsqueda o limpiá los filtros.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column.field} className={cn(column.numeric && "text-right")}>
                  <button
                    type="button"
                    onClick={() => toggleSort(column.field)}
                    className={cn(
                      "hover:text-foreground inline-flex items-center gap-1 transition-colors",
                      column.numeric && "flex-row-reverse",
                      activeSort === column.field && "text-foreground font-medium",
                    )}
                  >
                    {column.label}
                    <SortIcon active={activeSort === column.field} order={activeOrder} />
                  </button>
                </TableHead>
              ))}
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                <TableCell className="max-w-xs">
                  <span className="block truncate font-medium">{product.name}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(product.price)}
                </TableCell>
                <TableCell className="text-right">
                  <StockCell stock={product.stock} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {product.category_name ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={product.status === "active" ? "secondary" : "outline"}>
                    {product.status === "active" ? "Activo" : "Descontinuado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(canWrite || canDelete || canAdjustStock) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Acciones de ${product.sku}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canAdjustStock && (
                          <DropdownMenuItem onSelect={() => setAdjusting(product)}>
                            <PackagePlus className="size-4" />
                            Ajustar stock
                          </DropdownMenuItem>
                        )}
                        {canWrite && (
                          <DropdownMenuItem onSelect={() => setEditing(product)}>
                            <Pencil className="size-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(product)}
                          >
                            <Trash2 className="size-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <ProductDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          categories={categories}
          product={editing}
        />
      )}

      {adjusting && (
        <StockDialog
          open
          onOpenChange={(open) => !open && setAdjusting(null)}
          product={adjusting}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleting?.name}</strong> ({deleting?.sku}) y todo su historial
              de movimientos de stock. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Se evita el cierre automático para poder mostrar el estado
                // "eliminando" y mantener el diálogo abierto si falla.
                event.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SortIcon({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="size-3 opacity-40" />;
  return order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
}

/** Resalta el stock agotado o bajo para que se detecte de un vistazo. */
function StockCell({ stock }: { stock: number }) {
  if (stock === 0) {
    return <span className="text-destructive font-medium tabular-nums">Sin stock</span>;
  }
  return (
    <span
      className={cn("tabular-nums", stock < LOW_STOCK_THRESHOLD && "font-medium text-amber-600")}
    >
      {formatNumber(stock)}
    </span>
  );
}
