import type {
  Destination,
  FlightOffer,
  HotelOffer,
  Origin,
  RentalOffer,
  SearchCriteria,
  WeatherReport,
} from "@/types";

/**
 * Contrats communs à tous les providers.
 *
 * Chaque provider expose la même interface, qu'il s'agisse d'un jeu de
 * données simulé (MVP) ou d'une véritable API (Amadeus, Booking,
 * OpenWeatherMap...). Les composants UI et le moteur de recommandation ne
 * dépendent que de ces interfaces.
 */

export interface ProviderMeta {
  /** Identifiant technique, ex. "mock" ou "openweathermap". */
  id: string;
  /** Nom affichable. */
  label: string;
  /** `true` si les données proviennent d'une vraie API. */
  live: boolean;
}

export interface WeatherQuery {
  destination: Destination;
  /** Date de début du séjour (ISO). Par défaut : aujourd'hui. */
  startDate?: string;
  nights: number;
}

export interface WeatherProvider extends ProviderMeta {
  getReport(query: WeatherQuery): Promise<WeatherReport>;
}

export interface HotelQuery {
  destination: Destination;
  criteria: SearchCriteria;
}

export interface HotelProvider extends ProviderMeta {
  search(query: HotelQuery): Promise<HotelOffer[]>;
}

export interface RentalProvider extends ProviderMeta {
  search(query: HotelQuery): Promise<RentalOffer[]>;
}

export interface FlightQuery {
  origin: Origin;
  destination: Destination;
  criteria: SearchCriteria;
}

export interface FlightProvider extends ProviderMeta {
  search(query: FlightQuery): Promise<FlightOffer[]>;
}

export interface DestinationProvider extends ProviderMeta {
  list(): Promise<Destination[]>;
  get(slug: string): Promise<Destination | undefined>;
  search(term: string): Promise<Destination[]>;
}
