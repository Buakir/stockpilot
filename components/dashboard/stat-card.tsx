import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de métrica: etiqueta en sentence case, valor grande y una nota
 * opcional. El valor usa las cifras proporcionales de la fuente (no
 * `tabular-nums`), que a tamaño grande se ven más compactas; las tabulares se
 * reservan para columnas que tienen que alinearse verticalmente.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  /** Si se pasa, la tarjeta entera navega al listado ya filtrado. */
  href?: string;
  tone?: "default" | "warning" | "critical";
}) {
  const content = (
    <CardContent className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{label}</p>
        <Icon
          className={cn(
            "size-4 shrink-0",
            tone === "default" && "text-muted-foreground",
            tone === "warning" && "text-amber-600",
            tone === "critical" && "text-destructive",
          )}
          aria-hidden
        />
      </div>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </CardContent>
  );

  if (!href) return <Card>{content}</Card>;

  return (
    <Card className="hover:border-foreground/20 transition-colors">
      <Link href={href} className="block">
        {content}
      </Link>
    </Card>
  );
}
