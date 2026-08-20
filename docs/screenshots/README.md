# Capturas

Imágenes que usa el README principal. Si cambia la UI, conviene regenerarlas para que lo
que se ve en el repo siga coincidiendo con lo que hace la app.

| Archivo          | Qué muestra                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `dashboard.png`  | Vista principal: tarjetas de métricas, gráfico por categoría, reposición |
| `productos.png`  | Listado con buscador, filtros y columnas ordenables                     |
| `stock.png`      | Diálogo de ajuste de stock con el historial de movimientos              |

## Cómo regenerarlas

1. `npm run db:reset` para partir de los datos de ejemplo de siempre.
2. `npm run dev` y entrar como `admin@stockpilot.dev` / `demo1234`.
3. **Tema oscuro** (el botón de luna en la barra superior) y ventana ancha. Capturar solo
   el área de contenido, sin la barra del navegador ni el escritorio.
4. Guardar como PNG con los nombres de la tabla, en esta carpeta.

Las tres imágenes usan el mismo tema a propósito: mezclarlos hace que el README parezca
armado con capturas de momentos distintos.
