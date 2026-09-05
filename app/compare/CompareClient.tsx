"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Compass, GitCompareArrows } from "lucide-react";
import type { SearchCriteria } from "@/types";
import { getDestinations } from "@/data/destinations";
import { evaluateDestination } from "@/lib/recommendationEngine";
import { criteriaToSearchParams } from "@/lib/searchCriteria";
import { useEffectiveCriteria } from "@/hooks/useLastSearch";
import { useCompare, MAX_COMPARE } from "@/hooks/useCompare";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ComparisonTable } from "@/components/ComparisonTable";

export function CompareClient({
  criteria: criteriaFromUrl,
  urlHasCriteria,
}: {
  criteria: SearchCriteria;
  urlHasCriteria: boolean;
}) {
  const { criteria } = useEffectiveCriteria(criteriaFromUrl, urlHasCriteria);
  const { selection, hydrated } = useCompare();

  const recommendations = useMemo(
    () =>
      getDestinations(selection).map((destination) =>
        evaluateDestination(destination, criteria),
      ),
    [selection, criteria],
  );

  const query = criteriaToSearchParams(criteria).toString();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
          Comparateur
        </h1>
        <p className="mt-1.5 text-ink-500">
          Jusqu&apos;à {MAX_COMPARE} destinations côte à côte, évaluées avec les critères
          de votre dernière recherche. La meilleure valeur de chaque ligne est mise en
          évidence.
        </p>
      </header>

      {!hydrated ? (
        <Skeleton className="h-96 w-full rounded-3xl" />
      ) : recommendations.length === 0 ? (
        <EmptyState />
      ) : (
        <ComparisonTable recommendations={recommendations} query={query} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-ink-200 bg-white p-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-sand-100">
        <GitCompareArrows className="size-5 text-ink-400" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink-900">
        Votre comparateur est vide
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        Ajoutez des destinations depuis les résultats de recherche avec l&apos;icône de
        comparaison, puis revenez ici pour les mettre côte à côte.
      </p>
      <Button variant="primary" className="mt-6" asChild>
        <Link href="/search">
          <Compass />
          Explorer les destinations
        </Link>
      </Button>
    </div>
  );
}
