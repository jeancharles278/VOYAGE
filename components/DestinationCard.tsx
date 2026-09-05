import Link from "next/link";
import { ArrowUpRight, MapPin, Plane, Star, TrainFront, Car } from "lucide-react";
import type { DestinationRecommendation } from "@/types";
import { badgeLabels } from "@/lib/recommendationEngine";
import { formatDuration, formatPrice, formatTemperature } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/FavoriteButton";
import { CompareToggle } from "@/components/CompareToggle";
import { Photo } from "@/components/Photo";
import { TravelScore } from "@/components/TravelScore";
import { WeatherIcon } from "@/components/WeatherIcon";
import { conditionLabels } from "@/lib/climate";

const MODE_ICON = { plane: Plane, train: TrainFront, car: Car } as const;

const BADGE_VARIANT: Partial<
  Record<keyof typeof badgeLabels, "lagoon" | "coral" | "success" | "soft">
> = {
  "very-sunny": "coral",
  "great-price": "success",
  "best-value": "success",
  "family-friendly": "lagoon",
  "short-trip": "lagoon",
};

interface DestinationCardProps {
  recommendation: DestinationRecommendation;
  /** Query string des critères, propagée vers la fiche destination. */
  query?: string;
  priority?: boolean;
}

export function DestinationCard({
  recommendation,
  query,
  priority,
}: DestinationCardProps) {
  const { destination, score, badges, budget, weather, travel, reason } = recommendation;
  const ModeIcon = MODE_ICON[travel.mode];
  const href = query
    ? `/destination/${destination.slug}?${query}`
    : `/destination/${destination.slug}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={href} className="absolute inset-0 z-10" aria-label={`Voir ${destination.name}`}>
        <span className="sr-only">Voir la fiche de {destination.name}</span>
      </Link>

      {/* ------------------------------ Visuel ------------------------------ */}
      <Photo
        src={destination.image}
        alt={`${destination.name}, ${destination.country}`}
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="aspect-[4/3] w-full"
        imageClassName="group-hover:scale-105"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/5 to-transparent" />

        <div className="absolute right-3 top-3 z-20 flex gap-2">
          <CompareToggle slug={destination.slug} />
          <FavoriteButton
            item={{
              id: destination.slug,
              type: "destination",
              label: destination.name,
              destination: destination.slug,
            }}
          />
        </div>

        {badges.length > 0 && (
          <div className="absolute left-3 right-24 top-3 flex flex-wrap gap-1.5">
            {badges.slice(0, 2).map((badge) => (
              <Badge
                key={badge}
                variant={BADGE_VARIANT[badge] ?? "soft"}
                className="shadow-soft"
              >
                {badgeLabels[badge]}
              </Badge>
            ))}
          </div>
        )}

        <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
          <div className="min-w-0 text-white">
            <h3 className="truncate text-xl font-semibold tracking-tight">
              {destination.name}
            </h3>
            <p className="flex items-center gap-1 truncate text-[13px] text-white/80">
              <MapPin className="size-3.5 shrink-0" />
              {destination.country} · {destination.region}
            </p>
          </div>
        </div>
      </Photo>

      {/* ------------------------------ Contenu ----------------------------- */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Metric
              label="Météo"
              value={
                <span className="flex items-center gap-1.5">
                  <WeatherIcon condition={weather.condition} />
                  {formatTemperature(weather.temperature)}
                </span>
              }
              hint={conditionLabels[weather.condition]}
            />
            <Metric
              label="Trajet"
              value={
                <span className="flex items-center gap-1.5">
                  <ModeIcon className="size-4 text-ink-400" />
                  {formatDuration(travel.duration)}
                </span>
              }
              hint={`${travel.distance} km`}
            />
          </dl>

          <TravelScore score={score} />
        </div>

        <div className="rounded-2xl bg-sand-50 p-3.5">
          <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-500">{reason}</p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-ink-100 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-300">
              Budget estimé
            </p>
            <p className="text-xl font-semibold tracking-tight text-ink-900">
              {formatPrice(budget.total)}
            </p>
            <p className="whitespace-nowrap text-xs text-ink-400">
              {formatPrice(budget.perPerson)} / pers.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="flex items-center gap-1 text-sm text-ink-500">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-ink-800">{destination.reviewScore}</span>
              <span className="text-xs text-ink-300">
                ({(destination.reviewCount / 1000).toFixed(1)}k)
              </span>
            </span>
            <span className="z-20 flex items-center gap-1 text-[13px] font-medium text-lagoon-700 transition-colors group-hover:text-lagoon-800">
              Découvrir
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-ink-900">{value}</dd>
      {hint && <dd className="text-xs text-ink-400">{hint}</dd>}
    </div>
  );
}

/** État de chargement des cartes de résultats. */
export function DestinationCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid flex-1 gap-2">
            <div className="skeleton h-3 w-16 rounded-full" />
            <div className="skeleton h-4 w-24 rounded-full" />
            <div className="skeleton h-3 w-20 rounded-full" />
          </div>
          <div className="skeleton size-[60px] rounded-full" />
        </div>
        <div className="skeleton h-16 w-full rounded-2xl" />
        <div className="flex items-end justify-between gap-3 border-t border-ink-100 pt-4">
          <div className="grid gap-2">
            <div className="skeleton h-3 w-20 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="skeleton h-4 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}
