"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { useActionState, useRef } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

import { loginAction, type LoginState } from "./actions";

const INITIAL_STATE: LoginState = {};

/**
 * Cuentas de demostración. Existen sólo porque el seed las crea con datos
 * ficticios; sirven para que cualquiera pruebe los tres niveles de permiso.
 */
const DEMO_ACCOUNTS: ReadonlyArray<{ role: UserRole; email: string }> = [
  { role: "admin", email: "admin@stockpilot.dev" },
  { role: "manager", email: "manager@stockpilot.dev" },
  { role: "viewer", email: "viewer@stockpilot.dev" },
];

const DEMO_PASSWORD = "demo1234";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  function fillDemoAccount(email: string): void {
    const form = formRef.current;
    if (!form) return;
    const emailInput = form.elements.namedItem("email");
    const passwordInput = form.elements.namedItem("password");
    if (emailInput instanceof HTMLInputElement) emailInput.value = email;
    if (passwordInput instanceof HTMLInputElement) passwordInput.value = DEMO_PASSWORD;
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        {state.error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@stockpilot.dev"
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
          />
          {state.fieldErrors?.email && (
            <p className="text-destructive text-sm">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
          />
          {state.fieldErrors?.password && (
            <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <LoaderCircle className="size-4 animate-spin" />}
          {isPending ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      <div className="border-border/60 space-y-2 rounded-lg border border-dashed p-3">
        <p className="text-muted-foreground text-xs">
          Cuentas de demo (contraseña <code className="font-mono">{DEMO_PASSWORD}</code>):
        </p>
        <div className="flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.role}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoAccount(account.email)}
            >
              {ROLE_LABELS[account.role]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
