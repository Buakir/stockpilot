import { describe, expect, it } from "vitest";

import { importRowSchema } from "@/lib/validators/import";

const validRow = {
  sku: "IMP-0001",
  nombre: "Sierra de cinta 1200W",
  descripcion: "Una descripción",
  categoria: "Herramientas eléctricas",
  precio: "189990",
  stock: "12",
  estado: "activo",
};

describe("importRowSchema", () => {
  it("acepta una fila válida", () => {
    const result = importRowSchema.parse(validRow);
    expect(result).toMatchObject({
      sku: "IMP-0001",
      precio: 189990,
      stock: 12,
      estado: "active",
    });
  });

  describe("precio", () => {
    /**
     * La coma define el separador decimal. Sin ella el punto es decimal, que
     * es lo que emite la exportación: si se borraran todos los puntos, un
     * "1250.5" exportado volvería como 12505.
     */
    it.each([
      ["formato local con miles y decimales", "12.990,50", 12990.5],
      ["formato local sólo con miles", "12.990", 12.99],
      ["formato estándar con decimales", "1250.5", 1250.5],
      ["entero sin separadores", "189990", 189990],
      ["cero", "0", 0],
    ])("interpreta %s", (_label, input, expected) => {
      expect(importRowSchema.parse({ ...validRow, precio: input }).precio).toBe(expected);
    });

    it.each([
      ["texto", "gratis"],
      ["vacío", ""],
      ["negativo", "-100"],
    ])("rechaza un precio %s", (_label, precio) => {
      expect(importRowSchema.safeParse({ ...validRow, precio }).success).toBe(false);
    });
  });

  describe("estado", () => {
    it.each([
      ["active", "active"],
      ["activo", "active"],
      ["ACTIVO", "active"],
      ["discontinued", "discontinued"],
      ["descontinuado", "discontinued"],
    ])("acepta %s", (input, expected) => {
      expect(importRowSchema.parse({ ...validRow, estado: input }).estado).toBe(expected);
    });

    it("rechaza un estado desconocido", () => {
      const result = importRowSchema.safeParse({ ...validRow, estado: "pendiente" });
      expect(result.success).toBe(false);
    });
  });

  describe("stock", () => {
    it("acepta un entero", () => {
      expect(importRowSchema.parse({ ...validRow, stock: "0" }).stock).toBe(0);
    });

    it.each([
      ["decimal", "1.5"],
      ["negativo", "-1"],
      ["texto", "muchos"],
      ["vacío", ""],
    ])("rechaza un stock %s", (_label, stock) => {
      expect(importRowSchema.safeParse({ ...validRow, stock }).success).toBe(false);
    });
  });

  describe("campos opcionales", () => {
    it("convierte descripción y categoría vacías en null", () => {
      const result = importRowSchema.parse({ ...validRow, descripcion: "", categoria: "" });
      expect(result.descripcion).toBeNull();
      expect(result.categoria).toBeNull();
    });
  });

  it("normaliza el SKU a mayúsculas", () => {
    expect(importRowSchema.parse({ ...validRow, sku: "imp-0001" }).sku).toBe("IMP-0001");
  });

  it("rechaza un SKU con caracteres inválidos", () => {
    expect(importRowSchema.safeParse({ ...validRow, sku: "imp 0001" }).success).toBe(false);
  });

  it("reporta todos los errores de la fila, no sólo el primero", () => {
    const result = importRowSchema.safeParse({
      ...validRow,
      sku: "x",
      precio: "-1",
      estado: "zzz",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const fields = result.error.issues.map((issue) => issue.path.join("."));
    expect(fields).toContain("sku");
    expect(fields).toContain("precio");
    expect(fields).toContain("estado");
  });
});
