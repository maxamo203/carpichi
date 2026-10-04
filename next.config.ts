import type { NextConfig } from "next";

// En GitHub Pages el sitio vive bajo /<repo>; el workflow lo pasa en NEXT_PUBLIC_BASE_PATH.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Sin backend: se genera un sitio estático en `out/` que se puede hostear en cualquier lado.
  output: "export",
  basePath,
  // Genera /alimentos/index.html en vez de /alimentos.html: funciona en cualquier hosting estático.
  trailingSlash: true,
};

export default nextConfig;
