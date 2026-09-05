/**
 * Vérification de bout en bout du moteur, sans navigateur.
 *   npm run smoke
 *
 * Rejoue le scénario de référence : départ Luxembourg, 2 adultes + 1 enfant
 * de 9 ans, 4 nuits, 2 000 €, soleil, piscine, plage, > 23 °C, trajet < 4 h.
 */
import { destinations } from "@/data/destinations";
import { origins } from "@/data/origins";
import { parseNaturalLanguage, mergeParsedCriteria } from "@/lib/nlpParser";
import { defaultCriteria, criteriaToSearchParams, criteriaFromSearchParams } from "@/lib/searchCriteria";
import { searchDestinations, recommendDestinations } from "@/lib/recommendationEngine";
import { mockWeatherProvider, mockHotelProvider, mockFlightProvider, mockRentalProvider, filterHotels, bestRate } from "@/lib/providers";
import { addDays, todayISO } from "@/lib/utils";
import type { SearchCriteria } from "@/types";

let failures = 0;
function check(label: string, condition: boolean, detail?: unknown) {
  const status = condition ? "  ok  " : " FAIL ";
  if (!condition) failures++;
  console.log(`[${status}] ${label}${detail !== undefined && !condition ? ` -> ${JSON.stringify(detail)}` : ""}`);
}

console.log(`\nCatalogue : ${destinations.length} destinations, ${origins.length} villes de départ\n`);
check("au moins 20 destinations", destinations.length >= 20, destinations.length);
check("slugs uniques", new Set(destinations.map((d) => d.slug)).size === destinations.length);
check(
  "séries climatiques complètes (12 mois)",
  destinations.every(
    (d) =>
      d.climate.avgHigh.length === 12 &&
      d.climate.avgLow.length === 12 &&
      d.climate.precipitation.length === 12 &&
      d.climate.sunHours.length === 12,
  ),
);
check("points d'intérêt générés", destinations.every((d) => d.poi.length >= 8));

/* ------------------------ Scénario de référence -------------------------- */

// Séjour d'été : l'exemple de référence du cahier des charges.
const year = new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear();
const start = `${year}-07-11`;
const criteria: SearchCriteria = {
  ...defaultCriteria(),
  origin: "luxembourg",
  startDate: start,
  endDate: addDays(start, 4),
  nights: 4,
  travelers: { adults: 2, children: 1, childrenAges: [9] },
  maxBudget: 2000,
  maxTravelTime: 4,
  minTemperature: 23,
  weather: "sunny",
  amenities: ["pool", "beach"],
  stayTypes: ["beach", "family"],
};

const outcome = searchDestinations(criteria);
console.log(`\nScénario Luxembourg — ${outcome.recommendations.length} destinations retenues (${outcome.excluded} écartées)`);
outcome.recommendations.slice(0, 8).forEach((r, i) => {
  console.log(
    `  ${String(i + 1).padStart(2)}. ${r.destination.name.padEnd(20)} score ${String(r.score).padStart(3)}/100 · ${Math.round(r.weather.temperature)}°C · ${r.travel.duration.toFixed(1)} h · ${r.budget.total} €`,
  );
});

check("des destinations sont proposées", outcome.recommendations.length > 0);
check("aucun assouplissement nécessaire", outcome.relaxed.length === 0, outcome.relaxed);
check(
  "budget respecté",
  outcome.recommendations.every((r) => r.budget.total <= criteria.maxBudget),
);
check(
  "température minimale respectée",
  outcome.recommendations.every((r) => r.weather.temperature >= 23),
);
check(
  "durée de trajet respectée",
  outcome.recommendations.every((r) => r.travel.duration <= 4),
);
check("scores triés par ordre décroissant", outcome.recommendations.every((r, i, arr) => i === 0 || arr[i - 1].score >= r.score));
check("scores dans [0, 100]", outcome.recommendations.every((r) => r.score >= 0 && r.score <= 100));
check("explication générée", outcome.recommendations.every((r) => r.reason.length > 40));

/* ------------------------------ Parser NLP ------------------------------- */

const parsed = parseNaturalLanguage(
  "Je veux partir 4 jours avec ma femme et mon fils de 9 ans depuis Luxembourg. Je veux du soleil, une piscine et un budget maximum de 2 000 €.",
);
console.log("\nParser langage naturel :", JSON.stringify(parsed.criteria));
check("budget reconnu", parsed.criteria.maxBudget === 2000, parsed.criteria.maxBudget);
check("2 adultes reconnus", parsed.criteria.travelers?.adults === 2, parsed.criteria.travelers);
check("1 enfant de 9 ans reconnu", parsed.criteria.travelers?.children === 1 && parsed.criteria.travelers.childrenAges[0] === 9, parsed.criteria.travelers);
check("durée reconnue (4 jours -> 3 nuits)", parsed.criteria.nights === 3, parsed.criteria.nights);
check("météo ensoleillée reconnue", parsed.criteria.weather === "sunny");
check("piscine reconnue", parsed.criteria.amenities?.includes("pool") === true, parsed.criteria.amenities);
check("ville de départ reconnue", parsed.criteria.origin === "luxembourg", parsed.criteria.origin);

