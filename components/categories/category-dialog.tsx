"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { ApiErrorBody } from "@/lib/api-error";
import type { CategoryWithCount } from "@/lib/types";
import type { FieldErrors } from "@/lib/validators/utils";

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categoría a editar; si falta, el diálogo crea una nueva. */
  category?: CategoryWithCount;
};

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = category !== undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrors({});
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      description: formData.get("description"),
    };

    try {
      const response = await fetch(
        isEditing ? `/api/categories/${category.id}` : "/api/categories",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorBody;
        setErrors(body.error.details ?? {});
        toast.error(body.error.message);
        return;
      }

      toast.success(isEditing ? "Categoría actualizada." : "Categoría creada.");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Modificá los datos de ${category.name}.`
              : "Las categorías agrupan los productos del catálogo."}
          </DialogDescription>
        </DialogHeader>

        <form key={category?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={category?.name ?? ""}
              placeholder="Herramientas manuales"
              required
            />
            {errors.name?.[0] && <p className="text-destructive text-xs">{errors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={category?.description ?? ""}
              rows={3}
              placeholder="Opcional"
            />
            {errors.description?.[0] && (
              <p className="text-destructive text-xs">{errors.description[0]}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <LoaderCircle className="size-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
