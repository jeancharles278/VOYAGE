import type {
  Amenity,
  Destination,
  FlightOffer,
  HotelOffer,
  HotelRate,
  MealPlan,
  Origin,
  SearchCriteria,
} from "@/types";
import { haversine } from "@/lib/geo";
import { parseIsoDuration, timeFromIso } from "./client";
import type {
  AmadeusFlightOffersResponse,
  AmadeusHotelListEntry,
  AmadeusHotelOfferEntry,
  AmadeusHotelRoomOffer,
  AmadeusHotelSentiment,
} from "./apiTypes";

/**
 * Conversion des réponses Amadeus vers les contrats de l'application.
 *
 * Ces fonctions sont pures : elles ne font aucun appel réseau, ce qui les
 * rend testables contre des réponses enregistrées (`npm run amadeus`).
 */

/* -------------------------------------------------------------------------- */
/*                                   Vols                                      */
/* -------------------------------------------------------------------------- */

export function mapFlightOffers(
  response: AmadeusFlightOffersResponse,
  context: { origin: Origin; destination: Destination },
): FlightOffer[] {
  const carriers = response.dictionaries?.carriers ?? {};

  return response.data
    .map((offer): FlightOffer | null => {
      const outbound = offer.itineraries[0];
      const inbound = offer.itineraries[1];
      if (!outbound || outbound.segments.length === 0) return null;

      const firstSegment = outbound.segments[0];
      const lastSegment = outbound.segments[outbound.segments.length - 1];
      const stops = outbound.segments.length - 1;
      const carrierCode =
        offer.validatingAirlineCodes?.[0] ?? firstSegment.carrierCode;

      // `grandTotal` inclut taxes et frais ; `total` sert de repli.
      const price = Number(offer.price.grandTotal ?? offer.price.total);
      if (!Number.isFinite(price)) return null;

      return {
        id: `amadeus-flight-${offer.id}`,
        provider: "amadeus",
        type: "flight",
        name: `${context.origin.name} → ${context.destination.name}${
          stops === 0 ? " (direct)" : ` (${stops} escale${stops > 1 ? "s" : ""})`
        }`,
        price,
        currency: offer.price.currency,
        taxesIncluded: true,
        originAirport: firstSegment.departure.iataCode,
        destinationAirport: lastSegment.arrival.iataCode,
        duration: parseIsoDuration(outbound.duration),
        stops,
        airline: titleCase(carriers[carrierCode] ?? carrierCode),
        mode: "plane",
        departureTime: timeFromIso(firstSegment.departure.at),
        returnTime: inbound
          ? timeFromIso(inbound.segments[0]?.departure.at)
          : undefined,
        // Amadeus ne fournit pas de note voyageurs sur les vols.
        rating: undefined,
        reviewCount: undefined,
      };
    })
    .filter((offer): offer is FlightOffer => offer !== null)
    .sort((a, b) => a.price - b.price);
}

/* -------------------------------------------------------------------------- */
/*                                  Hôtels                                     */
/* -------------------------------------------------------------------------- */

/** Mots-clés cherchés dans la description de chambre, faute de champ dédié. */
const AMENITY_KEYWORDS: Array<[Amenity, RegExp]> = [
  // « pools » au pluriel doit correspondre : pas de \b après le radical.
  ["pool", /\b(pools?|swimming pools?|piscinas?|piscines?)\b/i],
  ["spa", /\b(spa|wellness|hammam|sauna)\b/i],
  ["beach", /\b(beach|beachfront|playa|plage|seafront)\b/i],
  ["breakfast", /\b(breakfast|desayuno|petit[- ]d[ée]jeuner)\b/i],
  ["allInclusive", /\b(all[- ]inclusive|todo incluido)\b/i],
  ["parking", /\b(parking|garage|aparcamiento)\b/i],
  ["airConditioning", /\b(air[- ]conditioning|climatis|aire acondicionado|\bA\/C\b)\b/i],
];

/**
 * Amadeus ne renvoie pas de liste d'équipements structurée avec les offres :
 * on l'infère de la description de chambre. C'est volontairement conservateur
 * — un équipement non mentionné est considéré comme absent, jamais deviné.
 */
export function inferAmenities(description: string | undefined): Amenity[] {
  if (!description) return [];
  return AMENITY_KEYWORDS.filter(([, pattern]) => pattern.test(description)).map(
    ([amenity]) => amenity,
  );
}

/** Déduit la formule repas du code tarifaire puis de la description. */
export function inferMealPlan(offer: AmadeusHotelRoomOffer): MealPlan {
  const board = offer.boardType?.toUpperCase();
  if (board === "ALL_INCLUSIVE") return "allInclusive";
  if (board === "FULL_BOARD") return "fullBoard";
  if (board === "HALF_BOARD") return "halfBoard";
  if (board === "BREAKFAST") return "breakfast";
  if (board === "ROOM_ONLY") return "none";

  const rateCode = offer.rateCode?.toUpperCase() ?? "";
  if (rateCode === "AI") return "allInclusive";
  if (rateCode === "FB") return "fullBoard";
  if (rateCode === "HB") return "halfBoard";
  if (rateCode === "BB") return "breakfast";

  const text = offer.room?.description?.text ?? "";
  if (/all[- ]inclusive/i.test(text)) return "allInclusive";
  if (/full board/i.test(text)) return "fullBoard";
  if (/half board/i.test(text)) return "halfBoard";
  if (/breakfast included/i.test(text)) return "breakfast";
  return "none";
}

