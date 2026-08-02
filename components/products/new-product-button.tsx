"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ProductDialog } from "@/components/products/product-dialog";
import { Button } from "@/components/ui/button";
import type { CategoryWithCount } from "@/lib/types";

export function NewProductButton({ categories }: { categories: CategoryWithCount[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nuevo producto
      </Button>
      <ProductDialog open={open} onOpenChange={setOpen} categories={categories} />
    </>
  );
}
