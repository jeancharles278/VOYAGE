import type {
  BadgeId,
  BudgetBreakdown,
  Destination,
  DestinationRecommendation,
  Origin,
  ScoreBreakdown,
  SearchCriteria,
  StayType,
  WeatherSnapshot,
} from "@/types";
import { destinations as allDestinations } from "@/data/destinations";
import { getOrigin, defaultOrigin } from "@/data/origins";
import { climateForPeriod, FORECAST_HORIZON_DAYS } from "@/lib/climate";
import { estimateTravel, type TravelEstimate } from "@/lib/geo";
import { estimateTransportCost } from "@/lib/providers/flightProvider";
import { seasonMultiplier } from "@/lib/providers/hotelProvider";
import { clamp, daysFromNow, lerpScore, todayISO } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                              Pondérations                                   */
/* -------------------------------------------------------------------------- */

export const SCORE_WEIGHTS = {
  weather: 25,
  price: 25,
  transport: 15,
  accommodation: 15,
  activities: 10,
  reviews: 10,
} as const;

export const scoreLabels: Record<keyof ScoreBreakdown, string> = {
  weather: "Météo",
  price: "Prix",
  transport: "Transport",
  accommodation: "Hébergement",
  activities: "Activités",
  reviews: "Avis",
};

/** Correspondance entre type de séjour et score thématique de la destination. */
const STAY_TYPE_SCORE: Record<StayType, keyof Destination["scores"]> = {
  beach: "beach",
  family: "family",
  romantic: "romance",
  luxury: "accommodation",
  nature: "nature",
  city: "culture",
  culture: "culture",
  gastronomy: "gastronomy",
  weekend: "culture",
  roadtrip: "nature",
  ski: "ski",
  themepark: "family",
};

export const stayTypeLabels: Record<StayType, string> = {
  beach: "Plage",
  family: "Famille",
  romantic: "Romantique",
  luxury: "Luxe",
  nature: "Nature",
  city: "Ville",
  culture: "Culture",
  gastronomy: "Gastronomie",
  weekend: "Week-end",
  roadtrip: "Road trip",
  ski: "Ski",
  themepark: "Parc d'attractions",
};

/* -------------------------------------------------------------------------- */
/*                                  Budget                                     */
/* -------------------------------------------------------------------------- */

/** Dépenses quotidiennes sur place (repas, transports locaux, visites). */
const BASE_DAILY_SPEND_ADULT = 45;
const BASE_DAILY_SPEND_CHILD = 24;

export function estimateBudget(
  destination: Destination,
  origin: Origin,
  criteria: SearchCriteria,
): BudgetBreakdown {
  const nights = Math.max(1, criteria.nights);
  const { adults, children } = criteria.travelers;
  const guests = Math.max(1, adults + children);

  const transport = estimateTransportCost({ origin, destination, criteria });

  const season = seasonMultiplier(criteria.startDate);
  const useRental =
    criteria.accommodation === "rental" ||
    (criteria.accommodation === "any" && guests >= 5);

  // Une chambre d'hôtel accueille 3 personnes au maximum.
  const rooms = Math.max(1, Math.ceil(guests / 3));
  const nightly = useRental
    ? destination.avgRentalPricePerNight * (1 + Math.max(0, guests - 4) * 0.16)
    : destination.avgHotelPricePerNight * (1 + (rooms - 1) * 0.78);

  const qualityFactor =
    criteria.minHotelRating === 5 ? 1.75 : criteria.minHotelRating === 4 ? 1.2 : 1;
  const mealFactor =
    criteria.mealPlan === "allInclusive"
      ? 1.68
      : criteria.mealPlan === "fullBoard"
        ? 1.46
        : criteria.mealPlan === "halfBoard"
          ? 1.3
          : criteria.mealPlan === "breakfast"
            ? 1.12
            : 1;

  const accommodation = Math.round(nightly * qualityFactor * mealFactor * season * nights);

  // Les formules avec repas réduisent mécaniquement les dépenses sur place.
  const mealCoverage =
    criteria.mealPlan === "allInclusive"
      ? 0.35
      : criteria.mealPlan === "fullBoard"
        ? 0.5
        : criteria.mealPlan === "halfBoard"
          ? 0.72
          : 1;

  const onSite = Math.round(
    (adults * BASE_DAILY_SPEND_ADULT + children * BASE_DAILY_SPEND_CHILD) *
      destination.dailyCostIndex *
      mealCoverage *
      nights,
  );

  const total = transport + accommodation + onSite;

  return {
    transport,
    accommodation,
    onSite,
    total,
    perPerson: Math.round(total / guests),
    currency: "EUR",
    remaining: criteria.maxBudget - total,
  };
}

