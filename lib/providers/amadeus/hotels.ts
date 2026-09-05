import type { HotelOffer } from "@/types";
import { CACHE_TTL, cacheKey } from "@/lib/cache";
import type { HotelProvider, HotelQuery } from "../types";
import type { AmadeusClient } from "./client";
import type {
  AmadeusHotelListEntry,
  AmadeusHotelListResponse,
  AmadeusHotelOffersResponse,
  AmadeusHotelSentiment,
  AmadeusHotelSentimentsResponse,
} from "./apiTypes";
import { mapHotelOffers } from "./mappers";

/** Nombre d'établissements interrogés par destination. */
const MAX_HOTELS = 12;

/**
 * Provider hôtels basé sur Amadeus.
 *
 * Le parcours demande trois appels :
 *  1. `hotels/by-city` — la liste des établissements (mise en cache 24 h) ;
 *  2. `hotel-offers`   — les disponibilités et prix pour les dates ;
 *  3. `hotel-sentiments` — les notes e-réputation (facultatif).
 *
 * Une note manquante ou un classement absent ne bloque jamais le résultat.
 */
export function createAmadeusHotelProvider(
  client: AmadeusClient,
  fallback: HotelProvider,
): HotelProvider {
  return {
    id: "amadeus",
    label: "Amadeus",
    live: true,

    async search(query: HotelQuery): Promise<HotelOffer[]> {
      const { destination, criteria } = query;
      if (!criteria.startDate || !criteria.endDate) {
        return fallback.search(query);
      }

      try {
        const listing = await client.cache.wrap(
          cacheKey({ endpoint: "hotel-list", cityCode: destination.airport }),
          () =>
            client.get<AmadeusHotelListResponse>(
              "/v1/reference-data/locations/hotels/by-city",
              {
                cityCode: destination.airport,
                radius: 30,
                radiusUnit: "KM",
                hotelSource: "ALL",
              },
            ),
          CACHE_TTL.hotelList,
        );

        const hotels = listing.data.slice(0, MAX_HOTELS);
        if (hotels.length === 0) return fallback.search(query);

        const hotelIds = hotels.map((hotel) => hotel.hotelId);
        const guests = criteria.travelers.adults + criteria.travelers.children;
        const offerParams = {
          hotelIds: hotelIds.join(","),
          adults: Math.min(9, Math.max(1, criteria.travelers.adults)),
          checkInDate: criteria.startDate,
          checkOutDate: criteria.endDate,
          // Une chambre accueille au plus trois personnes.
          roomQuantity: Math.max(1, Math.ceil(guests / 3)),
          currency: "EUR",
          bestRateOnly: "true",
        };

        // Les notes sont facultatives : leur absence ne doit rien casser.
        const [offers, sentiments] = await Promise.all([
          client.cache.wrap(
            cacheKey({ endpoint: "hotel-offers", ...offerParams }),
            () =>
              client.get<AmadeusHotelOffersResponse>(
                "/v3/shopping/hotel-offers",
                offerParams,
              ),
            CACHE_TTL.hotelOffers,
          ),
          fetchSentiments(client, hotelIds),
        ]);

        const directory = new Map<string, AmadeusHotelListEntry>(
          hotels.map((hotel) => [hotel.hotelId, hotel]),
        );

        const mapped = mapHotelOffers(offers.data, {
          destination,
          criteria,
          directory,
          sentiments,
        });

        return mapped.length > 0 ? mapped : fallback.search(query);
      } catch (error) {
        console.error("[amadeus] recherche d'hôtels indisponible :", error);
        return fallback.search(query);
      }
    },
  };
}

async function fetchSentiments(
  client: AmadeusClient,
  hotelIds: string[],
): Promise<Map<string, AmadeusHotelSentiment>> {
  try {
    const response = await client.cache.wrap(
      cacheKey({ endpoint: "hotel-sentiments", hotelIds }),
      () =>
        client.get<AmadeusHotelSentimentsResponse>(
          "/v2/e-reputation/hotel-sentiments",
          { hotelIds: hotelIds.join(",") },
        ),
      CACHE_TTL.hotelRatings,
    );
    return new Map(response.data.map((entry) => [entry.hotelId, entry]));
  } catch {
    // L'e-réputation est un bonus : on continue sans note plutôt que d'échouer.
    return new Map();
  }
}
