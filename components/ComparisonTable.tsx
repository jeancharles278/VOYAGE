"use client";

import Link from "next/link";
import { ArrowRight, Star, Trash2, X } from "lucide-react";
import type { DestinationRecommendation } from "@/types";
import { conditionLabels } from "@/lib/climate";
import { useCompare } from "@/hooks/useCompare";
import {
  cn,
  formatDuration,
  formatPrice,
  formatTemperature,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Photo } from "@/components/Photo";
import { TravelScore, scoreTone } from "@/components/TravelScore";
import { WeatherIcon } from "@/components/WeatherIcon";

interface ComparisonTableProps {
  recommendations: DestinationRecommendation[];
  query: string;
}

type RowId =
  | "price"
  | "perPerson"
  | "weather"
  | "temperature"
  | "duration"
  | "accommodation"
  | "activities"
  | "score";

const ROWS: Array<{ id: RowId; label: string; hint?: string }> = [
  { id: "price", label: "Prix total", hint: "Transport + hébergement + sur place" },
  { id: "perPerson", label: "Prix par personne" },
  { id: "weather", label: "Météo attendue" },
  { id: "temperature", label: "Température" },
  { id: "duration", label: "Durée du trajet" },
  { id: "accommodation", label: "Qualité des hébergements", hint: "Score sur 100" },
  { id: "activities", label: "Activités", hint: "Score sur 100" },
  { id: "score", label: "Score global" },
];

/** Détermine la meilleure valeur d'une ligne (mise en évidence). */
function bestIndex(recommendations: DestinationRecommendation[], row: RowId): number {
  const values = recommendations.map((r) => {
    switch (row) {
      case "price":
        return -r.budget.total;
      case "perPerson":
        return -r.budget.perPerson;
      case "weather":
        return r.breakdown.weather;
      case "temperature":
        return r.weather.temperature;
      case "duration":
        return -r.travel.duration;
      case "accommodation":
        return r.destination.scores.accommodation;
      case "activities":
        return r.breakdown.activities;
      default:
        return r.score;
    }
  });
  return values.indexOf(Math.max(...values));
}

export function ComparisonTable({ recommendations, query }: ComparisonTableProps) {
  const { remove, clear } = useCompare();

  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={clear}>
          <Trash2 />
          Vider le comparateur
        </Button>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-ink-100/70 bg-white shadow-soft">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-44 border-b border-ink-100 p-4 text-left align-bottom">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                  Destination
                </span>
              </th>
              {recommendations.map((recommendation) => (
                <th
                  key={recommendation.destination.slug}
                  className="border-b border-l border-ink-100 p-4 align-bottom"
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => remove(recommendation.destination.slug)}
                      aria-label={`Retirer ${recommendation.destination.name}`}
                      className="absolute -right-1 -top-1 z-10 flex size-7 items-center justify-center rounded-full bg-white/90 text-ink-500 shadow-soft transition-colors hover:bg-white hover:text-ink-900"
                    >
                      <X className="size-3.5" />
                    </button>
                    <Photo
                      src={recommendation.destination.image}
                      alt={recommendation.destination.name}
                      sizes="200px"
                      className="aspect-[16/10] w-full rounded-2xl"
                    />
                    <p className="mt-2.5 text-left text-[15px] font-semibold text-ink-900">
                      {recommendation.destination.name}
                    </p>
                    <p className="text-left text-xs font-normal text-ink-400">
                      {recommendation.destination.country}
                    </p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {ROWS.map((row) => {
              const best = bestIndex(recommendations, row.id);
              return (
                <tr key={row.id} className="border-b border-ink-100 last:border-b-0">
                  <th className="p-4 text-left align-middle font-normal">
                    <span className="block text-[13px] font-medium text-ink-700">
                      {row.label}
                    </span>
                    {row.hint && (
                      <span className="block text-[11px] text-ink-300">{row.hint}</span>
                    )}
                  </th>
                  {recommendations.map((recommendation, index) => (
                    <td
                      key={recommendation.destination.slug}
                      className={cn(
                        "border-l border-ink-100 p-4 text-center align-middle",
                        index === best && "bg-emerald-50/70",
                      )}
                    >
                      <Cell row={row.id} recommendation={recommendation} />
                    </td>
                  ))}
                </tr>
              );
            })}

            <tr>
              <th />
              {recommendations.map((recommendation) => (
                <td
                  key={recommendation.destination.slug}
                  className="border-l border-ink-100 p-4 text-center"
                >
                  <Button variant="primary" size="sm" asChild>
                    <Link
                      href={`/destination/${recommendation.destination.slug}${query ? `?${query}` : ""}`}
                    >
                      Voir
                      <ArrowRight />
                    </Link>
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({
  row,
  recommendation,
}: {
  row: RowId;
  recommendation: DestinationRecommendation;
}) {
  const { destination, budget, weather, travel, breakdown, score } = recommendation;

  switch (row) {
    case "price":
      return (
        <span className="font-semibold tabular-nums text-ink-900">
          {formatPrice(budget.total)}
        </span>
      );
    case "perPerson":
      return <span className="tabular-nums text-ink-700">{formatPrice(budget.perPerson)}</span>;
    case "weather":
      return (
        <span className="inline-flex items-center gap-1.5 text-ink-700">
          <WeatherIcon condition={weather.condition} />
          {conditionLabels[weather.condition]}
        </span>
      );
    case "temperature":
      return (
        <span className="font-medium text-ink-900">
          {formatTemperature(weather.temperature)}
        </span>
      );
    case "duration":
      return <span className="text-ink-700">{formatDuration(travel.duration)}</span>;
    case "accommodation":
      return (
        <span className="inline-flex items-center gap-1.5">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium text-ink-900">
            {destination.scores.accommodation}
          </span>
        </span>
      );
    case "activities":
      return <span className="font-medium text-ink-900">{breakdown.activities}</span>;
    default:
      return (
        <span className="flex flex-col items-center gap-1">
          <TravelScore score={score} size="sm" />
          <span className={cn("text-[11px] font-medium", scoreTone(score).text)}>
            {scoreTone(score).label}
          </span>
        </span>
      );
  }
}
