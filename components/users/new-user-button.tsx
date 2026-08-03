"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { UserDialog } from "@/components/users/user-dialog";

export function NewUserButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nuevo usuario
      </Button>
      <UserDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
