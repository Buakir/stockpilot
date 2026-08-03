import type { Metadata } from "next";
import { Suspense } from "react";

import { PaginationControls } from "@/components/pagination-controls";
import { ExportButton } from "@/components/products/export-button";
import { ImportButton } from "@/components/products/import-button";
import { NewProductButton } from "@/components/products/new-product-button";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductsTable } from "@/components/products/products-table";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/permissions";
import { listCategories } from "@/lib/queries/categories";
import { listProducts } from "@/lib/queries/products";
import { requireUser } from "@/lib/session";
import { parseProductQuery } from "@/lib/validators/product";

export const metadata: Metadata = {
  title: "Productos",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const filters = parseProductQuery(await searchParams);

  const [{ items, total, page, pageSize, totalPages }, categories] = await Promise.all([
    listProducts(filters),
    listCategories(),
  ]);

  const canWrite = can(user.role, "products:write");
  const canDelete = can(user.role, "products:delete");
  const canAdjustStock = can(user.role, "stock:adjust");
  const canImport = can(user.role, "products:import");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="text-muted-foreground text-sm">
            Catálogo completo del inventario. Buscá, filtrá y ordená el listado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={<Skeleton className="h-9 w-32" />}>
            <ExportButton />
          </Suspense>
          {canImport && <ImportButton />}
          {canWrite && <NewProductButton categories={categories} />}
        </div>
      </div>

      {/* Los filtros leen useSearchParams, que exige un límite de Suspense. */}
      <Suspense fallback={<Skeleton className="h-9 w-full" />}>
        <ProductFilters categories={categories} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProductsTable
          products={items}
          categories={categories}
          canWrite={canWrite}
          canDelete={canDelete}
          canAdjustStock={canAdjustStock}
        />
      </Suspense>

      <Suspense fallback={null}>
        <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </Suspense>
    </div>
  );
}
