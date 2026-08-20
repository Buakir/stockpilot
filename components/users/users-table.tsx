"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
import { UserDialog } from "@/components/users/user-dialog";
import type { ApiErrorBody } from "@/lib/api-error";
import { ROLE_LABELS } from "@/lib/permissions";
import type { User, UserRole } from "@/lib/types";

const ROLE_BADGE: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  viewer: "outline",
};

export function UsersTable({
  users,
  currentUserId,
}: {
  users: Array<User & { created_at_label: string }>;
  /** Id del admin en sesión: su fila no ofrece eliminar. */
  currentUserId: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!deleting) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/users/${deleting.id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorBody;
        toast.error(body.error.message);
        return;
      }

      toast.success(`Se eliminó la cuenta de ${deleting.name}.`);
      setDeleting(null);
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name}
                    {isSelf && <span className="text-muted-foreground ml-2 text-xs">(tú)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {user.created_at_label}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Acciones de ${user.name}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(user)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        {/* La propia cuenta no se puede borrar; la API también
                            lo rechaza, esto sólo evita ofrecer la acción. */}
                        {!isSelf && (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(user)}
                          >
                            <Trash2 className="size-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <UserDialog open onOpenChange={(open) => !open && setEditing(null)} user={editing} />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la cuenta de <strong>{deleting?.name}</strong> ({deleting?.email}). Sus
              movimientos de stock quedan en el historial, pero sin nombre asociado.
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
