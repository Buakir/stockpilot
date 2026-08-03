import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewUserButton } from "@/components/users/new-user-button";
import { UsersTable } from "@/components/users/users-table";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { listUsers } from "@/lib/queries/users";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Usuarios",
};

export default async function UsersPage() {
  const user = await requireUser();

  // Un manager o viewer que escriba /users a mano recibe un 404, no la página
  // vacía: no tiene por qué enterarse de que la sección existe.
  if (!can(user.role, "users:manage")) notFound();

  const users = await listUsers();

  // La fecha se formatea en el servidor y viaja como string: `formatDate` usa
  // la zona horaria del proceso y en el cliente daría otro valor.
  const rows = users.map((row) => ({ ...row, created_at_label: formatDate(row.created_at) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground text-sm">
            Cuentas con acceso al panel. Sólo un administrador puede gestionarlas.
          </p>
        </div>
        <NewUserButton />
      </div>

      <UsersTable users={rows} currentUserId={user.id} />
    </div>
  );
}
