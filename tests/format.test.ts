import { describe, expect, it } from "vitest";

import { formatCompactCurrency, formatCurrency, formatDelta, formatNumber } from "@/lib/format";

describe("formatCurrency", () => {
  it.each([
    [0, "$0"],
    [990, "$990"],
    [12990, "$12.990"],
    [1234567, "$1.234.567"],
  ])("formatea %i como %s", (input, expected) => {
    expect(formatCurrency(input)).toBe(expected);
  });

  it("muestra los decimales sólo cuando existen", () => {
    expect(formatCurrency(1250.5)).toBe("$1.250,50");
    expect(formatCurrency(1250)).toBe("$1.250");
  });

  it("redondea a dos decimales", () => {
    expect(formatCurrency(10.999)).toBe("$11");
    expect(formatCurrency(10.994)).toBe("$10,99");
  });

  it("pone el signo antes del símbolo", () => {
    expect(formatCurrency(-12990)).toBe("-$12.990");
  });

  /**
   * El formateo es determinista a propósito: no usa Intl, cuya salida puede
   * diferir entre la base ICU de Node y la del navegador y romper la
   * hidratación. Este test fija el contrato.
   */
  it("no depende de la locale del entorno", () => {
    expect(formatCurrency(1234.5)).toBe("$1.234,50");
  });
});

describe("formatCompactCurrency", () => {
  it.each([
    [1_211_985_170, "$1.212 M"],
    [45_000_000, "$45 M"],
    [850_000, "$850 mil"],
    [12_500, "$13 mil"],
    [990, "$990"],
  ])("compacta %i como %s", (input, expected) => {
    expect(formatCompactCurrency(input)).toBe(expected);
  });
});

describe("formatNumber", () => {
  it.each([
    [0, "0"],
    [140, "140"],
    [1234, "1.234"],
    [1234567, "1.234.567"],
  ])("agrupa %i como %s", (input, expected) => {
    expect(formatNumber(input)).toBe(expected);
  });
});

describe("formatDelta", () => {
  it("siempre muestra el signo", () => {
    expect(formatDelta(12)).toBe("+12");
    expect(formatDelta(-5)).toBe("−5");
    expect(formatDelta(1500)).toBe("+1.500");
  });
});