/* -------------------------------------------------------------------------- */
/*                          Scores intermédiaires                              */
/* -------------------------------------------------------------------------- */

export interface ScoreInput {
  destination: Destination;
  criteria: SearchCriteria;
  weather: WeatherSnapshot;
  travel: TravelEstimate;
  budget: BudgetBreakdown;
}

/** Score météo : température ressentie, ensoleillement, pluie, préférence. */
function weatherScore({ destination, criteria, weather }: ScoreInput): number {
  const target = criteria.minTemperature ?? 21;
  const sun = weather.sunHours ?? 6;

  // Confort thermique : optimum entre la cible et cible + 8 °C.
  let thermal: number;
  if (weather.temperature < target) {
    thermal = clamp(100 - (target - weather.temperature) * 11, 0, 100);
  } else if (weather.temperature > target + 12) {
    // Chaleur excessive : pénalité progressive (canicule = inconfort).
    thermal = clamp(100 - (weather.temperature - target - 12) * 6, 25, 100);
  } else {
    thermal = 100;
  }

  const sunshine = clamp((sun / 11) * 100, 0, 100);
  const dryness = clamp(100 - weather.precipitation * 16, 0, 100);

  let score = thermal * 0.5 + sunshine * 0.3 + dryness * 0.2;

  switch (criteria.weather) {
    case "sunny":
      score = score * 0.55 + sunshine * 0.45;
      break;
    case "dry":
      score = score * 0.6 + dryness * 0.4;
      break;
    case "hot":
      score = score * 0.6 + clamp((weather.temperature / 30) * 100, 0, 100) * 0.4;
      break;
    case "snow":
      // Neige : on privilégie le froid et l'aptitude au ski.
      score =
        clamp(100 - Math.max(0, weather.temperature - 2) * 9, 0, 100) * 0.6 +
        destination.scores.ski * 0.4;
      break;
    default:
      break;
  }

  return clamp(score);
}

/** Score prix : marge par rapport au budget et rapport qualité/prix. */
function priceScore({ criteria, budget, destination }: ScoreInput): number {
  const usage = budget.total / Math.max(1, criteria.maxBudget);
  // 60 % du budget consommé = optimum ; au-delà de 100 % le score s'effondre.
  const affordability =
    usage <= 0.6
      ? 100
      : usage <= 1
        ? 100 - (usage - 0.6) * 125
        : clamp(50 - (usage - 1) * 160, 0, 50);

  // Qualité obtenue pour le prix payé.
  const quality =
    (destination.scores.accommodation + destination.reviewScore * 20) / 2;
  const valueForMoney = clamp(quality / Math.max(0.55, destination.dailyCostIndex) - 20);

  return clamp(affordability * 0.7 + valueForMoney * 0.3);
}

/** Score transport : durée porte-à-porte et escales. */
function transportScore({ criteria, travel }: ScoreInput): number {
  const limit = criteria.maxTravelTime;
  const base = limit
    ? lerpScore(travel.duration, limit * 0.45, limit) * 100
    : // Sans contrainte : 2 h = excellent, 10 h = médiocre.
      lerpScore(travel.duration, 2, 10) * 100;
  const stopsPenalty = travel.stops * 12;
  const trainBonus = travel.mode === "train" ? 6 : 0;
  return clamp(base - stopsPenalty + trainBonus);
}

/** Score hébergement : qualité du parc et compatibilité avec les filtres. */
function accommodationScore({ destination, criteria }: ScoreInput): number {
  let score = destination.scores.accommodation;

  if (criteria.minHotelRating === 5) score = score * 0.82 + destination.scores.romance * 0.18;
  if (criteria.accommodation === "rental") {
    score = score * 0.7 + destination.scores.family * 0.3;
  }
  if (criteria.amenities.includes("beach") && destination.beachDistance !== null) {
    score += 6;
  }
  if (criteria.amenities.includes("spa")) {
    score = score * 0.9 + destination.scores.accommodation * 0.1;
  }
  if (criteria.travelers.children > 0) {
    score = score * 0.75 + destination.scores.family * 0.25;
  }
  return clamp(score);
}

