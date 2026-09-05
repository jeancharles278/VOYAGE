"use client";

import { useEffect } from "react";
import type { SearchCriteria } from "@/types";
import { criteriaFromSearchParams } from "@/lib/searchCriteria";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "voyage:last-search";

/**
 * Mémorise la dernière recherche effectuée (query string).
 *
 * Les pages Favoris et Comparateur s'en servent pour recalculer les scores
 * avec les critères réellement utilisés par le voyageur, plutôt qu'avec les
 * valeurs par défaut.
 */
export function useLastSearch() {
  const { value, setValue, hydrated } = useLocalStorage<string>(STORAGE_KEY, "");
  return { query: value, setQuery: setValue, hydrated } as const;
}

/**
 * Renvoie les critères passés dans l'URL si elle en contient, sinon ceux de
 * la dernière recherche mémorisée.
 */
export function useEffectiveCriteria(
  fromUrl: SearchCriteria,
  urlHasCriteria: boolean,
): { criteria: SearchCriteria; hydrated: boolean } {
  const { query, hydrated } = useLastSearch();
  if (urlHasCriteria || !hydrated || !query) {
    return { criteria: fromUrl, hydrated };
  }
  return { criteria: criteriaFromSearchParams(new URLSearchParams(query)), hydrated };
}

/** Enregistre la recherche courante. Monté (sans rendu) par la page /search. */
export function SearchMemory({ query }: { query: string }) {
  const { setQuery } = useLastSearch();

  useEffect(() => {
    if (query) setQuery(query);
  }, [query, setQuery]);

  return null;
}
