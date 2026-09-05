"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * État persisté dans `localStorage`, synchronisé entre les onglets et
 * entre les composants montés sur la même page.
 *
 * Le premier rendu retourne toujours la valeur initiale afin d'éviter
 * toute divergence d'hydratation ; la valeur stockée est appliquée juste
 * après le montage.
 *
 * `lastWritten` mémorise la dernière valeur sérialisée : sans cela,
 * l'événement de synchronisation émis par une écriture déclencherait une
 * relecture, donc un nouvel objet, donc une nouvelle écriture — boucle
 * infinie.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const lastWritten = useRef<string | null>(null);
  const fallback = useRef(initialValue);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      lastWritten.current = stored;
      // Lecture volontairement post-montage : `localStorage` n'existe pas
      // côté serveur, et lire pendant le rendu provoquerait une divergence
      // d'hydratation. Un seul rendu supplémentaire, au montage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // Stockage indisponible (navigation privée, quota) : on reste en mémoire.
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(value);
    if (serialized === lastWritten.current) return;
    lastWritten.current = serialized;
    try {
      window.localStorage.setItem(key, serialized);
    } catch {
      // Ignoré : l'application reste fonctionnelle sans persistance.
    }
    window.dispatchEvent(new CustomEvent("voyage:storage", { detail: { key } }));
  }, [key, value, hydrated]);

  useEffect(() => {
    const sync = () => {
      try {
        const stored = window.localStorage.getItem(key);
        if (stored === lastWritten.current) return;
        lastWritten.current = stored;
        setValue(stored === null ? fallback.current : (JSON.parse(stored) as T));
      } catch {
        /* ignoré */
      }
    };
    const onCustom = (event: Event) => {
      if ((event as CustomEvent<{ key: string }>).detail?.key === key) sync();
    };
    window.addEventListener("storage", sync);
    window.addEventListener("voyage:storage", onCustom);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("voyage:storage", onCustom);
    };
  }, [key]);

  const update = useCallback((next: T | ((current: T) => T)) => {
    setValue((current) =>
      typeof next === "function" ? (next as (c: T) => T)(current) : next,
    );
  }, []);

  return { value, setValue: update, hydrated } as const;
}
