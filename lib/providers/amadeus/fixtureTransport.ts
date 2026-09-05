import flightOffers from "@/fixtures/amadeus/flight-offers.json";
import hotelList from "@/fixtures/amadeus/hotel-list.json";
import hotelOffers from "@/fixtures/amadeus/hotel-offers.json";
import hotelRatings from "@/fixtures/amadeus/hotel-ratings.json";
import oauthToken from "@/fixtures/amadeus/oauth-token.json";

/**
 * Transport rejouant des réponses Amadeus enregistrées.
 *
 * Permet d'exécuter tout le chemin de code réel — authentification, cache,
 * limitation de débit, mapping — sans identifiants. Activé par
 * `AMADEUS_MODE=fixtures`, et utilisé par `npm run amadeus`.
 *
 * Les dates des réponses sont figées : c'est le mapping que l'on valide,
 * pas la disponibilité.
 */

const ROUTES: Array<[RegExp, unknown]> = [
  [/\/v1\/security\/oauth2\/token$/, oauthToken],
  [/\/v2\/shopping\/flight-offers/, flightOffers],
  [/\/v1\/reference-data\/locations\/hotels\/by-city/, hotelList],
  [/\/v3\/shopping\/hotel-offers/, hotelOffers],
  [/\/v2\/e-reputation\/hotel-sentiments/, hotelRatings],
];

export interface FixtureTransportOptions {
  /** Latence simulée, en millisecondes. */
  latencyMs?: number;
  /** Enregistre chaque appel : utile pour vérifier le cache. */
  onRequest?: (url: string) => void;
  /** Force un statut d'erreur, pour tester la dégradation. */
  failWith?: number;
}

export function createFixtureTransport(
  options: FixtureTransportOptions = {},
): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    options.onRequest?.(url);
    if (options.latencyMs) {
      await new Promise((resolve) => setTimeout(resolve, options.latencyMs));
    }

    if (options.failWith) {
      return jsonResponse(
        { errors: [{ status: options.failWith, detail: "Erreur simulée" }] },
        options.failWith,
      );
    }

    const match = ROUTES.find(([pattern]) => pattern.test(url));
    if (!match) {
      return jsonResponse(
        { errors: [{ status: 404, detail: `Aucune réponse enregistrée pour ${url}` }] },
        404,
      );
    }

    return jsonResponse(match[1], 200);
  }) as typeof fetch;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
