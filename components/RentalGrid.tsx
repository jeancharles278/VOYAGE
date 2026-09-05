import { BedDouble, Ruler, Users, Waves } from "lucide-react";
import type { RentalOffer } from "@/types";
import { amenityLabels } from "@/lib/providers/hotelProvider";
import { formatDistance, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Photo } from "@/components/Photo";

export function RentalGrid({
  rentals,
  nights,
  destinationSlug,
}: {
  rentals: RentalOffer[];
  nights: number;
  destinationSlug: string;
}) {
  if (rentals.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-ink-200 bg-white p-10 text-center text-sm text-ink-400">
        Aucune location ne peut accueillir ce nombre de voyageurs.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {rentals.slice(0, 6).map((rental) => (
        <article
          key={rental.id}
          className="group overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
        >
          <Photo
            src={rental.image}
            alt={rental.name}
            sizes="(max-width: 640px) 100vw, 33vw"
            className="aspect-[4/3] w-full"
            imageClassName="group-hover:scale-105"
          >
            <div className="absolute right-3 top-3">
              <FavoriteButton
                item={{
                  id: rental.id,
                  type: "hotel",
                  label: rental.name,
                  destination: destinationSlug,
                }}
              />
            </div>
          </Photo>

          <div className="grid gap-3 p-5">
            <div>
              <h4 className="line-clamp-2 text-[15px] font-medium text-ink-900">
                {rental.name}
              </h4>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                <span className="flex items-center gap-1">
                  <BedDouble className="size-3.5" />
                  {rental.bedrooms} ch.
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {rental.capacity} pers.
                </span>
                <span className="flex items-center gap-1">
                  <Ruler className="size-3.5" />
                  {rental.surface} m²
                </span>
                {rental.distanceToBeach !== null && (
                  <span className="flex items-center gap-1">
                    <Waves className="size-3.5 text-lagoon-500" />
                    {formatDistance(rental.distanceToBeach)}
                  </span>
                )}
              </p>
            </div>

            {rental.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {rental.amenities.slice(0, 3).map((amenity) => (
                  <Badge key={amenity} variant="soft">
                    {amenityLabels[amenity]}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-end justify-between border-t border-ink-100 pt-3">
              <div>
                <p className="text-lg font-semibold text-ink-900">
                  {formatPrice(rental.pricePerNight)}
                  <span className="text-xs font-normal text-ink-400"> / nuit</span>
                </p>
                <p className="text-xs text-ink-400">
                  {formatPrice(rental.price)} pour {nights} nuit{nights > 1 ? "s" : ""}
                </p>
              </div>
              <span className="rounded-lg bg-ink-900 px-2 py-1 text-xs font-semibold text-white">
                {rental.rating?.toFixed(1)}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
