<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# Convenciones de StockPilot

Notas para quien trabaje en este repo, sea persona o agente. Lo que sigue no es
estilo: son decisiones que, si se rompen, introducen bugs reales.

## Antes de dar algo por terminado

```bash
npm run lint && npm run typecheck && npm run format:check && npm test && npm run build
```

Es exactamente lo que corre el CI, en el mismo orden. Si pasa acá, pasa allá.

## Acceso a datos

- **Todo SQL va parametrizado** (`$1`, `$2`…). Nunca interpolar un valor del cliente.
- Los **nombres de columna** no pueden ir como parámetro. Si algo tiene que ser dinámico
  —el `ORDER BY`, el `SET` de un UPDATE— se resuelve contra una **lista blanca**
  (`SORT_COLUMNS`, `UPDATABLE_COLUMNS`), y lo que se interpola es el valor del mapa, jamás
  la entrada del usuario.
- El filtro del listado y el de la exportación **comparten `buildWhereClause`**. Si se
  duplica esa lógica, el CSV que descarga el usuario deja de coincidir con la tabla que
  está viendo.
- Las escrituras que tienen que ser consistentes entre sí van en `withTransaction`. Si
  además dependen del valor actual de una fila, esa fila se bloquea con
  `SELECT ... FOR UPDATE` antes de leerla; sin eso dos peticiones simultáneas pueden
  pisarse (ver `adjustStock`).

## Autorización

- `lib/permissions.ts` es la **única** fuente de verdad sobre qué puede hacer cada rol.
- Cada API route que muta algo empieza con `requirePermission(...)`. Ocultar un botón en
  la UI es cosmético; el 403 lo da el servidor.
- El autor de una acción sale **de la sesión**, nunca del body de la petición.

## Errores

Todo lo que sale de una API route pasa por `toErrorResponse()`. Los errores crudos de
PostgreSQL no llegan al cliente: se registran en el servidor y se responde un 500 genérico.

## UI

- Los componentes de `components/ui/` vienen de shadcn y **no se editan**: se regeneran
  desde el registry. La personalización va en los componentes propios.
- Para formatear números y fechas se usa `lib/format.ts`, no `Intl`. La base ICU de Node y
  la del navegador no siempre coinciden y eso rompe la hidratación.
- Las fechas se formatean **en el servidor** y viajan como string, porque dependen de la
  zona horaria del proceso.
- El estado de un listado (filtros, orden, página) vive en la query string, no en `useState`.

## Base de datos

- El esquema sólo cambia por **una migración nueva** en `db/migrations/`. Las ya aplicadas
  no se editan: el runner las saltea por nombre.
- `npm run db:seed` es destructivo (`TRUNCATE`). Nunca contra una base con datos reales.
