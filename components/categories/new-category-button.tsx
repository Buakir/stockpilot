"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { CategoryDialog } from "@/components/categories/category-dialog";
import { Button } from "@/components/ui/button";

export function NewCategoryButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nueva categoría
      </Button>
      <CategoryDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
