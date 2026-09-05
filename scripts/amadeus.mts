/**
 * Vérification de l'adaptateur Amadeus et de la couche de cache.
 *   npm run amadeus
 *
 * Aucun identifiant, aucun réseau : tout passe par les réponses enregistrées
 * dans `fixtures/amadeus/`. Ce qui est validé, c'est le chemin de code réel —
 * authentification, cache, déduplication, mapping, repli sur erreur.
 */
import { createCache, createMemoryStore, cacheKey, CACHE_TTL } from "@/lib/cache";
import {
  createAmadeusClient,
  createAmadeusFlightProvider,
  createAmadeusHotelProvider,
  createFixtureTransport,
  mapFlightOffers,
  mapHotelOffers,
  inferAmenities,
  inferMealPlan,
  parseIsoDuration,
  titleCase,
  type AmadeusFlightOffersResponse,
  type AmadeusHotelListEntry,
  type AmadeusHotelOffersResponse,
  type AmadeusHotelSentiment,
} from "@/lib/providers/amadeus";
import { mockFlightProvider, mockHotelProvider } from "@/lib/providers";
import { getDestination } from "@/data/destinations";
import { getOrigin } from "@/data/origins";
import { defaultCriteria } from "@/lib/searchCriteria";
import type { SearchCriteria } from "@/types";
import flightFixture from "@/fixtures/amadeus/flight-offers.json";
import hotelListFixture from "@/fixtures/amadeus/hotel-list.json";
import hotelOffersFixture from "@/fixtures/amadeus/hotel-offers.json";
import hotelRatingsFixture from "@/fixtures/amadeus/hotel-ratings.json";

