import type {
  Amenity,
  Destination,
  HotelOffer,
  HotelRate,
  MealPlan,
  SearchCriteria,
} from "@/types";
import { seededRandom } from "@/lib/utils";
import { withAmadeusHotels } from "./amadeus";
import type { HotelProvider, HotelQuery } from "./types";

const AGENCIES = ["Booking", "Expedia", "Agoda", "Prix direct"] as const;

const HOTEL_PREFIXES = [
  "Grand Hôtel",
  "Iberostar",
  "Sol Príncipe",
  "Blue Bay Resort",
  "Villa Aurora",
  "Palm Garden",
  "Hôtel du Port",
  "Riviera Suites",
  "Casa Bianca",
  "Marina Palace",
  "Le Belvédère",
  "Terra Nova Resort",
];

const MEAL_PLAN_MULTIPLIER: Record<MealPlan, number> = {
  none: 1,
  breakfast: 1.12,
  halfBoard: 1.3,
  fullBoard: 1.46,
  allInclusive: 1.68,
};

export const mealPlanLabels: Record<MealPlan, string> = {
  none: "Sans repas",
  breakfast: "Petit-déjeuner inclus",
  halfBoard: "Demi-pension",
  fullBoard: "Pension complète",
  allInclusive: "All inclusive",
};

export const amenityLabels: Record<Amenity, string> = {
  pool: "Piscine",
  spa: "Spa",
  beach: "Accès plage",
  breakfast: "Petit-déjeuner",
  allInclusive: "All inclusive",
  parking: "Parking",
  airConditioning: "Climatisation",
};

/**
 * Génère un parc hôtelier crédible et déterministe pour une destination.
 * Le prix de base vient de `avgHotelPricePerNight`, puis est modulé par
 * le classement, les équipements, la saison et la taille du groupe.
 */
function generateHotels(destination: Destination, criteria: SearchCriteria): HotelOffer[] {
  const rand = seededRandom(`hotels-${destination.slug}`);
  const guests = criteria.travelers.adults + criteria.travelers.children;
  const seasonFactor = seasonMultiplier(criteria.startDate);
  const count = 10;
  const offers: HotelOffer[] = [];

  for (let i = 0; i < count; i++) {
    const stars = 3 + Math.floor(rand() * 3); // 3 à 5
    const qualityFactor = 0.72 + (stars - 3) * 0.34 + rand() * 0.16;
    const nearBeach = destination.beachDistance !== null && rand() > 0.25;
    const distanceToBeach = nearBeach
      ? Math.round((destination.beachDistance ?? 400) * (0.4 + rand() * 2.2))
      : null;
    const distanceToCenter = Math.round(300 + rand() * 5200);

    const amenities = pickAmenities(stars, nearBeach, rand);
    const mealPlan = pickMealPlan(stars, criteria.mealPlan, rand);

    const roomsNeeded = Math.max(1, Math.ceil(guests / 3));
    const basePerNight =
      destination.avgHotelPricePerNight *
      qualityFactor *
      seasonFactor *
      MEAL_PLAN_MULTIPLIER[mealPlan] *
      (1 + (roomsNeeded - 1) * 0.78) *
      (1 + (destination.dailyCostIndex - 1) * 0.3);

    const pricePerNight = Math.round(basePerNight);
    const nights = Math.max(1, criteria.nights);
    const total = pricePerNight * nights;
    const rating = +(3.6 + (stars - 3) * 0.35 + rand() * 0.5).toFixed(1);

    offers.push({
      id: `${destination.slug}-hotel-${i}`,
      provider: "mock",
      type: "hotel",
      name: `${HOTEL_PREFIXES[(i + Math.floor(rand() * 3)) % HOTEL_PREFIXES.length]} ${destination.name}`,
      price: total,
      currency: "EUR",
      taxesIncluded: true,
      rating: Math.min(5, rating),
      reviewCount: 180 + Math.round(rand() * 3400),
      stars,
      image: `https://picsum.photos/seed/hotel-${destination.slug}-${i}/800/600`,
      address: `${10 + Math.round(rand() * 180)} avenue ${destination.name}`,
      position: destination.poi.filter((p) => p.category === "hotel")[i % 4]?.position ?? destination.position,
      distanceToBeach,
      distanceToCenter,
      amenities,
      mealPlan,
      freeCancellation: rand() > 0.35,
      pricePerNight,
      rates: buildRates(total, mealPlan, rand),
      bookingUrl: undefined,
    });
  }

  return offers;
}

