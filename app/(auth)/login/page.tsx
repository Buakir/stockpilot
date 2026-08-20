import { Boxes } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingresar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl">
            <Boxes className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">StockPilot</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Accede al panel de inventario.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={callbackUrl ?? "/"} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