let failures = 0;
function check(label: string, condition: boolean, detail?: unknown) {
  if (!condition) failures++;
  console.log(`[${condition ? "  ok  " : " FAIL "}] ${label}${
    !condition && detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ""
  }`);
}
function section(title: string) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 58 - title.length))}`);
}

const origin = getOrigin("luxembourg")!;
const destination = getDestination("majorque")!;
const criteria: SearchCriteria = {
  ...defaultCriteria(),
  origin: "luxembourg",
  startDate: "2027-07-11",
  endDate: "2027-07-15",
  nights: 4,
  travelers: { adults: 2, children: 1, childrenAges: [9] },
  maxBudget: 2000,
};

/* ========================================================================== */
section("Utilitaires");

check("PT2H15M vaut 2,25 h", parseIsoDuration("PT2H15M") === 2.25);
check("PT5H05M vaut 5,08 h", Math.abs(parseIsoDuration("PT5H05M") - 5.0833) < 0.001);
check("PT0H55M vaut 0,92 h", Math.abs(parseIsoDuration("PT0H55M") - 0.9167) < 0.001);
check("P1DT2H gère les jours", parseIsoDuration("P1DT2H") === 26);
check("une durée absente vaut 0", parseIsoDuration(undefined) === 0);
check("une durée illisible vaut 0 (jamais NaN)", parseIsoDuration("bruit") === 0);
check("MELIA PALMA MARINA → Melia Palma Marina", titleCase("MELIA PALMA MARINA") === "Melia Palma Marina");
check("les traits d'union sont respectés", titleCase("PORT-LOUIS") === "Port-Louis");

/* ========================================================================== */
section("Cache");

{
  const cache = createCache({ namespace: "test", ttlMs: 1000 });
  let calls = 0;
  const produce = async () => { calls++; return { value: calls }; };

  const first = await cache.wrap("k", produce);
  const second = await cache.wrap("k", produce);
  check("le second appel est servi par le cache", calls === 1 && second.value === first.value, calls);
  check("les compteurs sont exacts", cache.stats().hits === 1 && cache.stats().misses === 1, cache.stats());
}

{
  // Déduplication : dix appels concurrents, une seule exécution.
  const cache = createCache({ namespace: "test", ttlMs: 1000 });
  let calls = 0;
  const slow = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 30));
    return calls;
  };
  const results = await Promise.all(Array.from({ length: 10 }, () => cache.wrap("same", slow)));
  check("10 appels concurrents = 1 exécution", calls === 1, calls);
  check("tous reçoivent la même valeur", new Set(results).size === 1);
  check("9 appels coalescés", cache.stats().coalesced === 9, cache.stats());
}

{
  // Horloge injectée : l'expiration est vérifiable sans attendre.
  let now = 0;
  const cache = createCache({ namespace: "test", ttlMs: 100, now: () => now });
  let calls = 0;
  const produce = async () => { calls++; return calls; };
  await cache.wrap("k", produce);
  now = 50;
  await cache.wrap("k", produce);
  check("valeur encore valide avant expiration", calls === 1, calls);
}

{
  const cache = createCache({ namespace: "test", ttlMs: 1 });
  let calls = 0;
  await cache.wrap("k", async () => { calls++; return 1; });
  await new Promise((r) => setTimeout(r, 12));
  await cache.wrap("k", async () => { calls++; return 2; });
  check("valeur recalculée après expiration", calls === 2, calls);
}

{
  const cache = createCache({ namespace: "test", ttlMs: 1000 });
  let attempts = 0;
  const failing = async () => { attempts++; throw new Error("panne"); };
  await cache.wrap("k", failing).catch(() => {});
  await cache.wrap("k", failing).catch(() => {});
  check("une erreur n'est jamais mémorisée", attempts === 2, attempts);
}

{
  const store = createMemoryStore(3);
  const cache = createCache({ namespace: "test", ttlMs: 10_000, store });
  for (const key of ["a", "b", "c", "d"]) await cache.wrap(key, async () => key);
  check("le store LRU respecte sa taille maximale", store.size() === 3, store.size());
  check("la plus ancienne entrée est évincée", (await cache.get("a")) === undefined);
  check("la plus récente est conservée", (await cache.get("d")) === "d");
}

check(
  "la clé de cache est indépendante de l'ordre des propriétés",
  cacheKey({ b: 2, a: 1 }) === cacheKey({ a: 1, b: 2 }),
);
check(
  "des valeurs différentes produisent des clés différentes",
  cacheKey({ a: 1 }) !== cacheKey({ a: 2 }),
);
check("les valeurs nulles sont ignorées", cacheKey({ a: 1, b: undefined }) === "a=1");

/* ========================================================================== */
section("Mapping des vols");

const flights = mapFlightOffers(flightFixture as AmadeusFlightOffersResponse, {
  origin,
  destination,
});

console.log(
  flights
    .map((f) => `   ${f.airline.padEnd(22)} ${String(f.price).padStart(7)} € · ${f.duration.toFixed(2)} h · ${f.stops} escale(s)`)
    .join("\n"),
);

check("les 3 offres sont converties", flights.length === 3, flights.length);
check("le tri est croissant sur le prix", flights.every((f, i, a) => i === 0 || a[i - 1].price <= f.price));
check("le moins cher est Vueling à 598,20 €", flights[0].price === 598.2 && flights[0].airline === "Vueling Airlines", flights[0]);
check("le code compagnie est traduit en nom", flights.some((f) => f.airline === "Luxair"));
check("les durées ISO sont converties", flights.some((f) => f.duration === 2.25), flights.map((f) => f.duration));
check("les escales sont comptées", flights.find((f) => f.airline === "Lufthansa")?.stops === 1);
check("le vol direct a 0 escale", flights.find((f) => f.airline === "Luxair")?.stops === 0);
check("les aéroports sont ceux du trajet", flights.every((f) => f.originAirport === "LUX" && f.destinationAirport === "PMI"), flights.map((f) => [f.originAirport, f.destinationAirport]));
check("l'heure de départ est extraite", flights.find((f) => f.airline === "Luxair")?.departureTime === "09:45");
check("l'heure de retour est extraite", flights.find((f) => f.airline === "Luxair")?.returnTime === "13:10");
check("taxes incluses (grandTotal)", flights.every((f) => f.taxesIncluded));
check("la devise est reprise de la réponse", flights.every((f) => f.currency === "EUR"));
check("le provider est identifié", flights.every((f) => f.provider === "amadeus" && f.type === "flight"));
check("aucun prix NaN", flights.every((f) => Number.isFinite(f.price)));

/* ========================================================================== */
section("Mapping des hôtels");

const directory = new Map<string, AmadeusHotelListEntry>(
  (hotelListFixture.data as AmadeusHotelListEntry[]).map((h) => [h.hotelId, h]),
);
const sentiments = new Map<string, AmadeusHotelSentiment>(
  (hotelRatingsFixture.data as AmadeusHotelSentiment[]).map((s) => [s.hotelId, s]),
);

const hotels = mapHotelOffers(
  (hotelOffersFixture as AmadeusHotelOffersResponse).data,
  { destination, criteria, directory, sentiments },
);

console.log(
  hotels
    .map((h) => `   ${h.name.padEnd(28)} ${String(h.price).padStart(7)} € · ${h.pricePerNight} €/nuit · note ${h.rating ?? "—"} · ${h.mealPlan}`)
    .join("\n"),
);

check("l'hôtel indisponible est écarté", hotels.length === 2, hotels.map((h) => h.name));
check("le nom est remis en casse lisible", hotels.some((h) => h.name === "Melia Palma Marina"), hotels.map((h) => h.name));
check("l'offre la moins chère fait référence", hotels.find((h) => h.name === "Melia Palma Marina")?.price === 787.6);
check("le prix par nuit divise par le nombre de nuits", hotels.find((h) => h.name === "Melia Palma Marina")?.pricePerNight === 197);
check("le tri est croissant sur le prix", hotels.every((h, i, a) => i === 0 || a[i - 1].price <= h.price));
check("la note sur 100 est ramenée sur 5", hotels.find((h) => h.name === "Melia Palma Marina")?.rating === 4.4, hotels.map((h) => h.rating));
check("le nombre d'avis est repris", hotels.find((h) => h.name === "Melia Palma Marina")?.reviewCount === 1462);
check("le classement absent vaut null, jamais 0 étoile", hotels.every((h) => h.stars === null), hotels.map((h) => h.stars));
check("la distance au centre est calculée", hotels.every((h) => h.distanceToCenter > 0), hotels.map((h) => h.distanceToCenter));
check("la distance à la plage est calculée", hotels.every((h) => h.distanceToBeach !== null && h.distanceToBeach > 0));
check("all inclusive détecté depuis le code tarifaire", hotels.find((h) => h.name === "Iberostar Playa De Palma")?.mealPlan === "allInclusive");
check("chambre seule détectée", hotels.find((h) => h.name === "Melia Palma Marina")?.mealPlan === "none");
check("annulation gratuite détectée", hotels.find((h) => h.name === "Iberostar Playa De Palma")?.freeCancellation === true);
check("tarif non remboursable détecté", hotels.find((h) => h.name === "Melia Palma Marina")?.freeCancellation === false);
check("un seul tarif par hôtel (fournisseur unique)", hotels.every((h) => h.rates.length === 1 && h.rates[0].agency === "Amadeus"));
check("le lien de réservation est conservé", hotels.every((h) => Boolean(h.bookingUrl)));

check(
  "les équipements sont déduits de la description",
  (() => {
    const iberostar = hotels.find((h) => h.name === "Iberostar Playa De Palma");
    return ["pool", "spa", "beach", "parking", "allInclusive"].every((a) =>
      iberostar?.amenities.includes(a as never),
    );
  })(),
  hotels.find((h) => h.name === "Iberostar Playa De Palma")?.amenities,
);
check("aucun équipement n'est inventé", inferAmenities("Standard room, city view").length === 0);
check("une description absente ne casse rien", inferAmenities(undefined).length === 0);
check(
  "la formule repas retombe sur `none` sans indice",
  inferMealPlan({ id: "x", checkInDate: "", checkOutDate: "", price: { currency: "EUR", total: "1" } }) === "none",
);

/* ========================================================================== */
section("Client HTTP et providers (réponses enregistrées)");

{
  const requests: string[] = [];
  const client = createAmadeusClient({
    clientId: "fixture",
    clientSecret: "fixture",
    fetchImpl: createFixtureTransport({ onRequest: (url) => requests.push(url) }),
    minIntervalMs: 0,
    cache: createCache({ namespace: "amadeus-test", ttlMs: CACHE_TTL.flightOffers }),
  });

  const provider = createAmadeusFlightProvider(client, mockFlightProvider);
  const first = await provider.search({ origin, destination, criteria });
  const second = await provider.search({ origin, destination, criteria });

  const tokenCalls = requests.filter((u) => u.includes("oauth2/token")).length;
  const searchCalls = requests.filter((u) => u.includes("flight-offers")).length;

  check("le provider renvoie les offres converties", first.length === 3, first.length);
  check("le jeton OAuth n'est demandé qu'une fois", tokenCalls === 1, tokenCalls);
  check("la seconde recherche ne rappelle pas l'API", searchCalls === 1, searchCalls);
  check("les deux recherches donnent le même résultat", JSON.stringify(first) === JSON.stringify(second));
  check("les paramètres de recherche sont transmis", requests.some((u) => u.includes("originLocationCode=LUX") && u.includes("destinationLocationCode=PMI") && u.includes("adults=2") && u.includes("children=1")), requests.find((u) => u.includes("flight-offers")));
}

{
  const client = createAmadeusClient({
    clientId: "fixture",
    clientSecret: "fixture",
    fetchImpl: createFixtureTransport(),
    minIntervalMs: 0,
    cache: createCache({ namespace: "amadeus-hotels-test", ttlMs: CACHE_TTL.hotelOffers }),
  });
  const provider = createAmadeusHotelProvider(client, mockHotelProvider);
  const results = await provider.search({ destination, criteria });
  check("le provider hôtels renvoie les offres converties", results.length === 2, results.length);
  check("les hôtels portent bien le provider amadeus", results.every((h) => h.provider === "amadeus"));
}

{
  // Requêtes concurrentes : la déduplication doit tenir au niveau provider.
  const requests: string[] = [];
  const client = createAmadeusClient({
    clientId: "fixture",
    clientSecret: "fixture",
    fetchImpl: createFixtureTransport({ latencyMs: 20, onRequest: (u) => requests.push(u) }),
    minIntervalMs: 0,
    cache: createCache({ namespace: "amadeus-concurrent", ttlMs: CACHE_TTL.flightOffers }),
  });
  const provider = createAmadeusFlightProvider(client, mockFlightProvider);
  await Promise.all(Array.from({ length: 8 }, () => provider.search({ origin, destination, criteria })));
  const searchCalls = requests.filter((u) => u.includes("flight-offers")).length;
  check("8 recherches simultanées = 1 appel API", searchCalls === 1, searchCalls);
}

/* ========================================================================== */
section("Dégradation");

{
  const client = createAmadeusClient({
    clientId: "fixture",
    clientSecret: "fixture",
    fetchImpl: createFixtureTransport({ failWith: 500 }),
    minIntervalMs: 0,
    maxRetries: 1,
    cache: createCache({ namespace: "amadeus-fail", ttlMs: 1000 }),
  });
  const provider = createAmadeusFlightProvider(client, mockFlightProvider);
  const results = await provider.search({ origin, destination, criteria });
  const expected = await mockFlightProvider.search({ origin, destination, criteria });
  check("une panne API bascule sur l'estimation", results.length === expected.length && results.length > 0, results.length);
  check("le repli est bien le provider simulé", results.every((r) => r.provider === "mock"));
}

{
  const client = createAmadeusClient({
    clientId: "fixture",
    clientSecret: "fixture",
    fetchImpl: createFixtureTransport(),
    minIntervalMs: 0,
    cache: createCache({ namespace: "amadeus-train", ttlMs: 1000 }),
  });
  const provider = createAmadeusFlightProvider(client, mockFlightProvider);
  const trainResults = await provider.search({
    origin,
    destination: getDestination("barcelone")!,
    criteria: { ...criteria, transport: "train" },
  });
  check("un trajet en train n'appelle pas Amadeus", trainResults.every((r) => r.provider === "mock"));
}

{
  const client = createAmadeusClient({
    clientId: "fixture",
    clientSecret: "fixture",
    fetchImpl: createFixtureTransport(),
    minIntervalMs: 0,
    cache: createCache({ namespace: "amadeus-nodate", ttlMs: 1000 }),
  });
  const provider = createAmadeusHotelProvider(client, mockHotelProvider);
  const results = await provider.search({
    destination,
    criteria: { ...criteria, startDate: undefined, endDate: undefined },
  });
  check("sans dates, on retombe sur le parc simulé", results.every((h) => h.provider === "mock"));
}

/* ========================================================================== */
section("Câblage par l'environnement");

{
  process.env.AMADEUS_MODE = "fixtures";
  const { resolveAmadeusMode, getAmadeusClient } = await import("@/lib/providers/amadeus");
  check("AMADEUS_MODE=fixtures active le mode enregistré", resolveAmadeusMode() === "fixtures");
  check("un client est bien construit", getAmadeusClient() !== null);

  delete process.env.AMADEUS_MODE;
  delete process.env.AMADEUS_CLIENT_ID;
  delete process.env.AMADEUS_CLIENT_SECRET;
  check("sans identifiants, Amadeus est inactif", resolveAmadeusMode() === "off");

  process.env.AMADEUS_CLIENT_ID = "id";
  process.env.AMADEUS_CLIENT_SECRET = "secret";
  check("avec identifiants, le mode live s'active seul", resolveAmadeusMode() === "live");
  delete process.env.AMADEUS_CLIENT_ID;
  delete process.env.AMADEUS_CLIENT_SECRET;
}

console.log(
  failures === 0
    ? "\n✅ Adaptateur Amadeus et cache : tous les contrôles sont passés.\n"
    : `\n❌ ${failures} contrôle(s) en échec.\n`,
);
process.exit(failures === 0 ? 0 : 1);