/** Comparatif multi-agences : mêmes chambres, écarts de tarif réalistes. */
function buildRates(total: number, mealPlan: MealPlan, rand: () => number): HotelRate[] {
  return AGENCIES.map((agency, index) => {
    // Le tarif direct est souvent — mais pas toujours — le plus intéressant.
    const spread = index === 3 ? -0.06 + rand() * 0.14 : -0.03 + rand() * 0.16;
    return {
      agency,
      price: Math.round(total * (1 + spread)),
      currency: "EUR",
      freeCancellation: rand() > 0.4,
      mealPlan,
      bookingUrl: undefined,
    } satisfies HotelRate;
  });
}

function pickAmenities(stars: number, nearBeach: boolean, rand: () => number): Amenity[] {
  const amenities: Amenity[] = [];
  if (rand() > 0.18 || stars >= 4) amenities.push("pool");
  if (stars >= 4 && rand() > 0.4) amenities.push("spa");
  if (nearBeach) amenities.push("beach");
  if (rand() > 0.25) amenities.push("breakfast");
  if (rand() > 0.7) amenities.push("allInclusive");
  if (rand() > 0.4) amenities.push("parking");
  if (stars >= 3 && rand() > 0.15) amenities.push("airConditioning");
  return amenities;
}

function pickMealPlan(stars: number, preferred: MealPlan, rand: () => number): MealPlan {
  // Une partie du parc correspond toujours à la formule demandée.
  if (preferred !== "none" && rand() > 0.45) return preferred;
  const pool: MealPlan[] =
    stars >= 4
      ? ["breakfast", "halfBoard", "allInclusive", "none"]
      : ["none", "breakfast", "halfBoard"];
  return pool[Math.floor(rand() * pool.length)];
}

/** Haute saison estivale et vacances de fin d'année. */
export function seasonMultiplier(startDate?: string): number {
  if (!startDate) return 1;
  const date = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 1;
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 7) return 1.32; // août
  if (month === 6) return 1.22; // juillet
  if (month === 5 || month === 8) return 1.1;
  if (month === 11 && day >= 18) return 1.24;
  if (month === 1 || month === 10) return 0.86;
  return 1;
}

/**
 * Applique les filtres utilisateur (classement, équipements, plage) puis
 * classe par rapport qualité/prix.
 */
export function filterHotels(offers: HotelOffer[], criteria: SearchCriteria): HotelOffer[] {
  return offers
    .filter((hotel) => {
      // Un classement inconnu ne permet pas d'exclure : on ne peut pas
      // prouver que l'hôtel ne correspond pas au critère.
      if (
        criteria.minHotelRating &&
        hotel.stars !== null &&
        hotel.stars < criteria.minHotelRating
      ) {
        return false;
      }
      if (
        criteria.maxBeachDistance !== null &&
        (hotel.distanceToBeach === null ||
          hotel.distanceToBeach > criteria.maxBeachDistance)
      ) {
        return false;
      }
      return criteria.amenities.every((amenity) => hotel.amenities.includes(amenity));
    })
    .sort((a, b) => bestRate(a).price - bestRate(b).price);
}

/** Meilleur tarif toutes agences confondues. */
export function bestRate(hotel: HotelOffer): HotelRate {
  return hotel.rates.reduce((best, rate) => (rate.price < best.price ? rate : best), hotel.rates[0]);
}

export const mockHotelProvider: HotelProvider = {
  id: "mock",
  label: "Parc hôtelier simulé",
  live: false,
  async search({ destination, criteria }: HotelQuery): Promise<HotelOffer[]> {
    return generateHotels(destination, criteria);
  },
};

/**
 * Provider actif. Amadeus prend le relais dès que ses identifiants sont
 * présents (ou `AMADEUS_MODE=fixtures`) ; sinon le parc simulé est servi.
 *
 * Le provider Amadeus reçoit le parc simulé en repli.
 */
export function getHotelProvider(): HotelProvider {
  return withAmadeusHotels(mockHotelProvider);
}
