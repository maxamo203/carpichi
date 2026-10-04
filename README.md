# Trackeo de alimentos

App para registrar alimentos (con historial de precios), armar recetas recursivas y llevar el consumo diario para estimar el gasto mensual en comida. Sin backend: todo se guarda en `localStorage` y se puede exportar/importar a un archivo JSON.

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
- **Resumen**: gasto real del mes, proyección por promedio de días registrados y por receta de día tipo, detalle por alimento base, gráficos y macros.
- **Compras**: presentaciones a comprar en el mes según la receta de día tipo.
- **Datos**: export creciente (alimentos → + recetas → todo) e import que reemplaza todos los datos.

## Estructura

- `src/lib/engine.ts`: motor de cálculo puro (precios por fecha, expansión recursiva, ciclos, costos, macros, resumen, compras).
- `src/lib/store.ts`: estado (zustand + persist) con las validaciones de cada cambio.
- `src/lib/schema.ts`, `src/lib/io.ts`: formato y validación de export/import.
- `src/lib/seed.ts`: datos de ejemplo tomados del Excel original.
- `src/app/*`: páginas (Resumen, Consumo, Alimentos, Recetas, Compras, Datos).