/** Une annulation gratuite est une échéance avec un montant nul. */
export function hasFreeCancellation(offer: AmadeusHotelRoomOffer): boolean {
  const cancellations = offer.policies?.cancellations;
  if (!cancellations || cancellations.length === 0) return false;
  return cancellations.some(
    (cancellation) => Number(cancellation.amount ?? "1") === 0,
  );
}

export interface HotelMappingContext {
  destination: Destination;
  criteria: SearchCriteria;
  /** Métadonnées issues de la liste d'hôtels (géolocalisation, classement). */
  directory?: Map<string, AmadeusHotelListEntry>;
  /** Notes e-réputation, indexées par `hotelId`. */
  sentiments?: Map<string, AmadeusHotelSentiment>;
}

export function mapHotelOffers(
  entries: AmadeusHotelOfferEntry[],
  context: HotelMappingContext,
): HotelOffer[] {
  const { destination, criteria } = context;
  const nights = Math.max(1, criteria.nights);
  const beaches = destination.poi.filter((poi) => poi.category === "beach");

  return entries
    .filter((entry) => entry.available && entry.offers.length > 0)
    .map((entry): HotelOffer | null => {
      // L'offre la moins chère fait référence pour la carte et le comparatif.
      const cheapest = entry.offers.reduce((best, offer) =>
        Number(offer.price.total) < Number(best.price.total) ? offer : best,
      );
      const total = Number(cheapest.price.total);
      if (!Number.isFinite(total)) return null;

      const listing = context.directory?.get(entry.hotel.hotelId);
      const latitude = entry.hotel.latitude ?? listing?.geoCode?.latitude;
      const longitude = entry.hotel.longitude ?? listing?.geoCode?.longitude;
      const position =
        latitude !== undefined && longitude !== undefined
          ? { lat: latitude, lng: longitude }
          : destination.position;

      const distanceToCenter = Math.round(
        haversine(position, destination.position) * 1000,
      );
      const distanceToBeach =
        beaches.length === 0
          ? null
          : Math.round(
              Math.min(...beaches.map((beach) => haversine(position, beach.position))) *
                1000,
            );

      const sentiment = context.sentiments?.get(entry.hotel.hotelId);

      return {
        id: `amadeus-hotel-${entry.hotel.hotelId}`,
        provider: "amadeus",
        type: "hotel",
        name: titleCase(entry.hotel.name),
        price: total,
        currency: cheapest.price.currency,
        taxesIncluded: true,
        // `overallRating` est une note sur 100, ramenée sur 5 avec une
        // décimale. `Math.round` évite les surprises de `toFixed` sur les
        // valeurs à mi-chemin (87/20 = 4,35 que `toFixed` arrondit à 4,3).
        rating: sentiment ? Math.round(sentiment.overallRating / 2) / 10 : undefined,
        reviewCount: sentiment?.numberOfReviews,
        // Amadeus Hotel Search ne communique pas le classement en étoiles.
        stars: parseStars(listing?.rating),
        // Aucune photo dans la réponse : à remplacer par un fournisseur d'images.
        image: `https://picsum.photos/seed/amadeus-${entry.hotel.hotelId}/800/600`,
        address: [titleCase(entry.hotel.name), destination.name, destination.country]
          .filter(Boolean)
          .join(", "),
        position,
        distanceToBeach,
        distanceToCenter,
        amenities: inferAmenities(cheapest.room?.description?.text),
        mealPlan: inferMealPlan(cheapest),
        freeCancellation: hasFreeCancellation(cheapest),
        pricePerNight: Math.round(total / nights),
        rates: buildRates(entry.offers),
        bookingUrl: cheapest.self,
      };
    })
    .filter((offer): offer is HotelOffer => offer !== null)
    .sort((a, b) => a.price - b.price);
}

/**
 * Amadeus est un fournisseur unique : le comparatif ne peut afficher qu'une
 * colonne. Comparer Booking / Expedia / Agoda demande d'agréger plusieurs
 * sources, ou une API de métarecherche (voir README).
 */
function buildRates(offers: AmadeusHotelRoomOffer[]): HotelRate[] {
  const cheapest = offers.reduce((best, offer) =>
    Number(offer.price.total) < Number(best.price.total) ? offer : best,
  );
  return [
    {
      agency: "Amadeus",
      price: Math.round(Number(cheapest.price.total)),
      currency: cheapest.price.currency,
      freeCancellation: hasFreeCancellation(cheapest),
      mealPlan: inferMealPlan(cheapest),
      bookingUrl: cheapest.self,
    },
  ];
}

function parseStars(rating: number | string | undefined): number | null {
  if (rating === undefined) return null;
  const value = Number(rating);
  return Number.isFinite(value) && value >= 1 && value <= 5 ? Math.round(value) : null;
}

/** `MELIA PALMA MARINA` → `Melia Palma Marina`. */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s'’\-(])([a-zà-ÿ])/g, (_, prefix: string, letter: string) =>
      prefix + letter.toUpperCase(),
    );
}
