"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Minus,
  Search,
  Star,
  Waves,
  X,
} from "lucide-react";
import type { HotelOffer, SearchCriteria } from "@/types";
import { bestRate, mealPlanLabels } from "@/lib/providers/hotelProvider";
import { cn, formatDistance, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Photo } from "@/components/Photo";

const AGENCIES = ["Booking", "Expedia", "Agoda", "Prix direct"] as const;

interface HotelComparisonProps {
  hotels: HotelOffer[];
  criteria: SearchCriteria;
  destinationSlug: string;
}

type SortKey = "price" | "rating" | "distance";

/**
 * Comparateur de prix multi-agences.
 * Les tarifs sont simulés : `bestRate()` met en avant l'agence la moins
 * chère pour chaque établissement.
 */
export function HotelComparison({ hotels, criteria, destinationSlug }: HotelComparisonProps) {
  const [sort, setSort] = useState<SortKey>("price");
  const [visible, setVisible] = useState(5);

  const sorted = useMemo(() => {
    const copy = [...hotels];
    copy.sort((a, b) => {
      if (sort === "price") return bestRate(a).price - bestRate(b).price;
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return (a.distanceToBeach ?? 99999) - (b.distanceToBeach ?? 99999);
    });
    return copy;
  }, [hotels, sort]);

  if (hotels.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-ink-200 bg-white p-10 text-center">
        <Search className="mx-auto size-6 text-ink-300" />
        <p className="mt-3 text-sm font-medium text-ink-700">
          Aucun hébergement ne correspond à vos filtres
        </p>
        <p className="mt-1 text-sm text-ink-400">
          Essayez d&apos;assouplir le classement minimum ou les équipements demandés.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {hotels.length} établissement{hotels.length > 1 ? "s" : ""} pour {criteria.nights}{" "}
          nuit{criteria.nights > 1 ? "s" : ""}, {criteria.travelers.adults + criteria.travelers.children}{" "}
          voyageur{criteria.travelers.adults + criteria.travelers.children > 1 ? "s" : ""}
        </p>
        <div className="flex gap-1.5">
          {(
            [
              ["price", "Prix"],
              ["rating", "Note"],
              ["distance", "Plage"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                sort === key
                  ? "bg-ink-900 text-white"
                  : "bg-sand-100 text-ink-600 hover:bg-sand-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* --------------------------- Vue mobile --------------------------- */}
      <div className="grid gap-3 lg:hidden">
        {sorted.slice(0, visible).map((hotel) => (
          <HotelMobileCard key={hotel.id} hotel={hotel} destinationSlug={destinationSlug} />
        ))}
      </div>

      {/* -------------------------- Vue desktop --------------------------- */}
      <div className="hidden overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-sand-50 text-left">
                <Th className="w-[26%]">Hôtel</Th>
                <Th>Note</Th>
                <Th>Localisation</Th>
                <Th className="text-center">Piscine</Th>
                <Th className="text-center">Petit-déj.</Th>
                <Th className="text-center">Annulation</Th>
                {AGENCIES.map((agency) => (
                  <Th key={agency} className="text-right">
                    {agency}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, visible).map((hotel) => {
                const best = bestRate(hotel);
                return (
                  <tr
                    key={hotel.id}
                    className="border-b border-ink-100 transition-colors last:border-b-0 hover:bg-sand-50/60"
                  >
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <Photo
                          src={hotel.image}
                          alt={hotel.name}
                          sizes="72px"
                          className="size-14 shrink-0 rounded-xl"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{hotel.name}</p>
                          <p className="flex items-center gap-0.5 text-xs text-amber-500">
                            {Array.from({ length: hotel.stars }).map((_, index) => (
                              <Star key={index} className="size-3 fill-current" />
                            ))}
                            <span className="ml-1 text-ink-400">
                              {mealPlanLabels[hotel.mealPlan]}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-ink-900 px-2 py-1 text-xs font-semibold text-white">
                        {hotel.rating?.toFixed(1)}
                      </span>
                      <span className="ml-1.5 text-xs text-ink-400">
                        {hotel.reviewCount} avis
                      </span>
                    </td>
                    <td className="p-4 text-ink-600">
                      <p className="text-xs">Centre : {formatDistance(hotel.distanceToCenter)}</p>
                      <p className="flex items-center gap-1 text-xs">
                        <Waves className="size-3 text-lagoon-500" />
                        {hotel.distanceToBeach === null
                          ? "Pas de plage"
                          : formatDistance(hotel.distanceToBeach)}
                      </p>
                    </td>
                    <BoolCell value={hotel.amenities.includes("pool")} />
                    <BoolCell value={hotel.amenities.includes("breakfast")} />
                    <BoolCell value={hotel.freeCancellation} />
                    {AGENCIES.map((agency) => {
                      const rate = hotel.rates.find((r) => r.agency === agency);
                      const isBest = rate?.price === best.price;
                      return (
                        <td key={agency} className="p-4 text-right">
                          {rate ? (
                            <span
                              className={cn(
                                "inline-flex flex-col items-end rounded-xl px-2 py-1.5",
                                isBest && "bg-emerald-50",
                              )}
                            >
                              <span
                                className={cn(
                                  "font-semibold tabular-nums",
                                  isBest ? "text-emerald-700" : "text-ink-700",
                                )}
                              >
                                {formatPrice(rate.price)}
                              </span>
                              {isBest && (
                                <span className="flex items-center gap-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-emerald-600">
                                  <BadgeCheck className="size-3" />
                                  Meilleur prix
                                </span>
                              )}
                            </span>
                          ) : (
                            <Minus className="ml-auto size-4 text-ink-200" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {visible < sorted.length && (
        <Button
          variant="outline"
          className="mx-auto"
          onClick={() => setVisible((current) => current + 5)}
        >
          Afficher {Math.min(5, sorted.length - visible)} hébergements de plus
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

function BoolCell({ value }: { value: boolean }) {
  return (
    <td className="p-4 text-center">
      {value ? (
        <Check className="mx-auto size-4 text-emerald-600" strokeWidth={2.5} />
      ) : (
        <X className="mx-auto size-4 text-ink-200" />
      )}
    </td>
  );
}

function HotelMobileCard({
  hotel,
  destinationSlug,
}: {
  hotel: HotelOffer;
  destinationSlug: string;
}) {
  const best = bestRate(hotel);
  return (
    <article className="overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft">
      <div className="flex gap-3 p-3">
        <Photo
          src={hotel.image}
          alt={hotel.name}
          sizes="120px"
          className="size-24 shrink-0 rounded-2xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-ink-900">{hotel.name}</p>
              <p className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: hotel.stars }).map((_, index) => (
                  <Star key={index} className="size-3 fill-current" />
                ))}
              </p>
            </div>
            <FavoriteButton
              variant="inline"
              className="size-8 shrink-0"
              item={{
                id: hotel.id,
                type: "hotel",
                label: hotel.name,
                destination: destinationSlug,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-400">
            {mealPlanLabels[hotel.mealPlan]}
            {hotel.distanceToBeach !== null &&
              ` · plage à ${formatDistance(hotel.distanceToBeach)}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {hotel.amenities.includes("pool") && <Badge variant="lagoon">Piscine</Badge>}
            {hotel.freeCancellation && <Badge variant="success">Annulation gratuite</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px border-t border-ink-100 bg-ink-100">
        {AGENCIES.map((agency) => {
          const rate = hotel.rates.find((r) => r.agency === agency);
          const isBest = rate?.price === best.price;
          return (
            <div
              key={agency}
              className={cn(
                "flex flex-col items-center gap-0.5 px-1 py-2.5",
                isBest ? "bg-emerald-50" : "bg-white",
              )}
            >
              <span className="text-[10px] uppercase tracking-wide text-ink-400">
                {agency}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isBest ? "text-emerald-700" : "text-ink-700",
                )}
              >
                {rate ? formatPrice(rate.price) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
