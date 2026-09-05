import { Car, Clock, Plane, TrainFront } from "lucide-react";
import type { FlightOffer } from "@/types";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const MODE = {
  plane: { icon: Plane, label: "Vol" },
  train: { icon: TrainFront, label: "Train" },
  car: { icon: Car, label: "Voiture" },
} as const;

export function TransportOptions({
  offers,
  originName,
  className,
}: {
  offers: FlightOffer[];
  originName: string;
  className?: string;
}) {
  if (offers.length === 0) return null;
  const cheapest = offers[0];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
        <h3 className="flex items-center gap-2 font-semibold tracking-tight text-ink-900">
          <Plane className="size-4 text-ink-400" />
          Transport depuis {originName}
        </h3>
        <span className="text-xs text-ink-400">Prix pour tous les voyageurs</span>
      </div>

      <ul className="divide-y divide-ink-100">
        {offers.map((offer) => {
          const { icon: Icon, label } = MODE[offer.mode];
          const isCheapest = offer.id === cheapest.id;
          return (
            <li
              key={offer.id}
              className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-sand-50/60"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-ink-600">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {offer.airline}
                    <span className="ml-2 text-xs font-normal text-ink-400">
                      {offer.originAirport} → {offer.destinationAirport}
                    </span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-400">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDuration(offer.duration)}
                    </span>
                    <span>{offer.stops === 0 ? "Direct" : `${offer.stops} escale`}</span>
                    <span>
                      {label} · départ {offer.departureTime}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isCheapest && <Badge variant="success">Meilleur prix</Badge>}
                <span className="text-lg font-semibold tabular-nums text-ink-900">
                  {formatPrice(offer.price)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
