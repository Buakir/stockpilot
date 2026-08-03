import { redirect } from "next/navigation";

import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { can, PERMISSIONS, type Permission } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session";

import { logoutAction } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // El middleware ya bloquea a los anónimos; esta comprobación es la red de
  // seguridad y, sobre todo, la que da el usuario tipado a los hijos.
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Los permisos se resuelven en el servidor y bajan como lista: la navegación
  // es un componente de cliente y no puede leer la sesión por sí misma.
  const permissions = (Object.keys(PERMISSIONS) as Permission[]).filter((permission) =>
    can(user.role, permission),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <MainNav permissions={permissions} />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu
              name={user.name}
              email={user.email}
              role={user.role}
              onLogout={logoutAction}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
