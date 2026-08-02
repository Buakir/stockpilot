"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CategoryDialog } from "@/components/categories/category-dialog";
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
import { formatNumber } from "@/lib/format";
import type { CategoryWithCount } from "@/lib/types";

export function CategoriesTable({
  categories,
  canWrite,
  canDelete,
}: {
  categories: CategoryWithCount[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryWithCount | null>(null);
  const [deleting, setDeleting] = useState<CategoryWithCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!deleting) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/categories/${deleting.id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorBody;
        toast.error(body.error.message);
        return;
      }

      toast.success(`Se eliminó ${deleting.name}.`);
      setDeleting(null);
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Todavía no hay categorías.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Creá la primera para empezar a clasificar el catálogo.
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
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground max-w-md text-sm">
                  <span className="block truncate">{category.description ?? "—"}</span>
                </TableCell>
                <TableCell className="text-right">
                  {category.product_count > 0 ? (
                    <Link
                      href={`/products?categoryId=${category.id}`}
                      className="hover:text-foreground tabular-nums underline-offset-4 hover:underline"
                    >
                      {formatNumber(category.product_count)}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground tabular-nums">0</span>
                  )}
                </TableCell>
                <TableCell>
                  {(canWrite || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Acciones de ${category.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canWrite && (
                          <DropdownMenuItem onSelect={() => setEditing(category)}>
                            <Pencil className="size-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(category)}
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
        <CategoryDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          category={editing}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && deleting.product_count > 0 ? (
                <>
                  <strong>{deleting.name}</strong> tiene {formatNumber(deleting.product_count)}{" "}
                  producto
                  {deleting.product_count === 1 ? "" : "s"}. No se eliminan: quedan como &ldquo;sin
                  categoría&rdquo; y podés reasignarlos después.
                </>
              ) : (
                <>
                  Se eliminará <strong>{deleting?.name}</strong>. Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
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
