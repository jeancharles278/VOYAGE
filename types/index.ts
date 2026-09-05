/**
 * Types partagés de l'application VOYAGE.
 * Toute la logique métier (moteur de recommandation, providers) s'appuie
 * exclusivement sur ces contrats : les composants UI ne manipulent jamais
 * de structures ad-hoc.
 */

/* -------------------------------------------------------------------------- */
/*                                 Géographie                                  */
/* -------------------------------------------------------------------------- */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type TransportMode = "plane" | "train" | "car" | "any";

export type StayType =
  | "beach"
  | "family"
  | "romantic"
  | "luxury"
  | "nature"
  | "city"
  | "culture"
  | "gastronomy"
  | "weekend"
  | "roadtrip"
  | "ski"
  | "themepark";

export type AccommodationType = "hotel" | "rental" | "resort" | "any";

export type WeatherPreference = "sunny" | "dry" | "hot" | "snow" | "any";

export type Amenity =
  | "pool"
  | "spa"
  | "beach"
  | "breakfast"
  | "allInclusive"
  | "parking"
  | "airConditioning";

export type MealPlan =
  | "none"
  | "breakfast"
  | "halfBoard"
  | "fullBoard"
  | "allInclusive";

/* -------------------------------------------------------------------------- */
/*                              Critères de recherche                          */
/* -------------------------------------------------------------------------- */

export interface Travelers {
  adults: number;
  children: number;
  /** Âge de chaque enfant, même longueur que `children`. */
  childrenAges: number[];
}

export interface SearchCriteria {
  /** Ville de départ (slug d'un `Origin`). */
  origin: string;
  /** Destination souhaitée (slug). Vide = "je ne sais pas où partir". */
  destination?: string;
  startDate?: string; // ISO yyyy-mm-dd
  endDate?: string; // ISO yyyy-mm-dd
  nights: number;
  travelers: Travelers;
  /** Budget total maximum, toutes personnes comprises, en EUR. */
  maxBudget: number;
  /** Durée de trajet maximale en heures. `null` = indifférent. */
  maxTravelTime: number | null;
  /** Température minimale souhaitée en °C. `null` = indifférent. */
  minTemperature: number | null;
  weather: WeatherPreference;
  transport: TransportMode;
  accommodation: AccommodationType;
  /** Classement hôtelier minimum (3, 4 ou 5). `null` = indifférent. */
  minHotelRating: number | null;
  amenities: Amenity[];
  mealPlan: MealPlan;
  stayTypes: StayType[];
  /** Distance maximale à la plage en mètres. `null` = indifférent. */
  maxBeachDistance: number | null;
}

/* -------------------------------------------------------------------------- */
/*                                 Destinations                                */
/* -------------------------------------------------------------------------- */

/** Moyennes mensuelles, index 0 = janvier. */
export interface MonthlyClimate {
  /** Température maximale moyenne (°C). */
  avgHigh: number[];
  /** Température minimale moyenne (°C). */
  avgLow: number[];
  /** Précipitations moyennes (mm). */
  precipitation: number[];
  /** Ensoleillement quotidien moyen (heures). */
  sunHours: number[];
  /** Température moyenne de la mer (°C), optionnelle. */
  seaTemperature?: number[];
}

export interface DestinationScores {
  beach: number;
  family: number;
  culture: number;
  gastronomy: number;
  nature: number;
  nightlife: number;
  ski: number;
  romance: number;
  /** Qualité moyenne du parc hôtelier (0-100). */
  accommodation: number;
}

export interface PointOfInterest {
  id: string;
  name: string;
  category:
    | "hotel"
    | "beach"
    | "center"
    | "restaurant"
    | "activity"
    | "airport";
  position: GeoPoint;
  description?: string;
}

export interface Destination {
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  position: GeoPoint;
  /** Code IATA de l'aéroport principal. */
  airport: string;
  image: string;
  gallery?: string[];
  tagline: string;
  description: string;
  climate: MonthlyClimate;
  scores: DestinationScores;
  /** Prix moyen A/R par adulte depuis l'Europe de l'Ouest (EUR). */
  avgFlightPrice: number;
  /** Prix moyen d'une nuit en hôtel 4* pour 2 personnes (EUR). */
  avgHotelPricePerNight: number;
  /** Prix moyen d'une nuit en location pour 4 personnes (EUR). */
  avgRentalPricePerNight: number;
  /** Indice de coût sur place (1 = moyenne européenne). */
  dailyCostIndex: number;
  /** Durée de vol moyenne depuis l'Europe de l'Ouest (heures). */
  avgFlightDuration: number;
  /** Note voyageurs sur 5. */
  reviewScore: number;
  reviewCount: number;
  stayTypes: StayType[];
  /** Distance moyenne hôtel <-> plage (m). `null` si pas de plage. */
  beachDistance: number | null;
  trainAccessible: boolean;
  poi: PointOfInterest[];
  highlights: string[];
  activities: Activity[];
}

