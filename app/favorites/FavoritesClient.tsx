"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Compass, Heart, Hotel, Trash2 } from "lucide-react";
import type { SearchCriteria } from "@/types";
import { getDestination } from "@/data/destinations";
import { evaluateDestination } from "@/lib/recommendationEngine";
import { criteriaToSearchParams } from "@/lib/searchCriteria";
import { useEffectiveCriteria } from "@/hooks/useLastSearch";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DestinationCard } from "@/components/DestinationCard";

export function FavoritesClient({
  criteria: criteriaFromUrl,
  urlHasCriteria,
}: {
  criteria: SearchCriteria;
  urlHasCriteria: boolean;
}) {
  const { criteria } = useEffectiveCriteria(criteriaFromUrl, urlHasCriteria);
  const { favorites, remove, clear, hydrated } = useFavorites();

  const destinationFavorites = useMemo(
    () =>
      favorites
        .filter((item) => item.type === "destination")
        .map((item) => getDestination(item.id))
        .filter((destination) => destination !== undefined)
        .map((destination) => evaluateDestination(destination, criteria)),
    [favorites, criteria],
  );

  const hotelFavorites = favorites.filter((item) => item.type === "hotel");
  const query = criteriaToSearchParams(criteria).toString();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
            Mes favoris
          </h1>
          <p className="mt-1.5 text-ink-500">
            Enregistrés sur cet appareil. Les scores sont recalculés avec les critères
            de votre dernière recherche.
          </p>
        </div>
        {hydrated && favorites.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <Trash2 />
            Tout supprimer
          </Button>
        )}
      </header>

      {!hydrated ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-96 w-full rounded-3xl" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-10">
          {destinationFavorites.length > 0 && (
            <section>
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.08em] text-ink-400">
                Destinations ({destinationFavorites.length})
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {destinationFavorites.map((recommendation) => (
                  <DestinationCard
                    key={recommendation.destination.slug}
                    recommendation={recommendation}
                    query={query}
                  />
                ))}
              </div>
            </section>
          )}

          {hotelFavorites.length > 0 && (
            <section>
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.08em] text-ink-400">
                Hébergements ({hotelFavorites.length})
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {hotelFavorites.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-ink-100/70 bg-white p-4 shadow-soft"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-ink-500">
                        <Hotel className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink-900">
                          {item.label}
                        </span>
                        {item.destination && (
                          <Link
                            href={`/destination/${item.destination}${query ? `?${query}` : ""}`}
                            className="text-xs text-lagoon-700 hover:underline"
                          >
                            Voir la destination
                          </Link>
                        )}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(item.id)}
                      aria-label={`Retirer ${item.label}`}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-ink-200 bg-white p-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-sand-100">
        <Heart className="size-5 text-ink-400" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink-900">
        Aucun favori pour l&apos;instant
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        Touchez le cœur sur une destination ou un hôtel pour le retrouver ici.
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
