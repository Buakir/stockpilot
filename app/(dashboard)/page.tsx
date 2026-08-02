import { AlertTriangle, Boxes, PackageX, Wallet } from "lucide-react";
import Link from "next/link";

import { CategoryChart } from "@/components/dashboard/category-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatNumber } from "@/lib/format";
import {
  getCategoryBreakdown,
  getDashboardStats,
  getLowStockProducts,
} from "@/lib/queries/dashboard";
import { requireUser } from "@/lib/session";
import { LOW_STOCK_THRESHOLD } from "@/lib/validators/product";

export default async function DashboardPage() {
  const user = await requireUser();

  const [stats, breakdown, lowStock] = await Promise.all([
    getDashboardStats(),
    getCategoryBreakdown(),
    getLowStockProducts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground text-sm">
          Estado actual del inventario en {formatNumber(stats.total_categories)} categorías.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Productos"
          value={formatNumber(stats.total_products)}
          hint={`${formatNumber(stats.active_products)} activos`}
          icon={Boxes}
          href="/products"
        />
        <StatCard
          label="Valor de inventario"
          value={formatCompactCurrency(stats.inventory_value)}
          hint="Precio × stock, sobre todo el catálogo"
          icon={Wallet}
        />
        <StatCard
          label="Sin stock"
          value={formatNumber(stats.out_of_stock)}
          hint="Productos agotados"
          icon={PackageX}
          tone="critical"
        />
        <StatCard
          label="Stock bajo"
          value={formatNumber(stats.low_stock)}
          hint={`Menos de ${LOW_STOCK_THRESHOLD} unidades`}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Productos por categoría</CardTitle>
            <CardDescription>
              Pasá el cursor por una barra para ver su valor de inventario. Los mismos números, en
              tabla, están en{" "}
              <Link href="/categories" className="underline underline-offset-4">
                Categorías
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryChart data={breakdown} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Necesitan reposición</CardTitle>
            <CardDescription>
              Productos activos con menos de {LOW_STOCK_THRESHOLD} unidades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Ningún producto activo está por debajo del umbral.
              </p>
            ) : (
              <ul className="divide-y">
                {lowStock.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-muted-foreground font-mono text-xs">{product.sku}</p>
                    </div>
                    {product.stock === 0 ? (
                      <Badge variant="destructive">Sin stock</Badge>
                    ) : (
                      <Badge variant="secondary" className="tabular-nums">
                        {formatNumber(product.stock)}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
