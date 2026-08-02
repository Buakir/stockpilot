"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency, formatNumber } from "@/lib/format";
import type { CategoryBreakdown } from "@/lib/queries/dashboard";

/**
 * Productos por categoría.
 *
 * El trabajo del lector es comparar magnitudes, no distinguir identidades: hay
 * una sola serie, así que el color es un único hue (no una paleta categórica) y
 * no lleva leyenda — el título ya dice qué se está midiendo. Las barras van
 * horizontales porque los nombres de categoría son largos y en vertical habría
 * que rotarlos.
 *
 * Cada barra lleva su valor en la punta, así que el eje de valores y la rejilla
 * serían tinta repetida: se omiten. Etiquetas directas antes que rejilla.
 */
const AXIS_WIDTH = 176;
const TICK_FONT_SIZE = 12;
/** A 12px, un carácter promedio ocupa ~6.2px; se deja aire para el tick. */
const MAX_TICK_CHARS = Math.floor((AXIS_WIDTH - 12) / 6.2);

/**
 * Etiqueta de categoría en una sola línea.
 *
 * El tick por defecto de Recharts parte el texto en el espacio cuando no entra
 * ("Herramientas eléctricas" → dos líneas) y, con barras de 20px, la segunda
 * línea se pisa con la fila vecina. Acá se fuerza una sola línea y, si el nombre
 * es más largo que el eje, se corta con elipsis; el nombre completo sigue
 * disponible en el tooltip.
 */
function CategoryTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const label = payload?.value ?? "";
  const truncated =
    label.length > MAX_TICK_CHARS ? `${label.slice(0, MAX_TICK_CHARS - 1).trimEnd()}…` : label;

  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill="var(--muted-foreground)"
      fontSize={TICK_FONT_SIZE}
    >
      {truncated}
    </text>
  );
}

export function CategoryChart({ data }: { data: CategoryBreakdown[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        Todavía no hay productos para graficar.
      </p>
    );
  }

  // Recharts dibuja el eje de categorías de abajo hacia arriba: ordenando
  // ascendente, la categoría más grande queda arriba.
  const chartData = [...data].sort((a, b) => a.product_count - b.product_count);

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 38)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="category_name"
          width={AXIS_WIDTH}
          tickLine={false}
          axisLine={false}
          tick={<CategoryTick />}
        />

        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={<CategoryTooltip />} />

        <Bar
          dataKey="product_count"
          fill="var(--chart-accent)"
          barSize={20}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          {/* El color de la serie lo lleva la barra; el texto usa token de ink. */}
          <LabelList
            dataKey="product_count"
            position="right"
            offset={8}
            fill="var(--muted-foreground)"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: CategoryBreakdown }>;
};

function CategoryTooltip({ active, payload }: TooltipProps) {
  const entry = payload?.[0]?.payload;
  if (!active || !entry) return null;

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{entry.category_name}</p>
      <dl className="text-muted-foreground mt-1 space-y-0.5 text-xs">
        <div className="flex justify-between gap-6">
          <dt>Productos</dt>
          <dd className="text-foreground tabular-nums">{formatNumber(entry.product_count)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt>Valor de inventario</dt>
          <dd className="text-foreground tabular-nums">{formatCurrency(entry.inventory_value)}</dd>
        </div>
      </dl>
    </div>
  );
}
