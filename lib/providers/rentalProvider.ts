import type { Amenity, Destination, RentalOffer, SearchCriteria } from "@/types";
import { seededRandom } from "@/lib/utils";
import { seasonMultiplier } from "./hotelProvider";
import type { HotelQuery, RentalProvider } from "./types";

const RENTAL_TYPES = [
  "Appartement",
  "Villa",
  "Maison de village",
  "Studio",
  "Loft",
  "Bungalow",
];

/**
 * Locations de vacances simulées. Le prix suit la capacité d'accueil,
 * la saison et l'indice de coût local.
 */
function generateRentals(destination: Destination, criteria: SearchCriteria): RentalOffer[] {
  const rand = seededRandom(`rentals-${destination.slug}`);
  const guests = criteria.travelers.adults + criteria.travelers.children;
  const season = seasonMultiplier(criteria.startDate);
  const offers: RentalOffer[] = [];

  for (let i = 0; i < 8; i++) {
    const bedrooms = 1 + Math.floor(rand() * 4);
    const capacity = bedrooms * 2;
    const surface = 30 + bedrooms * 22 + Math.round(rand() * 25);
    const amenities: Amenity[] = [];
    if (rand() > 0.35) amenities.push("pool");
    if (destination.beachDistance !== null && rand() > 0.4) amenities.push("beach");
    if (rand() > 0.3) amenities.push("parking");
    if (rand() > 0.25) amenities.push("airConditioning");

    const sizeFactor = 0.62 + bedrooms * 0.24 + (amenities.includes("pool") ? 0.18 : 0);
    const pricePerNight = Math.round(
      destination.avgRentalPricePerNight * sizeFactor * season * (0.9 + rand() * 0.3),
    );
    const nights = Math.max(1, criteria.nights);

    offers.push({
      id: `${destination.slug}-rental-${i}`,
      provider: "mock",
      type: "rental",
      name: `${RENTAL_TYPES[i % RENTAL_TYPES.length]} ${bedrooms} chambre${bedrooms > 1 ? "s" : ""} — ${destination.name}`,
      price: pricePerNight * nights,
      currency: "EUR",
      taxesIncluded: false,
      rating: +(4 + rand() * 0.9).toFixed(1),
      reviewCount: 20 + Math.round(rand() * 480),
      image: `https://picsum.photos/seed/rental-${destination.slug}-${i}/800/600`,
      bedrooms,
      capacity,
      surface,
      position:
        destination.poi.filter((p) => p.category === "hotel")[i % 4]?.position ??
        destination.position,
      amenities,
      pricePerNight,
      distanceToBeach:
        destination.beachDistance === null
          ? null
          : Math.round((destination.beachDistance ?? 400) * (0.5 + rand() * 3)),
    });
  }

  // On ne propose que les logements pouvant réellement accueillir le groupe.
  return offers
    .filter((offer) => offer.capacity >= guests)
    .sort((a, b) => a.pricePerNight - b.pricePerNight);
}

export const mockRentalProvider: RentalProvider = {
  id: "mock",
  label: "Locations simulées",
  live: false,
  async search({ destination, criteria }: HotelQuery): Promise<RentalOffer[]> {
    return generateRentals(destination, criteria);
  },
};

/** Point d'ancrage pour Airbnb/Vrbo via RapidAPI ou un agrégateur. */
export function getRentalProvider(): RentalProvider {
  return mockRentalProvider;
}
