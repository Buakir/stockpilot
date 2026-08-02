import { redirect } from "next/navigation";

import { MainNav } from "@/components/main-nav";
import { UserMenu } from "@/components/user-menu";
import { getSessionUser } from "@/lib/session";

import { logoutAction } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // El middleware ya bloquea a los anónimos; esta comprobación es la red de
  // seguridad y, sobre todo, la que da el usuario tipado a los hijos.
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <MainNav />
          <UserMenu name={user.name} email={user.email} role={user.role} onLogout={logoutAction} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
