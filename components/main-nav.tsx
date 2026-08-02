"use client";

import { Boxes, LayoutDashboard, Package, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Productos", icon: Package },
  { href: "/categories", label: "Categorías", icon: Tags },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      <Link href="/" className="mr-4 flex items-center gap-2 font-semibold">
        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
          <Boxes className="size-4" />
        </span>
        <span className="hidden sm:inline">StockPilot</span>
      </Link>

      {NAV_ITEMS.map((item) => {
        // "/" sólo coincide exacto; el resto también con sus subrutas.
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