const merged = mergeParsedCriteria(defaultCriteria(), parsed.criteria);
check("fusion des critères cohérente", merged.maxBudget === 2000 && merged.travelers.children === 1);

/* -------------------------- Sérialisation URL ---------------------------- */

const roundTrip = criteriaFromSearchParams(criteriaToSearchParams(criteria));
check("aller-retour URL : budget", roundTrip.maxBudget === criteria.maxBudget);
check("aller-retour URL : voyageurs", roundTrip.travelers.children === 1 && roundTrip.travelers.childrenAges[0] === 9, roundTrip.travelers);
check("aller-retour URL : nuits", roundTrip.nights === criteria.nights, roundTrip.nights);
check("aller-retour URL : filtres", roundTrip.amenities.join() === criteria.amenities.join() && roundTrip.minTemperature === 23);

/* --------------------- Paramètres d'URL manquants ------------------------ */

const bare = criteriaFromSearchParams(new URLSearchParams());
const fallbackCriteria = defaultCriteria();
check("URL vide : budget par défaut", bare.maxBudget === fallbackCriteria.maxBudget, bare.maxBudget);
check("URL vide : voyageurs par défaut", bare.travelers.adults === fallbackCriteria.travelers.adults, bare.travelers);
check("URL vide : nuits par défaut", bare.nights === fallbackCriteria.nights, bare.nights);
check("URL partielle : les autres champs gardent leur défaut", (() => {
  const partial = criteriaFromSearchParams(new URLSearchParams("origin=geneve&types=ski"));
  return partial.maxBudget === fallbackCriteria.maxBudget && partial.travelers.adults === 2 && partial.stayTypes[0] === "ski";
})());

/* ------------------------------ Providers -------------------------------- */

const target = outcome.recommendations[0]?.destination ?? destinations[0];
const origin = origins[0];

const weather = await mockWeatherProvider.getReport({ destination: target, startDate: start, nights: 4 });
check("météo : régime climatique au-delà de 14 jours", weather.kind === "climate", weather.kind);
check("météo : série journalière non vide", weather.daily.length > 0);

const nearWeather = await mockWeatherProvider.getReport({ destination: target, startDate: addDays(todayISO(), 3), nights: 4 });
check("météo : prévision si dates proches", nearWeather.kind === "forecast", nearWeather.kind);

const hotels = await mockHotelProvider.search({ destination: target, criteria });
const filtered = filterHotels(hotels, criteria);
check("hôtels générés", hotels.length > 0);
check("filtre équipements appliqué", filtered.every((h) => criteria.amenities.every((a) => h.amenities.includes(a))));
check("comparateur multi-agences", hotels.every((h) => h.rates.length === 4));
check("meilleur tarif identifié", hotels.every((h) => h.rates.every((r) => r.price >= bestRate(h).price)));

const flights = await mockFlightProvider.search({ origin, destination: target, criteria });
check("transports générés et triés", flights.length > 0 && flights.every((f, i, arr) => i === 0 || arr[i - 1].price <= f.price));

const rentals = await mockRentalProvider.search({ destination: target, criteria });
check("locations adaptées à la taille du groupe", rentals.every((r) => r.capacity >= 3));

/* ------------------------ Cas limites du moteur --------------------------- */

const impossible = searchDestinations({ ...criteria, maxBudget: 200, minTemperature: 38, maxTravelTime: 1 });
check("assouplissement automatique si aucun résultat", impossible.recommendations.length > 0 && impossible.relaxed.length > 0, impossible.relaxed);

const strict = recommendDestinations({ ...criteria, maxBudget: 200, minTemperature: 38, maxTravelTime: 1 });
check("recommendDestinations reste strict", strict.length === 0, strict.length);

const skiSearch = searchDestinations({
  ...defaultCriteria(),
  origin: "geneve",
  startDate: `${new Date().getFullYear() + 1}-01-20`,
  endDate: `${new Date().getFullYear() + 1}-01-27`,
  nights: 7,
  weather: "snow",
  stayTypes: ["ski"],
  maxBudget: 4000,
});
console.log(`\nScénario ski (Genève, janvier) : ${skiSearch.recommendations.map((r) => r.destination.name).join(", ")}`);
check("scénario ski : stations proposées", skiSearch.recommendations.some((r) => r.destination.stayTypes.includes("ski")));

const expected = ["majorque", "malte", "crete", "algarve", "andalousie", "sicile"];
const proposed = outcome.recommendations.map((r) => r.destination.slug);
const found = expected.filter((slug) => proposed.includes(slug));
console.log(`\nDestinations attendues retrouvées : ${found.length}/${expected.length} (${found.join(", ")})`);
check("l'exemple du cahier des charges renvoie les destinations attendues", found.length >= 5, found);

console.log(failures === 0 ? "\n✅ Tous les contrôles sont passés.\n" : `\n❌ ${failures} contrôle(s) en échec.\n`);
process.exit(failures === 0 ? 0 : 1);
