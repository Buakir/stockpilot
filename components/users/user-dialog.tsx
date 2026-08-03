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
import type { ApiErrorBody } from "@/lib/api-error";
import { ROLE_LABELS } from "@/lib/permissions";
import { USER_ROLES, type User } from "@/lib/types";
import type { FieldErrors } from "@/lib/validators/utils";

export function UserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Usuario a editar; si falta, el diálogo crea uno nuevo. */
  user?: User;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = user !== undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrors({});
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    const payload: Record<string, unknown> = {
      email: formData.get("email"),
      name: formData.get("name"),
      role: formData.get("role"),
    };
    // Al editar, una contraseña vacía significa "dejala como está".
    if (!isEditing || password.length > 0) {
      payload.password = password;
    }

    try {
      const response = await fetch(isEditing ? `/api/users/${user.id}` : "/api/users", {
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

      toast.success(isEditing ? "Usuario actualizado." : "Usuario creado.");
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
          <DialogTitle>{isEditing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Modificá los datos de ${user.name}.`
              : "La contraseña se guarda hasheada con bcrypt."}
          </DialogDescription>
        </DialogHeader>

        <form key={user?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={user?.name ?? ""} required />
            {errors.name?.[0] && <p className="text-destructive text-xs">{errors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user?.email ?? ""}
              autoComplete="off"
              required
            />
            {errors.email?.[0] && <p className="text-destructive text-xs">{errors.email[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select name="role" defaultValue={user?.role ?? "viewer"}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role?.[0] && <p className="text-destructive text-xs">{errors.role[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Contraseña {isEditing && <span className="text-muted-foreground">(opcional)</span>}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={isEditing ? "Dejar vacío para no cambiarla" : "Mínimo 8 caracteres"}
              required={!isEditing}
            />
            {errors.password?.[0] && (
              <p className="text-destructive text-xs">{errors.password[0]}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <LoaderCircle className="size-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
