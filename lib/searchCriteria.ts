import type {
  AccommodationType,
  Amenity,
  MealPlan,
  SearchCriteria,
  StayType,
  TransportMode,
  WeatherPreference,
} from "@/types";
import { addDays, daysBetween, todayISO } from "@/lib/utils";

const AMENITIES: Amenity[] = [
  "pool",
  "spa",
  "beach",
  "breakfast",
  "allInclusive",
  "parking",
  "airConditioning",
];

const STAY_TYPES: StayType[] = [
  "beach",
  "family",
  "romantic",
  "luxury",
  "nature",
  "city",
  "culture",
  "gastronomy",
  "weekend",
  "roadtrip",
  "ski",
  "themepark",
];

const TRANSPORTS: TransportMode[] = ["plane", "train", "car", "any"];
const ACCOMMODATIONS: AccommodationType[] = ["hotel", "rental", "resort", "any"];
const WEATHERS: WeatherPreference[] = ["sunny", "dry", "hot", "snow", "any"];
const MEAL_PLANS: MealPlan[] = [
  "none",
  "breakfast",
  "halfBoard",
  "fullBoard",
  "allInclusive",
];

export const weatherLabels: Record<WeatherPreference, string> = {
  sunny: "Soleil",
  dry: "Peu de pluie",
  hot: "Chaud",
  snow: "Neige",
  any: "Indifférent",
};

export const transportLabels: Record<TransportMode, string> = {
  plane: "Avion",
  train: "Train",
  car: "Voiture",
  any: "Indifférent",
};

export const accommodationLabels: Record<AccommodationType, string> = {
  hotel: "Hôtel",
  rental: "Location",
  resort: "Resort",
  any: "Indifférent",
};

/** Critères par défaut : départ dans un mois, une semaine, 2 adultes. */
export function defaultCriteria(): SearchCriteria {
  const startDate = addDays(todayISO(), 30);
  return {
    origin: "luxembourg",
    destination: undefined,
    startDate,
    endDate: addDays(startDate, 7),
    nights: 7,
    travelers: { adults: 2, children: 0, childrenAges: [] },
    maxBudget: 2500,
    maxTravelTime: null,
    minTemperature: null,
    weather: "any",
    transport: "any",
    accommodation: "any",
    minHotelRating: null,
    amenities: [],
    mealPlan: "none",
    stayTypes: [],
    maxBeachDistance: null,
  };
}

function num(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNum(value: string | null): number | null {
  if (value === null || value === "" || value === "any") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function oneOf<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function manyOf<T extends string>(value: string | null, allowed: T[]): T[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is T => allowed.includes(v as T));
}

/** Reconstruit des critères complets depuis l'URL (source de vérité). */
export function criteriaFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): SearchCriteria {
  const sp =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params).flatMap(([key, value]) =>
            value === undefined
              ? []
              : Array.isArray(value)
                ? value.map((v) => [key, v] as [string, string])
                : [[key, value] as [string, string]],
          ),
        );

  const base = defaultCriteria();
  const startDate = sp.get("start") ?? base.startDate!;
  const endDate = sp.get("end") ?? base.endDate!;
  const nights = Math.max(1, daysBetween(startDate, endDate) || base.nights);
  const childrenAges = manyAges(sp.get("ages"));
  const children = childrenAges.length || Math.max(0, num(sp.get("children"), 0));

  return {
    origin: sp.get("origin") ?? base.origin,
    destination: sp.get("destination") || undefined,
    startDate,
    endDate,
    nights,
    travelers: {
      adults: Math.max(1, num(sp.get("adults"), base.travelers.adults)),
      children,
      childrenAges:
        childrenAges.length === children
          ? childrenAges
          : Array.from({ length: children }, (_, i) => childrenAges[i] ?? 8),
    },
    maxBudget: Math.max(100, num(sp.get("budget"), base.maxBudget)),
    maxTravelTime: nullableNum(sp.get("maxTravel")),
    minTemperature: nullableNum(sp.get("minTemp")),
    weather: oneOf(sp.get("weather"), WEATHERS, "any"),
    transport: oneOf(sp.get("transport"), TRANSPORTS, "any"),
    accommodation: oneOf(sp.get("stay"), ACCOMMODATIONS, "any"),
    minHotelRating: nullableNum(sp.get("stars")),
    amenities: manyOf(sp.get("amenities"), AMENITIES),
    mealPlan: oneOf(sp.get("meal"), MEAL_PLANS, "none"),
    stayTypes: manyOf(sp.get("types"), STAY_TYPES),
    maxBeachDistance: nullableNum(sp.get("beach")),
  };
}

function manyAges(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 17);
}

/** Sérialise les critères en query string stable (sans valeurs par défaut). */
export function criteriaToSearchParams(criteria: SearchCriteria): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("origin", criteria.origin);
  if (criteria.destination) sp.set("destination", criteria.destination);
  if (criteria.startDate) sp.set("start", criteria.startDate);
  if (criteria.endDate) sp.set("end", criteria.endDate);
  sp.set("adults", String(criteria.travelers.adults));
  if (criteria.travelers.children > 0) {
    sp.set("children", String(criteria.travelers.children));
    sp.set("ages", criteria.travelers.childrenAges.join(","));
  }
  sp.set("budget", String(criteria.maxBudget));
  if (criteria.maxTravelTime !== null) sp.set("maxTravel", String(criteria.maxTravelTime));
  if (criteria.minTemperature !== null) sp.set("minTemp", String(criteria.minTemperature));
  if (criteria.weather !== "any") sp.set("weather", criteria.weather);
  if (criteria.transport !== "any") sp.set("transport", criteria.transport);
  if (criteria.accommodation !== "any") sp.set("stay", criteria.accommodation);
  if (criteria.minHotelRating !== null) sp.set("stars", String(criteria.minHotelRating));
  if (criteria.amenities.length) sp.set("amenities", criteria.amenities.join(","));
  if (criteria.mealPlan !== "none") sp.set("meal", criteria.mealPlan);
  if (criteria.stayTypes.length) sp.set("types", criteria.stayTypes.join(","));
  if (criteria.maxBeachDistance !== null) sp.set("beach", String(criteria.maxBeachDistance));
  return sp;
}

export function searchUrl(criteria: SearchCriteria): string {
  return `/search?${criteriaToSearchParams(criteria).toString()}`;
}

/** Nombre de filtres avancés actifs (badge sur le bouton « Filtres »). */
export function countActiveFilters(criteria: SearchCriteria): number {
  let count = 0;
  if (criteria.minTemperature !== null) count++;
  if (criteria.weather !== "any") count++;
  if (criteria.maxTravelTime !== null) count++;
  if (criteria.transport !== "any") count++;
  if (criteria.accommodation !== "any") count++;
  if (criteria.minHotelRating !== null) count++;
  if (criteria.mealPlan !== "none") count++;
  if (criteria.maxBeachDistance !== null) count++;
  count += criteria.amenities.length;
  count += criteria.stayTypes.length;
  return count;
}
