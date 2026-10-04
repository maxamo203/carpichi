import { cn } from "@/lib/utils";
import {
  CARPICHI_SVG,
  carpichiHeadSvg,
  POSE_LABELS,
  type CarpichiExpression,
  type CarpichiPose,
} from "./art";

export type { CarpichiExpression, CarpichiPose };

// Los SVG son texto fijo definido en art.ts (no hay contenido del usuario), así que es seguro inyectarlos.

/** Carpichi de cuerpo entero. El tamaño se controla con `className` (ej. "size-24"). */
export function Carpichi({
  pose,
  className,
  label,
}: {
  pose: CarpichiPose;
  className?: string;
  /** Texto alternativo; con `null` queda decorativo. */
  label?: string | null;
}) {
  const decorative = label === null;
  return (
    <span
      className={cn("inline-block shrink-0 [&>svg]:size-full", className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : (label ?? POSE_LABELS[pose])}
      aria-hidden={decorative || undefined}
      dangerouslySetInnerHTML={{ __html: CARPICHI_SVG[pose] }}
    />
  );
}

/** Sólo la cabeza (logo, avisos). Con `badge` lleva el fondo verde del favicon. */
export function CarpichiHead({
  expression = "chill",
  badge = false,
  className,
}: {
  expression?: CarpichiExpression;
  badge?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block shrink-0 [&>svg]:size-full", className)}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: carpichiHeadSvg(expression, badge) }}
    />
  );
}
