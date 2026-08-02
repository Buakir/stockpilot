"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

/** El tema nunca cambia por fuera de React: no hay nada a lo que suscribirse. */
const subscribe = () => () => {};

/**
 * `false` durante el render del servidor y el de hidratación, `true` después.
 *
 * Es la alternativa al clásico flag `mounted` en un `useEffect`, que dispara un
 * render en cascada (y que la regla `react-hooks/set-state-in-effect` marca
 * como error).
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isHydrated = useIsHydrated();

  // Hasta hidratar no se sabe qué tema resolvió el sistema. Se reserva el mismo
  // espacio para no provocar un salto de layout en la barra.
  if (!isHydrated) return <div className="size-9" aria-hidden />;

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
