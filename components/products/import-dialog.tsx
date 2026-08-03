"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiErrorBody } from "@/lib/api-error";
import { formatNumber } from "@/lib/format";
import { IMPORT_HEADERS, type ImportReport } from "@/lib/validators/import";

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset(): void {
    setReport(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setReport(null);

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Seleccioná un archivo CSV.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/products/import", { method: "POST", body: formData });
      const body: unknown = await response.json();

      if (!response.ok) {
        setError((body as ApiErrorBody).error.message);
        return;
      }

      const result = body as ImportReport;
      setReport(result);

      if (result.imported > 0) {
        toast.success(`${formatNumber(result.imported)} producto(s) importado(s).`);
        // El listado de atrás tiene que reflejar las filas nuevas aunque el
        // diálogo siga abierto mostrando el reporte de rechazos.
        router.refresh();
      } else {
        toast.error("No se importó ninguna fila.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Carga masiva de productos</DialogTitle>
          <DialogDescription>
            El CSV debe tener estas columnas:{" "}
            <code className="font-mono text-xs">{IMPORT_HEADERS.join(", ")}</code>. Es el mismo
            formato que genera &ldquo;Exportar CSV&rdquo;, así que podés exportar, editar y volver a
            subir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Archivo CSV</Label>
            <Input id="file" ref={inputRef} type="file" accept=".csv,text/csv" required />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {report && <ImportSummary report={report} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {report ? "Cerrar" : "Cancelar"}
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isUploading ? "Importando…" : "Importar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Reporte de la importación: cuántas entraron y por qué se rechazó cada una. */
function ImportSummary({ report }: { report: ImportReport }) {
  const allImported = report.rejected.length === 0;

  return (
    <div className="space-y-3">
      <Alert variant={allImported ? "default" : "destructive"}>
        {allImported ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
        <AlertDescription>
          {formatNumber(report.imported)} de {formatNumber(report.totalRows)} fila(s) importada(s).
          {report.rejected.length > 0 && ` ${formatNumber(report.rejected.length)} rechazada(s).`}
        </AlertDescription>
      </Alert>

      {report.rejected.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-muted-foreground text-left">
                <th className="w-16 px-3 py-2 font-medium">Línea</th>
                <th className="w-32 px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.rejected.map((row) => (
                <tr key={row.line}>
                  <td className="text-muted-foreground px-3 py-2 tabular-nums">{row.line}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.sku || "—"}</td>
                  <td className="px-3 py-2">
                    <ul className="space-y-0.5">
                      {row.errors.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
