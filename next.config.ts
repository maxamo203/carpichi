import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin backend: se genera un sitio estático en `out/` que se puede hostear en cualquier lado.
  output: "export",
};

export default nextConfig;
