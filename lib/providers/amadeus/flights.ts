import type { FlightOffer } from "@/types";
import { CACHE_TTL, cacheKey } from "@/lib/cache";
import type { FlightProvider, FlightQuery } from "../types";
import type { AmadeusClient } from "./client";
import type { AmadeusFlightOffersResponse } from "./apiTypes";
import { mapFlightOffers } from "./mappers";

/**
 * Provider vols basé sur Amadeus *Flight Offers Search*.
 *
 * `fallback` est appelé si l'API échoue ou ne renvoie rien : l'utilisateur
 * voit toujours une estimation plutôt qu'une page vide.
 */
export function createAmadeusFlightProvider(
  client: AmadeusClient,
  fallback: FlightProvider,
): FlightProvider {
  return {
    id: "amadeus",
    label: "Amadeus",
    live: true,

    async search(query: FlightQuery): Promise<FlightOffer[]> {
      const { origin, destination, criteria } = query;

      // Amadeus ne gère que l'aérien : les autres modes restent estimés.
      if (criteria.transport === "train" || criteria.transport === "car") {
        return fallback.search(query);
      }
      if (!criteria.startDate || !criteria.endDate) {
        return fallback.search(query);
      }

      const params = {
        originLocationCode: origin.airport,
        destinationLocationCode: destination.airport,
        departureDate: criteria.startDate,
        returnDate: criteria.endDate,
        adults: criteria.travelers.adults,
        children: criteria.travelers.children || undefined,
        currencyCode: "EUR",
        // Le budget total couvre aussi l'hébergement : on laisse de la marge
        // plutôt que d'écarter des vols qui restent pertinents.
        maxPrice: Math.round(criteria.maxBudget),
        max: 6,
      };

      const key = cacheKey({ endpoint: "flight-offers", ...params });

      try {
        const response = await client.cache.wrap(
          key,
          () =>
            client.get<AmadeusFlightOffersResponse>(
              "/v2/shopping/flight-offers",
              params,
            ),
          CACHE_TTL.flightOffers,
        );

        const offers = mapFlightOffers(response, { origin, destination });
        return offers.length > 0 ? offers : fallback.search(query);
      } catch (error) {
        console.error("[amadeus] recherche de vols indisponible :", error);
        return fallback.search(query);
      }
    },
  };
}