/** Score activités : adéquation avec les types de séjour demandés. */
function activitiesScore({ destination, criteria }: ScoreInput): number {
  if (criteria.stayTypes.length === 0) {
    const values = Object.values(destination.scores);
    // Sans préférence : richesse générale de l'offre.
    return clamp(values.reduce((a, b) => a + b, 0) / values.length + 8);
  }
  const matches = criteria.stayTypes.map(
    (type) => destination.scores[STAY_TYPE_SCORE[type]],
  );
  const average = matches.reduce((a, b) => a + b, 0) / matches.length;
  const declaredBonus = criteria.stayTypes.filter((t) =>
    destination.stayTypes.includes(t),
  ).length;
  return clamp(average + declaredBonus * 4);
}

/** Score avis : note voyageurs pondérée par le volume d'avis. */
function reviewsScore({ destination }: ScoreInput): number {
  const rating = (destination.reviewScore / 5) * 100;
  // Un faible volume d'avis rapproche la note de la moyenne du marché.
  const confidence = clamp(Math.log10(destination.reviewCount + 1) / 4.6, 0, 1);
  return clamp(rating * confidence + 78 * (1 - confidence));
}

/* -------------------------------------------------------------------------- */
/*                       Score global sur 100 (API publique)                   */
/* -------------------------------------------------------------------------- */

export interface DestinationScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
}

/**
 * Calcule le score de correspondance d'une destination, sur 100.
 *
 * Pondération : météo 25, prix 25, transport 15, hébergement 15,
 * activités 10, avis 10.
 */
export function calculateDestinationScore(input: ScoreInput): DestinationScoreResult {
  const breakdown: ScoreBreakdown = {
    weather: Math.round(weatherScore(input)),
    price: Math.round(priceScore(input)),
    transport: Math.round(transportScore(input)),
    accommodation: Math.round(accommodationScore(input)),
    activities: Math.round(activitiesScore(input)),
    reviews: Math.round(reviewsScore(input)),
  };

  const weighted = (Object.keys(SCORE_WEIGHTS) as (keyof ScoreBreakdown)[]).reduce(
    (sum, key) => sum + (breakdown[key] / 100) * SCORE_WEIGHTS[key],
    0,
  );

  return { score: Math.round(clamp(weighted, 0, 100)), breakdown };
}

/* -------------------------------------------------------------------------- */
/*                                  Badges                                     */
/* -------------------------------------------------------------------------- */

export const badgeLabels: Record<BadgeId, string> = {
  "very-sunny": "Très ensoleillé",
  "great-price": "Excellent prix",
  "family-friendly": "Idéal famille",
  beach: "Plage",
  pool: "Piscine",
  "best-value": "Meilleur rapport qualité/prix",
  "short-trip": "Trajet court",
  romantic: "Romantique",
  culture: "Culture",
  "snow-sure": "Neige assurée",
};

function computeBadges(input: ScoreInput, breakdown: ScoreBreakdown): BadgeId[] {
  const { destination, criteria, weather, travel, budget } = input;
  const badges: BadgeId[] = [];

  if ((weather.sunHours ?? 0) >= 8.5 && weather.precipitation < 1.5) badges.push("very-sunny");
  if (budget.remaining > criteria.maxBudget * 0.25) badges.push("great-price");
  if (destination.scores.family >= 84 && criteria.travelers.children > 0) {
    badges.push("family-friendly");
  }
  if (destination.beachDistance !== null && destination.beachDistance <= 800) {
    badges.push("beach");
  }
  if (destination.scores.accommodation >= 82) badges.push("pool");
  if (breakdown.price >= 78 && breakdown.accommodation >= 78) badges.push("best-value");
  if (travel.duration <= 3) badges.push("short-trip");
  if (destination.scores.romance >= 88 && criteria.travelers.children === 0) {
    badges.push("romantic");
  }
  if (destination.scores.culture >= 92) badges.push("culture");
  if (destination.scores.ski >= 90 && weather.temperature <= 5) badges.push("snow-sure");

  return badges.slice(0, 4);
}

/* -------------------------------------------------------------------------- */
/*                        « Pourquoi cette destination ? »                     */
/* -------------------------------------------------------------------------- */

