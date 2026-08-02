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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ApiErrorBody } from "@/lib/api-error";
import type { CategoryWithCount, ProductWithCategory } from "@/lib/types";
import type { FieldErrors } from "@/lib/validators/utils";

/** Valor del `<Select>` de categoría para "sin categoría" (no puede ser ""). */
const NO_CATEGORY = "__none__";

type ProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryWithCount[];
  /** Producto a editar; si falta, el diálogo crea uno nuevo. */
  product?: ProductWithCategory;
};

export function ProductDialog({ open, onOpenChange, categories, product }: ProductDialogProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = product !== undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrors({});
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const categoryId = String(formData.get("category_id") ?? NO_CATEGORY);

    const payload = {
      sku: formData.get("sku"),
      name: formData.get("name"),
      description: formData.get("description"),
      category_id: categoryId === NO_CATEGORY ? null : Number(categoryId),
      price: formData.get("price"),
      stock: formData.get("stock"),
      status: formData.get("status"),
    };

    try {
      const response = await fetch(isEditing ? `/api/products/${product.id}` : "/api/products", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorBody;
        setErrors(body.error.details ?? {});
        toast.error(body.error.message);
        return;
      }

      toast.success(isEditing ? "Producto actualizado." : "Producto creado.");
      onOpenChange(false);
      // Vuelve a ejecutar el Server Component del listado con los filtros
      // actuales, en vez de mantener una copia del estado en el cliente.
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
          <DialogTitle>{isEditing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Modificá los datos de ${product.sku}.`
              : "Completá los datos del producto para agregarlo al catálogo."}
          </DialogDescription>
        </DialogHeader>

        {/* `key` fuerza a React a rehacer el form al cambiar de producto,
            para que los defaultValue se refresquen. */}
        <form key={product?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU" name="sku" errors={errors}>
              <Input
                id="sku"
                name="sku"
                defaultValue={product?.sku ?? ""}
                placeholder="HER-0001"
                required
              />
            </Field>

            <Field label="Estado" name="status" errors={errors}>
              <Select name="status" defaultValue={product?.status ?? "active"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="discontinued">Descontinuado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Nombre" name="name" errors={errors}>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name ?? ""}
              placeholder="Taladro percutor 750W"
              required
            />
          </Field>

          <Field label="Descripción" name="description" errors={errors}>
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
              rows={3}
              placeholder="Opcional"
            />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Categoría" name="category_id" errors={errors}>
              <Select
                name="category_id"
                defaultValue={product?.category_id ? String(product.category_id) : NO_CATEGORY}
              >
                <SelectTrigger id="category_id" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Precio" name="price" errors={errors}>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product?.price ?? ""}
                required
              />
            </Field>

            <Field label="Stock" name="stock" errors={errors}>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.stock ?? 0}
                required
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <LoaderCircle className="size-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Label + control + mensaje de error del campo, si el backend devolvió uno. */
function Field({
  label,
  name,
  errors,
  children,
}: {
  label: string;
  name: string;
  errors: FieldErrors;
  children: React.ReactNode;
}) {
  const message = errors[name]?.[0];

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {message && <p className="text-destructive text-xs">{message}</p>}
    </div>
  );
}
