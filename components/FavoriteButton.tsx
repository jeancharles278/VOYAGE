"use client";

import { Heart } from "lucide-react";
import { useFavorites, type FavoriteItem } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  item: Omit<FavoriteItem, "addedAt">;
  className?: string;
  variant?: "overlay" | "inline";
}

export function FavoriteButton({ item, className, variant = "overlay" }: FavoriteButtonProps) {
  const { isFavorite, toggle, hydrated } = useFavorites();
  const active = hydrated && isFavorite(item.id);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(item);
      }}
      aria-pressed={active}
      aria-label={active ? `Retirer ${item.label} des favoris` : `Ajouter ${item.label} aux favoris`}
      title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200 active:scale-90",
        variant === "overlay"
          ? "size-9 bg-white/85 text-ink-700 shadow-soft backdrop-blur hover:bg-white"
          : "size-9 border border-ink-100 bg-white text-ink-600 hover:border-ink-200",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          active ? "fill-coral-500 text-coral-500" : "text-current",
        )}
      />
    </button>
  );
}
