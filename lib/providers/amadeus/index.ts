import { createCache } from "@/lib/cache";
import type { FlightProvider, HotelProvider } from "../types";
import {
  createAmadeusClient,
  type AmadeusClient,
  type AmadeusEnvironment,
} from "./client";
import { createFixtureTransport } from "./fixtureTransport";
import { createAmadeusFlightProvider } from "./flights";
import { createAmadeusHotelProvider } from "./hotels";

// Ré-exports explicites : un barril en étoile n'est pas détectable par les
// outils qui analysent statiquement les exports (tsx, cjs-module-lexer).
export {
  createAmadeusClient,
  AmadeusError,
  parseIsoDuration,
  timeFromIso,
  type AmadeusClient,
  type AmadeusConfig,
  type AmadeusEnvironment,
} from "./client";
export { createFixtureTransport, type FixtureTransportOptions } from "./fixtureTransport";
export { createAmadeusFlightProvider } from "./flights";
export { createAmadeusHotelProvider } from "./hotels";
export {
  mapFlightOffers,
  mapHotelOffers,
  inferAmenities,
  inferMealPlan,
  hasFreeCancellation,
  titleCase,
  type HotelMappingContext,
} from "./mappers";
export type {
  AmadeusFlightOffer,
  AmadeusFlightOffersResponse,
  AmadeusHotelListEntry,
  AmadeusHotelListResponse,
  AmadeusHotelOfferEntry,
  AmadeusHotelOffersResponse,
  AmadeusHotelRoomOffer,
  AmadeusHotelSentiment,
  AmadeusHotelSentimentsResponse,
  AmadeusItinerary,
  AmadeusSegment,
} from "./apiTypes";

/**
 * Trois modes, résolus depuis l'environnement :
 *  - `off`      : Amadeus désactivé (défaut) ;
 *  - `fixtures` : chemin de code réel sur des réponses enregistrées ;
 *  - `live`     : appels réels, dès que les identifiants sont présents.
 */
export type AmadeusMode = "off" | "fixtures" | "live";

export function resolveAmadeusMode(): AmadeusMode {
  const mode = process.env.AMADEUS_MODE?.toLowerCase();
  if (mode === "fixtures") return "fixtures";
  if (mode === "off") return "off";
  return process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET
    ? "live"
    : "off";
}

/**
 * Client partagé par les providers vols et hôtels : un seul jeton OAuth,
 * un seul cache, une seule file de limitation de débit.
 */
let sharedClient: AmadeusClient | null = null;
let sharedMode: AmadeusMode | null = null;

export function getAmadeusClient(): AmadeusClient | null {
  const mode = resolveAmadeusMode();
  if (mode === "off") return null;
  if (sharedClient && sharedMode === mode) return sharedClient;

  sharedMode = mode;
  sharedClient = createAmadeusClient({
    clientId: process.env.AMADEUS_CLIENT_ID ?? "fixture-client-id",
    clientSecret: process.env.AMADEUS_CLIENT_SECRET ?? "fixture-client-secret",
    environment: (process.env.AMADEUS_ENVIRONMENT as AmadeusEnvironment) ?? "test",
    fetchImpl: mode === "fixtures" ? createFixtureTransport() : undefined,
    // Les fixtures n'ont pas de quota à respecter.
    minIntervalMs: mode === "fixtures" ? 0 : 110,
    cache: createCache({ namespace: "amadeus", ttlMs: 20 * 60_000 }),
  });
  return sharedClient;
}

/** Enveloppe le provider de repli, ou le renvoie tel quel si Amadeus est inactif. */
export function withAmadeusFlights(fallback: FlightProvider): FlightProvider {
  const client = getAmadeusClient();
  return client ? createAmadeusFlightProvider(client, fallback) : fallback;
}

export function withAmadeusHotels(fallback: HotelProvider): HotelProvider {
  const client = getAmadeusClient();
  return client ? createAmadeusHotelProvider(client, fallback) : fallback;
}
