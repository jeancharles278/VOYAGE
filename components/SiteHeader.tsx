"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, GitCompareArrows, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/hooks/useCompare";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const { favorites, hydrated: favoritesReady } = useFavorites();
  const { selection, hydrated: compareReady } = useCompare();

  const links = [
    {
      href: "/favorites",
      label: "Favoris",
      icon: Heart,
      count: favoritesReady ? favorites.length : 0,
    },
    {
      href: "/compare",
      label: "Comparer",
      icon: GitCompareArrows,
      count: compareReady ? selection.length : 0,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-ink-900 transition-opacity hover:opacity-70"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-ink-900 text-white">
            <Compass className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">VOYAGE</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon, count }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors sm:px-4",
                pathname === href
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-sand-100 hover:text-ink-900",
              )}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                    pathname === href ? "bg-white/20" : "bg-lagoon-600 text-white",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
