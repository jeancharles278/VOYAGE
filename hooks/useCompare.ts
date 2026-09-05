"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "voyage:compare";
export const MAX_COMPARE = 4;

/** Sélection de destinations à comparer (4 maximum). */
export function useCompare() {
  const { value: selection, setValue, hydrated } = useLocalStorage<string[]>(
    STORAGE_KEY,
    [],
  );

  const isSelected = useCallback(
    (slug: string) => selection.includes(slug),
    [selection],
  );

  const toggle = useCallback(
    (slug: string) => {
      setValue((current) => {
        if (current.includes(slug)) return current.filter((s) => s !== slug);
        if (current.length >= MAX_COMPARE) return current;
        return [...current, slug];
      });
    },
    [setValue],
  );

  const remove = useCallback(
    (slug: string) => setValue((current) => current.filter((s) => s !== slug)),
    [setValue],
  );

  const clear = useCallback(() => setValue([]), [setValue]);

  const isFull = selection.length >= MAX_COMPARE;

  return { selection, isSelected, toggle, remove, clear, isFull, hydrated } as const;
}
