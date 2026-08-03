"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

import { ImportDialog } from "@/components/products/import-dialog";
import { Button } from "@/components/ui/button";

export function ImportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Importar CSV
      </Button>
      <ImportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
