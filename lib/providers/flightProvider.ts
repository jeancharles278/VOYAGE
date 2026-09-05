import type { FlightOffer, SearchCriteria } from "@/types";
import { estimateTravel } from "@/lib/geo";
import { seededRandom } from "@/lib/utils";
import { seasonMultiplier } from "./hotelProvider";
import type { FlightProvider, FlightQuery } from "./types";

const AIRLINES = [
  "Air France",
  "Lufthansa",
  "Vueling",
  "Ryanair",
  "Transavia",
  "easyJet",
  "TAP Air Portugal",
  "ITA Airways",
];

const RAIL_OPERATORS = ["TGV INOUI", "Eurostar", "ÖBB Nightjet", "Trenitalia"];

/**
 * Prix aller-retour par adulte, estimé à partir du prix moyen de la
 * destination, du facteur de départ et de la saison. Les enfants
 * bénéficient d'une remise standard de 25 %.
 */
export function estimateTransportCost(query: FlightQuery): number {
  const { origin, destination, criteria } = query;
  const travel = estimateTravel(origin, destination.position, {
    preferred: criteria.transport,
    trainAccessible: destination.trainAccessible,
  });
  const season = seasonMultiplier(criteria.startDate);
  const base = destination.avgFlightPrice * origin.priceFactor * season;

  const perAdult =
    travel.mode === "car"
      ? // Carburant + péages, partagés par le véhicule.
        Math.round((travel.distance * 2 * 0.16) / Math.max(1, criteria.travelers.adults))
      : travel.mode === "train"
        ? Math.round(base * 0.86)
        : Math.round(base);

  const childRate = travel.mode === "car" ? 0 : 0.75;
  return Math.round(
    perAdult * criteria.travelers.adults +
      perAdult * childRate * criteria.travelers.children,
  );
}

function generateFlights(query: FlightQuery): FlightOffer[] {
  const { origin, destination, criteria } = query;
  const rand = seededRandom(`flights-${origin.slug}-${destination.slug}`);
  const travel = estimateTravel(origin, destination.position, {
    preferred: criteria.transport,
    trainAccessible: destination.trainAccessible,
  });
  const totalReference = estimateTransportCost(query);
  const passengers = Math.max(1, criteria.travelers.adults + criteria.travelers.children);
  const offers: FlightOffer[] = [];

  for (let i = 0; i < 5; i++) {
    const isDirect = travel.stops === 0 ? rand() > 0.25 : rand() > 0.7;
    const stops = isDirect ? 0 : 1;
    const duration = +(travel.duration * (1 + stops * 0.45 + rand() * 0.1)).toFixed(2);
    const priceFactor = 0.82 + rand() * 0.5 - (stops ? 0.14 : 0);
    const carrier =
      travel.mode === "train"
        ? RAIL_OPERATORS[i % RAIL_OPERATORS.length]
        : AIRLINES[i % AIRLINES.length];

    offers.push({
      id: `${origin.slug}-${destination.slug}-${i}`,
      provider: "mock",
      type: "flight",
      name: `${origin.name} → ${destination.name}${stops ? " (1 escale)" : " (direct)"}`,
      price: Math.round(totalReference * priceFactor),
      currency: "EUR",
      taxesIncluded: true,
      rating: +(3.4 + rand() * 1.4).toFixed(1),
      reviewCount: 120 + Math.round(rand() * 2200),
      originAirport: origin.airport,
      destinationAirport: destination.airport,
      duration,
      stops,
      airline: carrier,
      mode: travel.mode,
      departureTime: `${String(6 + Math.floor(rand() * 13)).padStart(2, "0")}:${rand() > 0.5 ? "15" : "45"}`,
      returnTime: `${String(9 + Math.floor(rand() * 11)).padStart(2, "0")}:${rand() > 0.5 ? "10" : "40"}`,
    });
  }

  return offers
    .map((offer) => ({ ...offer, price: Math.max(offer.price, 30 * passengers) }))
    .sort((a, b) => a.price - b.price);
}

export const mockFlightProvider: FlightProvider = {
  id: "mock",
  label: "Transport simulé",
  live: false,
  async search(query: FlightQuery): Promise<FlightOffer[]> {
    return generateFlights(query);
  },
};

/** Point d'ancrage pour Amadeus Flight Offers Search / Kiwi / Duffel. */
export function getFlightProvider(): FlightProvider {
  return mockFlightProvider;
}