function buildReason(
  input: ScoreInput,
  breakdown: ScoreBreakdown,
  origin: Origin,
): string {
  const { destination, criteria, weather, travel, budget } = input;
  const parts: string[] = [];

  if (breakdown.weather >= 75) {
    parts.push(
      `une météo favorable (${Math.round(weather.temperature)} °C en moyenne, ${(weather.sunHours ?? 0).toFixed(0)} h de soleil par jour)`,
    );
  } else if (breakdown.weather >= 55) {
    parts.push(`une météo correcte (${Math.round(weather.temperature)} °C)`);
  }

  if (breakdown.transport >= 70) {
    const modeLabel =
      travel.mode === "train" ? "trajet en train" : travel.mode === "car" ? "trajet en voiture" : "vol";
    parts.push(`un ${modeLabel} court depuis ${origin.name} (${formatHours(travel.duration)})`);
  }

  if (budget.remaining > 0) {
    parts.push(
      `un budget total estimé à ${budget.total} € pour ${criteria.travelers.adults + criteria.travelers.children} personne${criteria.travelers.adults + criteria.travelers.children > 1 ? "s" : ""}, soit ${budget.remaining} € sous votre plafond`,
    );
  }

  if (criteria.travelers.children > 0 && destination.scores.family >= 80) {
    parts.push("de nombreux hébergements familiaux avec piscine");
  } else if (criteria.amenities.includes("pool")) {
    parts.push("une large offre d'hébergements avec piscine");
  }

  if (criteria.stayTypes.length > 0) {
    const matched = criteria.stayTypes.filter((t) => destination.stayTypes.includes(t));
    if (matched.length > 0) {
      parts.push(
        `une offre adaptée à un séjour ${matched.map((t) => stayTypeLabels[t].toLowerCase()).join(" et ")}`,
      );
    }
  }

  if (parts.length === 0) {
    return `${destination.name} reste une option intéressante pour votre recherche, même si aucun critère ne ressort nettement.`;
  }

  const quality = breakdown.weather + breakdown.price > 150 ? "très bien" : "bien";
  return `${destination.name} correspond ${quality} à votre recherche grâce à ${joinFr(parts)}.`;
}

function joinFr(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
}

function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*                          Filtres éliminatoires                              */
/* -------------------------------------------------------------------------- */

export type RelaxableFilter =
  | "budget"
  | "temperature"
  | "travelTime"
  | "stayType"
  | "amenities"
  | "hotelRating"
  | "transport";

interface EvaluationContext {
  origin: Origin;
  criteria: SearchCriteria;
}

interface Evaluation {
  recommendation: DestinationRecommendation;
  /** Filtres que cette destination ne respecte pas. */
  violations: RelaxableFilter[];
}

function evaluate(destination: Destination, context: EvaluationContext): Evaluation {
  const { origin, criteria } = context;
  const start = criteria.startDate ?? todayISO();

  const travel = estimateTravel(origin, destination.position, {
    preferred: criteria.transport,
    trainAccessible: destination.trainAccessible,
  });
  const weather = climateForPeriod(destination, start, criteria.nights);
  const budget = estimateBudget(destination, origin, criteria);
  const input: ScoreInput = { destination, criteria, weather, travel, budget };
  const { score, breakdown } = calculateDestinationScore(input);

  const violations: RelaxableFilter[] = [];

  if (budget.total > criteria.maxBudget) violations.push("budget");
  if (criteria.minTemperature !== null && weather.temperature < criteria.minTemperature) {
    violations.push("temperature");
  }
  if (criteria.maxTravelTime !== null && travel.duration > criteria.maxTravelTime) {
    violations.push("travelTime");
  }
  if (criteria.transport !== "any" && travel.mode !== criteria.transport) {
    violations.push("transport");
  }
  if (
    criteria.stayTypes.length > 0 &&
    !criteria.stayTypes.some((type) => destination.stayTypes.includes(type))
  ) {
    violations.push("stayType");
  }
  if (criteria.amenities.includes("beach") && destination.beachDistance === null) {
    violations.push("amenities");
  }
  if (
    criteria.maxBeachDistance !== null &&
    (destination.beachDistance === null ||
      destination.beachDistance > criteria.maxBeachDistance)
  ) {
    violations.push("amenities");
  }
  if (criteria.weather === "snow" && destination.scores.ski < 40) {
    violations.push("temperature");
  }

  const horizon = daysFromNow(start);
  const kind = horizon >= 0 && horizon <= FORECAST_HORIZON_DAYS ? "forecast" : "climate";

  const recommendation: DestinationRecommendation = {
    destination,
    score,
    breakdown,
    badges: computeBadges(input, breakdown),
    budget,
    weather: {
      temperature: weather.temperature,
      condition: weather.condition,
      sunHours: weather.sunHours ?? 0,
      precipitation: weather.precipitation,
      kind,
    },
    travel: {
      duration: travel.duration,
      mode: travel.mode,
      distance: travel.distance,
    },
    reason: buildReason(input, breakdown, origin),
    highlights: destination.highlights,
  };

  return { recommendation, violations };
}

