import { describe, expect, it } from "vitest";

import { parseCsv, toCsv, UTF8_BOM } from "@/lib/csv";

describe("toCsv", () => {
  const columns = [
    { key: "sku", header: "sku" },
    { key: "name", header: "nombre" },
  ] as const;

  it("escribe el encabezado y separa las filas con CRLF", () => {
    const csv = toCsv([{ sku: "ABC-1", name: "Martillo" }], columns);
    expect(csv).toBe("sku,nombre\r\nABC-1,Martillo");
  });

  it("entrecomilla los valores que contienen una coma", () => {
    const csv = toCsv([{ sku: "ABC-1", name: "Martillo, mango de goma" }], columns);
    expect(csv).toBe('sku,nombre\r\nABC-1,"Martillo, mango de goma"');
  });

  it("duplica las comillas dentro de un valor", () => {
    const csv = toCsv([{ sku: "ABC-1", name: 'Llave 1/2"' }], columns);
    expect(csv).toBe('sku,nombre\r\nABC-1,"Llave 1/2"""');
  });

  it("entrecomilla los valores con salto de línea", () => {
    const csv = toCsv([{ sku: "ABC-1", name: "Línea 1\nLínea 2" }], columns);
    expect(csv).toBe('sku,nombre\r\nABC-1,"Línea 1\nLínea 2"');
  });

  it("escribe null y undefined como celda vacía", () => {
    const csv = toCsv([{ sku: null, name: undefined }], columns);
    expect(csv).toBe("sku,nombre\r\n,");
  });

  it("con cero filas deja sólo el encabezado", () => {
    expect(toCsv([], columns)).toBe("sku,nombre");
  });
});

describe("parseCsv", () => {
  it("parsea un archivo simple", () => {
    expect(parseCsv("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("acepta LF además de CRLF", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("respeta las comas dentro de un campo entrecomillado", () => {
    expect(parseCsv('a,b\r\n"uno, dos",tres')).toEqual([
      ["a", "b"],
      ["uno, dos", "tres"],
    ]);
  });

  it("interpreta las comillas dobles como una comilla literal", () => {
    expect(parseCsv('a\r\n"Llave 1/2"""')).toEqual([["a"], ['Llave 1/2"']]);
  });

  it("respeta los saltos de línea dentro de un campo entrecomillado", () => {
    expect(parseCsv('a,b\r\n"línea 1\nlínea 2",x')).toEqual([
      ["a", "b"],
      ["línea 1\nlínea 2", "x"],
    ]);
  });

  it("descarta el BOM inicial", () => {
    expect(parseCsv(`${UTF8_BOM}a,b\r\n1,2`)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("no pierde la última fila si el archivo no termina en salto de línea", () => {
    expect(parseCsv("a\r\n1\r\n2")).toEqual([["a"], ["1"], ["2"]]);
  });

  it("ignora las líneas en blanco", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("conserva las celdas vacías del medio", () => {
    expect(parseCsv("a,b,c\r\n1,,3")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });
});

describe("round-trip", () => {
  it("lo que escribe toCsv lo lee parseCsv sin pérdida", () => {
    const columns = [
      { key: "sku", header: "sku" },
      { key: "name", header: "nombre" },
      { key: "note", header: "nota" },
    ] as const;

    const rows = [
      { sku: "ABC-1", name: 'Llave 1/2", cromada', note: "con\nsalto" },
      { sku: "ABC-2", name: "Simple", note: "" },
    ];

    const parsed = parseCsv(toCsv(rows, columns));

    expect(parsed[0]).toEqual(["sku", "nombre", "nota"]);
    expect(parsed[1]).toEqual(["ABC-1", 'Llave 1/2", cromada', "con\nsalto"]);
    // La fila con nota vacía sobrevive porque las otras celdas no lo están.
    expect(parsed[2]).toEqual(["ABC-2", "Simple", ""]);
  });
});
