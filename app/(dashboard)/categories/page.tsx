import type { Metadata } from "next";

import { CategoriesTable } from "@/components/categories/categories-table";
import { NewCategoryButton } from "@/components/categories/new-category-button";
import { can } from "@/lib/permissions";
import { listCategories } from "@/lib/queries/categories";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Categorías",
};

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await listCategories();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground text-sm">
            Clasificación del catálogo. El número de productos lleva al listado filtrado.
          </p>
        </div>
        {can(user.role, "categories:write") && <NewCategoryButton />}
      </div>

      <CategoriesTable
        categories={categories}
        canWrite={can(user.role, "categories:write")}
        canDelete={can(user.role, "categories:delete")}
      />
    </div>
  );
}
