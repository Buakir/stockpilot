/**
 * Formateo de valores para la UI.
 *
 * Deliberadamente no se usa `Intl.NumberFormat` ni `Intl.DateTimeFormat`: la
 * base de datos ICU de Node y la del navegador no siempre coinciden (sobre todo
 * en el espacio que separa el símbolo de moneda), y eso produce errores de
 * hidratación cuando el mismo valor se renderiza en el servidor y en el cliente.
 * Estas funciones dan siempre el mismo string en ambos lados.
 */

/** Separa los miles con punto: 1234567 → "1.234.567". */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Formato de pesos: 12990 → "$12.990"; 1250.5 → "$1.250,50". */
export function formatCurrency(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const negative = rounded < 0;
  const absolute = Math.abs(rounded);
  const showCents = !Number.isInteger(absolute);
  const [integerPart = "0", decimalPart] = absolute.toFixed(showCents ? 2 : 0).split(".");

  const formatted = `$${groupThousands(integerPart)}${decimalPart ? `,${decimalPart}` : ""}`;
  return negative ? `-${formatted}` : formatted;
}

/**
 * Versión compacta para las tarjetas del dashboard: 1211985170 → "$1.212 M".
 * Evita que un valor de inventario de diez dígitos desborde la tarjeta.
 */
export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${formatCurrency(Math.round(value / 1_000_000))} M`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${formatCurrency(Math.round(value / 1_000))} mil`;
  }
  return formatCurrency(value);
}

/** Agrupa un entero: 1234 → "1.234". */
export function formatNumber(value: number): string {
  return groupThousands(String(Math.trunc(value)));
}

/**
 * Fecha en formato dd/mm/aaaa.
 *
 * Sólo debe llamarse desde componentes de servidor: usa la zona horaria del
 * proceso, que no tiene por qué ser la del navegador.
 */
export function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Fecha y hora, dd/mm/aaaa HH:MM.
 *
 * Se usa en el historial de movimientos, que se carga por fetch después de
 * montar: al renderizarse sólo en el cliente no hay riesgo de mismatch aunque
 * la zona horaria del navegador no sea la del servidor.
 */
export function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDate(date)} ${hours}:${minutes}`;
}

/** Delta de un movimiento, siempre con signo: 12 → "+12", -5 → "−5". */
export function formatDelta(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : `−${formatNumber(Math.abs(value))}`;
}