export interface Activity {
  name: string;
  category: string;
  price: number;
  duration: string;
  description: string;
}

/* -------------------------------------------------------------------------- */
/*                            Villes de départ                                 */
/* -------------------------------------------------------------------------- */

export interface Origin {
  slug: string;
  name: string;
  country: string;
  position: GeoPoint;
  airport: string;
  /** Multiplicateur de prix des vols au départ de cette ville. */
  priceFactor: number;
}

/* -------------------------------------------------------------------------- */
/*                       Contrat commun des providers                          */
/* -------------------------------------------------------------------------- */

export interface TravelOffer {
  id: string;
  provider: string;
  type: "hotel" | "flight" | "rental";
  name: string;
  price: number;
  currency: string;
  taxesIncluded: boolean;
  rating?: number;
  reviewCount?: number;
  bookingUrl?: string;
}

export interface HotelOffer extends TravelOffer {
  type: "hotel";
  /** Classement hôtelier 1-5. */
  stars: number;
  image: string;
  address: string;
  position: GeoPoint;
  distanceToBeach: number | null;
  distanceToCenter: number;
  amenities: Amenity[];
  mealPlan: MealPlan;
  freeCancellation: boolean;
  /** Prix par nuit avant total. */
  pricePerNight: number;
  /** Comparatif multi-agences. */
  rates: HotelRate[];
}

export interface HotelRate {
  agency: string;
  price: number;
  currency: string;
  freeCancellation: boolean;
  mealPlan: MealPlan;
  bookingUrl?: string;
}

export interface RentalOffer extends TravelOffer {
  type: "rental";
  image: string;
  bedrooms: number;
  capacity: number;
  surface: number;
  position: GeoPoint;
  amenities: Amenity[];
  pricePerNight: number;
  distanceToBeach: number | null;
}

export interface FlightOffer extends TravelOffer {
  type: "flight";
  originAirport: string;
  destinationAirport: string;
  /** Durée totale en heures. */
  duration: number;
  stops: number;
  airline: string;
  mode: Exclude<TransportMode, "any">;
  departureTime?: string;
  returnTime?: string;
}

/* -------------------------------------------------------------------------- */
/*                                    Météo                                    */
/* -------------------------------------------------------------------------- */

export type WeatherCondition =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "storm"
  | "snow";

export interface WeatherSnapshot {
  date: string; // ISO yyyy-mm-dd
  temperature: number;
  feelsLike: number;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  condition: WeatherCondition;
  /** Ensoleillement quotidien (heures). */
  sunHours?: number;
}

/**
 * `forecast` : prévision réelle (horizon <= 14 jours).
 * `climate`  : tendance climatique historique — jamais présentée comme
 *              une prévision.
 */
export type WeatherKind = "forecast" | "climate";

export interface WeatherReport {
  kind: WeatherKind;
  provider: string;
  destination: string;
  /** Libellé affiché à l'utilisateur ("Prévision à 5 jours", ...). */
  label: string;
  summary: WeatherSnapshot;
  daily: WeatherSnapshot[];
  /** Température moyenne de la mer si disponible. */
  seaTemperature?: number;
}

/* -------------------------------------------------------------------------- */
/*                              Recommandations                                */
/* -------------------------------------------------------------------------- */

export interface ScoreBreakdown {
  weather: number;
  price: number;
  transport: number;
  accommodation: number;
  activities: number;
  reviews: number;
}

export interface BudgetBreakdown {
  transport: number;
  accommodation: number;
  onSite: number;
  total: number;
  perPerson: number;
  currency: string;
  /** Marge restante par rapport au budget maximum. */
  remaining: number;
}

export type BadgeId =
  | "very-sunny"
  | "great-price"
  | "family-friendly"
  | "beach"
  | "pool"
  | "best-value"
  | "short-trip"
  | "romantic"
  | "culture"
  | "snow-sure";

export interface DestinationRecommendation {
  destination: Destination;
  /** Score global sur 100. */
  score: number;
  breakdown: ScoreBreakdown;
  badges: BadgeId[];
  budget: BudgetBreakdown;
  /** Météo attendue pour la période demandée. */
  weather: {
    temperature: number;
    condition: WeatherCondition;
    sunHours: number;
    precipitation: number;
    kind: WeatherKind;
  };
  travel: {
    duration: number;
    mode: Exclude<TransportMode, "any">;
    distance: number;
  };
  /** Explication en langage naturel : « Pourquoi cette destination ? ». */
  reason: string;
  highlights: string[];
}

/* -------------------------------------------------------------------------- */
/*                        Parsing en langage naturel                           */
/* -------------------------------------------------------------------------- */

export interface ParsedQuery {
  criteria: Partial<SearchCriteria>;
  /** Champs effectivement reconnus, pour retour visuel à l'utilisateur. */
  matched: string[];
  confidence: number;
  provider: string;
}
