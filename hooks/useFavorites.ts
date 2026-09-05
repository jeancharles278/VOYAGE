"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "voyage:favorites";

export interface FavoriteItem {
  /** Slug de destination, ou identifiant d'offre hôtelière. */
  id: string;
  type: "destination" | "hotel";
  label: string;
  /** Slug de la destination de rattachement (pour les hôtels). */
  destination?: string;
  addedAt: number;
}

/**
 * Favoris persistés côté navigateur.
 * Une migration vers Supabase (table `favorites` + auth) ne changerait
 * que l'implémentation de ce hook.
 */
export function useFavorites() {
  const { value: favorites, setValue, hydrated } = useLocalStorage<FavoriteItem[]>(
    STORAGE_KEY,
    [],
  );

  const isFavorite = useCallback(
    (id: string) => favorites.some((item) => item.id === id),
    [favorites],
  );

  const toggle = useCallback(
    (item: Omit<FavoriteItem, "addedAt">) => {
      setValue((current) =>
        current.some((entry) => entry.id === item.id)
          ? current.filter((entry) => entry.id !== item.id)
          : [...current, { ...item, addedAt: Date.now() }],
      );
    },
    [setValue],
  );

  const remove = useCallback(
    (id: string) => setValue((current) => current.filter((entry) => entry.id !== id)),
    [setValue],
  );

  const clear = useCallback(() => setValue([]), [setValue]);

  return { favorites, isFavorite, toggle, remove, clear, hydrated } as const;
}
