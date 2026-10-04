# Carpichi

Carpichi (carpincho + *capisci?*) es una app para registrar alimentos (con historial de precios), armar recetas recursivas y llevar el consumo diario para estimar el gasto mensual en comida. Sin backend: todo se guarda en `localStorage` y se puede exportar/importar a un archivo JSON.

## Uso

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # tests del motor de cálculo (Vitest)
npm run build    # sitio estático en out/
```

## Conceptos

- **Alimentos**: unidad base (`g`, `ml`, `unidad`) e historial de precios con fecha de vigencia. Un consumo usa el precio vigente a su fecha; no se puede registrar consumo antes del primer precio.
- **Recetas**: ingredientes que pueden ser alimentos u otras recetas (en porciones), sin dependencias cíclicas. Un día completo también es una receta (ej. "Día entreno").
- **Consumo**: las recetas registradas quedan vinculadas (editar la receta cambia esos días). "Desvincular" la reemplaza por sus ingredientes directos; "Copiar desde otro día" crea copias independientes.
- **Resumen**: gasto real del mes, estimado del mes completo (los días sin cargar repiten en ciclo los días registrados, con el precio vigente en cada fecha), proyección por receta de día tipo, detalle por alimento base (registrado o mes completo), gráficos y macros.
- **Compras**: presentaciones a comprar para el mes completo según el estimado (lo registrado + los días que faltan).
- **Datos**: export creciente (alimentos → + recetas → todo), import que reemplaza todos los datos y carga de datos de ejemplo desde `public/datos-ejemplo.json` (es un export "todo": se puede reemplazar por cualquier otro).

## Estructura

- `src/lib/engine.ts`: motor de cálculo puro (precios por fecha, expansión recursiva, ciclos, costos, macros, resumen, compras).
- `src/lib/store.ts`: estado (zustand + persist) con las validaciones de cada cambio.
- `src/lib/schema.ts`, `src/lib/io.ts`: formato y validación de export/import.
- `src/components/carpichi/art.ts`: el dibujo de la mascota (todas las poses, la cabeza y el favicon) en un solo lugar. `carpichi.tsx` lo muestra en React y `src/app/icon.svg/route.ts` lo publica como favicon.
- `src/lib/test-fixtures.ts`: datos fijos para los tests del motor.
- `src/app/*`: páginas (Resumen, Consumo, Alimentos, Recetas, Compras, Datos).

## Deploy en GitHub Pages

El workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) corre los tests, hace el build estático y lo publica en cada push a `main`.

1. Subí el repo a GitHub.
2. En **Settings → Pages → Build and deployment**, elegí **Source: GitHub Actions**.
3. Hacé push a `main` (o corré el workflow a mano desde la pestaña **Actions**).

El sitio queda en `https://<usuario>.github.io/<repo>/`. El workflow le pasa el subpath del repo al build (`NEXT_PUBLIC_BASE_PATH`); en local no hace falta definirlo.

Los datos viven en el `localStorage` de cada navegador y de cada dominio: lo que cargues en `localhost` no aparece en GitHub Pages. Para pasarlos, usá **Datos → Descargar todo** e importá el archivo en el sitio publicado.
