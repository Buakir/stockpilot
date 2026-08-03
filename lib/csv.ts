/**
 * Serialización y parseo de CSV (RFC 4180).
 *
 * Se implementa a mano en vez de sumar una dependencia: el formato es acotado
 * y así queda explícito el manejo de los casos que suelen romper un export —
 * comas, comillas y saltos de línea dentro de un valor.
 */

/** El campo se entrecomilla sólo si lo necesita; las comillas se duplican. */
function escapeField(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

/**
 * Excel abre un CSV UTF-8 sin BOM usando la codificación local, y entonces
 * "Gasfitería" se ve como "GasfiterÃ­a". El BOM se lo dice explícitamente.
 */
export const UTF8_BOM = "﻿";

/** Arma un CSV con encabezado a partir de filas de objetos. */
export function toCsv<T extends Record<string, unknown>>(
  rows: readonly T[],
  columns: ReadonlyArray<{ key: keyof T; header: string }>,
): string {
  const header = columns.map((column) => escapeField(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeField(row[column.key])).join(","));

  // CRLF: es lo que espera Excel y lo que manda el RFC.
  return [header, ...body].join("\r\n");
}

/**
 * Parsea un CSV a filas de celdas.
 *
 * Recorre carácter a carácter porque `split(",")` rompe con cualquier campo
 * entrecomillado que contenga una coma o un salto de línea. Acepta LF y CRLF.
 */
export function parseCsv(input: string): string[][] {
  const text = input.startsWith(UTF8_BOM) ? input.slice(1) : input;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // Dos comillas seguidas dentro de un campo son una comilla literal.
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Se cierra la fila en \n, en \r suelto y en \r\n (consumiendo ambos).
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Última fila si el archivo no termina en salto de línea.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Se descartan las filas vacías que dejan los saltos de línea de más.
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}
