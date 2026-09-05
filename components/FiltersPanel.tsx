"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import type { SearchCriteria } from "@/types";
import { SearchFilters } from "@/components/SearchFilters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { countActiveFilters, defaultCriteria, searchUrl } from "@/lib/searchCriteria";

interface FiltersPanelProps {
  criteria: SearchCriteria;
  /** Paramètres à préserver (tri notamment). */
  extraParams?: Record<string, string>;
}

function buildUrl(criteria: SearchCriteria, extra?: Record<string, string>) {
  const url = searchUrl(criteria);
  if (!extra || Object.keys(extra).length === 0) return url;
  const params = new URLSearchParams(extra);
  return `${url}&${params.toString()}`;
}

/** Filtres avancés en colonne (desktop). */
export function FiltersPanel({ criteria, extraParams }: FiltersPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(next: SearchCriteria) {
    startTransition(() => router.push(buildUrl(next, extraParams), { scroll: false }));
  }

  return (
    <div className="relative">
      {pending && (
        <span className="absolute -top-1 right-0 flex items-center gap-1.5 text-xs text-ink-400">
          <Loader2 className="size-3 animate-spin" />
          Mise à jour…
        </span>
      )}
      <SearchFilters
        criteria={criteria}
        onChange={apply}
        onReset={() =>
          apply({
            ...defaultCriteria(),
            origin: criteria.origin,
            startDate: criteria.startDate,
            endDate: criteria.endDate,
            nights: criteria.nights,
            travelers: criteria.travelers,
            maxBudget: criteria.maxBudget,
          })
        }
      />
    </div>
  );
}

/** Même panneau, présenté en feuille modale sur mobile. */
export function MobileFilters({ criteria, extraParams }: FiltersPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(criteria);
  const activeCount = countActiveFilters(criteria);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(criteria);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal />
          Filtres
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recherche avancée</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <SearchFilters criteria={draft} onChange={setDraft} />
        </div>

        <div className="flex gap-2 border-t border-ink-100 p-4">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() =>
              setDraft({
                ...defaultCriteria(),
                origin: draft.origin,
                startDate: draft.startDate,
                endDate: draft.endDate,
                nights: draft.nights,
                travelers: draft.travelers,
                maxBudget: draft.maxBudget,
              })
            }
          >
            Réinitialiser
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              setOpen(false);
              router.push(buildUrl(draft, extraParams), { scroll: false });
            }}
          >
            Voir les résultats
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
