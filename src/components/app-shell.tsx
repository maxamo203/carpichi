"use client";

import { MoonIcon, SunIcon, UtensilsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeProvider, useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Resumen" },
  { href: "/consumo", label: "Consumo" },
  { href: "/alimentos", label: "Alimentos" },
  { href: "/recetas", label: "Recetas" },
  { href: "/compras", label: "Compras" },
  { href: "/datos", label: "Datos" },
];

/** true cuando zustand terminó de leer localStorage (siempre false en el render del servidor). */
function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useStore.persist.onFinishHydration(cb),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cambiar tema"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
          <Link href="/" className="mr-2 flex items-center gap-2 font-semibold">
            <UtensilsIcon className="size-5 text-primary" />
            <span className="hidden sm:inline">Trackeo de alimentos</span>
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-muted",
                  isActive(item.href) && "bg-muted font-medium text-foreground",
                  !isActive(item.href) && "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {hydrated ? children : <p className="text-sm text-muted-foreground">Cargando…</p>}
      </main>
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );
}
