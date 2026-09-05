import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Info, SearchX, Sparkles } from "lucide-react";
import type { DestinationRecommendation } from "@/types";
import { getOrigin } from "@/data/origins";
import {
  relaxationLabels,
  searchDestinations,
} from "@/lib/recommendationEngine";
import {
  criteriaFromSearchParams,
  criteriaToSearchParams,
} from "@/lib/searchCriteria";
import { formatDateRange, pluralize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DestinationCard, DestinationCardSkeleton } from "@/components/DestinationCard";
import { FiltersPanel, MobileFilters } from "@/components/FiltersPanel";
import { SearchBar } from "@/components/SearchBar";
import { SortSelect, type SortKey } from "@/components/SortSelect";

export const metadata: Metadata = {
  title: "Résultats de recherche",
  description:
    "Destinations recommandées selon votre budget, la météo attendue, la durée de trajet et vos envies.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORT_KEYS: SortKey[] = ["score", "price", "temperature", "duration"];

function sortResults(
  results: DestinationRecommendation[],
  sort: SortKey,
): DestinationRecommendation[] {
  const copy = [...results];
  switch (sort) {
    case "price":
      return copy.sort((a, b) => a.budget.total - b.budget.total);
    case "temperature":
      return copy.sort((a, b) => b.weather.temperature - a.weather.temperature);
    case "duration":
      return copy.sort((a, b) => a.travel.duration - b.travel.duration);
    default:
      return copy.sort((a, b) => b.score - a.score);
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const criteria = criteriaFromSearchParams(params);
  const rawSort = typeof params.sort === "string" ? params.sort : "score";
  const sort: SortKey = SORT_KEYS.includes(rawSort as SortKey)
    ? (rawSort as SortKey)
    : "score";

  const outcome = searchDestinations(criteria);
  const results = sortResults(outcome.recommendations, sort);
  const origin = getOrigin(criteria.origin);
  const query = criteriaToSearchParams(criteria).toString();
  const extraParams = sort === "score" ? undefined : { sort };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      {/* ---------------------- Barre de recherche collante ---------------- */}
      <div className="sticky top-16 z-30 -mx-4 bg-[var(--background)]/85 px-4 py-4 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <SearchBar initialCriteria={criteria} variant="compact" />
      </div>

      <div className="grid gap-8 pt-4 lg:grid-cols-[300px_1fr] lg:gap-10">
        {/* ------------------------------ Filtres -------------------------- */}
        <aside className="hidden lg:block">
          <div className="sticky top-44 max-h-[calc(100dvh-13rem)] overflow-y-auto pb-8 pr-2">
            <h2 className="mb-5 text-sm font-semibold text-ink-900">Recherche avancée</h2>
            <FiltersPanel criteria={criteria} extraParams={extraParams} />
          </div>
        </aside>

        {/* ------------------------------ Résultats ------------------------ */}
        <div>
          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                  {results.length > 0
                    ? `${pluralize(results.length, "destination")} pour vous`
                    : "Aucune destination trouvée"}
                </h1>
                <p className="mt-1.5 text-sm text-ink-500">
                  Départ de {origin?.name ?? criteria.origin} ·{" "}
                  {formatDateRange(criteria.startDate, criteria.endDate)} ·{" "}
                  {pluralize(criteria.nights, "nuit")} ·{" "}
                  {pluralize(
                    criteria.travelers.adults + criteria.travelers.children,
                    "voyageur",
                  )}{" "}
                  · {criteria.maxBudget} € max
                </p>
              </div>

              <div className="flex items-center gap-2">
                <MobileFilters criteria={criteria} extraParams={extraParams} />
                <SortSelect value={sort} />
              </div>
            </div>

            {/* Critères assouplis automatiquement. */}
            {outcome.relaxed.length > 0 && results.length > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p className="leading-relaxed">
                  Aucune destination ne réunissait tous vos critères. Nous avons assoupli{" "}
                  <strong className="font-semibold">
                    {outcome.relaxed.map((filter) => relaxationLabels[filter]).join(", ")}
                  </strong>{" "}
                  pour vous proposer les options les plus proches.
                </p>
              </div>
            )}

            {outcome.excluded > 0 && outcome.relaxed.length === 0 && (
              <p className="flex items-center gap-2 text-xs text-ink-400">
                <Sparkles className="size-3.5" />
                {outcome.excluded} destination{outcome.excluded > 1 ? "s" : ""} écartée
                {outcome.excluded > 1 ? "s" : ""} : budget, température ou durée de trajet
                hors de vos critères.
              </p>
            )}
          </header>

          <Suspense fallback={<ResultsSkeleton />}>
            {results.length > 0 ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((recommendation, index) => (
                  <DestinationCard
                    key={recommendation.destination.slug}
                    recommendation={recommendation}
                    query={query}
                    priority={index < 3}
                  />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-ink-200 bg-white p-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-sand-100">
        <SearchX className="size-5 text-ink-400" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink-900">
        Aucune destination ne correspond
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        Essayez d&apos;augmenter votre budget, d&apos;allonger la durée de trajet acceptée
        ou de retirer quelques équipements obligatoires.
      </p>
      <Button variant="primary" className="mt-6" asChild>
        <Link href="/">
          <Compass />
          Relancer une recherche
        </Link>
      </Button>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <DestinationCardSkeleton key={index} />
      ))}
    </div>
  );
}