/* -------------------------------------------------------------------------- */
/*                              API publique                                   */
/* -------------------------------------------------------------------------- */

/**
 * Filtre les destinations incompatibles avec les critères, puis classe
 * les destinations restantes par score décroissant.
 */
export function recommendDestinations(
  criteria: SearchCriteria,
  pool: Destination[] = allDestinations,
): DestinationRecommendation[] {
  const origin = getOrigin(criteria.origin) ?? defaultOrigin;
  const context: EvaluationContext = { origin, criteria};

  const candidates = criteria.destination
    ? pool.filter((d) => d.slug === criteria.destination)
    : pool;

  return candidates
    .map((destination) => evaluate(destination, context))
    .filter((result) => result.violations.length === 0)
    .map((result) => result.recommendation)
    .sort((a, b) => b.score - a.score);
}

export interface SearchOutcome {
  recommendations: DestinationRecommendation[];
  /** Filtres qui ont dû être assouplis pour obtenir des résultats. */
  relaxed: RelaxableFilter[];
  /** Nombre de destinations écartées par les filtres éliminatoires. */
  excluded: number;
}

export const relaxationLabels: Record<RelaxableFilter, string> = {
  budget: "budget maximum",
  temperature: "température minimale",
  travelTime: "durée de trajet",
  stayType: "type de séjour",
  amenities: "équipements",
  hotelRating: "classement hôtelier",
  transport: "mode de transport",
};

/**
 * Recherche « tolérante » utilisée par l'interface : si aucune destination
 * ne satisfait tous les critères, on assouplit les contraintes une à une,
 * dans l'ordre inverse de leur importance, en informant l'utilisateur.
 */
export function searchDestinations(
  criteria: SearchCriteria,
  pool: Destination[] = allDestinations,
): SearchOutcome {
  const origin = getOrigin(criteria.origin) ?? defaultOrigin;
  const candidates = criteria.destination
    ? pool.filter((d) => d.slug === criteria.destination)
    : pool;

  const evaluations = candidates.map((destination) =>
    evaluate(destination, { origin, criteria}),
  );

  const strict = evaluations.filter((e) => e.violations.length === 0);
  if (strict.length > 0) {
    return {
      recommendations: strict
        .map((e) => e.recommendation)
        .sort((a, b) => b.score - a.score),
      relaxed: [],
      excluded: evaluations.length - strict.length,
    };
  }

  // Ordre d'assouplissement : du critère le plus secondaire au plus structurant.
  const order: RelaxableFilter[] = [
    "amenities",
    "stayType",
    "transport",
    "travelTime",
    "temperature",
    "budget",
  ];
  const relaxed: RelaxableFilter[] = [];

  for (const filter of order) {
    relaxed.push(filter);
    const matching = evaluations.filter((e) =>
      e.violations.every((violation) => relaxed.includes(violation)),
    );
    if (matching.length > 0) {
      return {
        recommendations: matching
          .map((e) => e.recommendation)
          .sort((a, b) => b.score - a.score),
        relaxed: [...relaxed],
        excluded: evaluations.length - matching.length,
      };
    }
  }

  return {
    recommendations: evaluations
      .map((e) => e.recommendation)
      .sort((a, b) => b.score - a.score),
    relaxed: order,
    excluded: 0,
  };
}

/**
 * Alternatives proches d'une destination : même profil, score comparable.
 */
export function findAlternatives(
  destination: Destination,
  criteria: SearchCriteria,
  limit = 4,
): DestinationRecommendation[] {
  const origin = getOrigin(criteria.origin) ?? defaultOrigin;
  return allDestinations
    .filter((d) => d.slug !== destination.slug)
    .map((d) => evaluate(d, { origin, criteria}).recommendation)
    .filter((rec) =>
      rec.destination.stayTypes.some((type) => destination.stayTypes.includes(type)),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Évaluation d'une destination unique (page fiche destination). */
export function evaluateDestination(
  destination: Destination,
  criteria: SearchCriteria,
): DestinationRecommendation {
  const origin = getOrigin(criteria.origin) ?? defaultOrigin;
  return evaluate(destination, { origin, criteria}).recommendation;
}
