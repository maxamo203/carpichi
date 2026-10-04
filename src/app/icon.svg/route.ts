import { carpichiHeadSvg } from "@/components/carpichi/art";

// Favicon en /icon.svg, generado desde el dibujo de la mascota (src/components/carpichi/art.ts).
// Es un route handler estático (y no `icon.tsx`) para que el export lo escriba con extensión .svg
// y cualquier hosting estático (GitHub Pages) lo sirva como image/svg+xml.
export const dynamic = "force-static";

export function GET() {
  return new Response(carpichiHeadSvg("chill", true), {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
