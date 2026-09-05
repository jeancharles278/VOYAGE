/**
 * Formes de réponse de l'API Amadeus, limitées aux champs réellement
 * consommés. Elles reflètent les endpoints suivants :
 *  - GET /v2/shopping/flight-offers
 *  - GET /v1/reference-data/locations/hotels/by-city
 *  - GET /v3/shopping/hotel-offers
 *  - GET /v2/e-reputation/hotel-sentiments
 */

export interface AmadeusSegmentEndpoint {
  iataCode: string;
  terminal?: string;
  at: string;
}

export interface AmadeusSegment {
  departure: AmadeusSegmentEndpoint;
  arrival: AmadeusSegmentEndpoint;
  carrierCode: string;
  number: string;
  operating?: { carrierCode?: string };
  duration?: string;
  numberOfStops?: number;
}

export interface AmadeusItinerary {
  duration: string;
  segments: AmadeusSegment[];
}

export interface AmadeusFlightOffer {
  id: string;
  itineraries: AmadeusItinerary[];
  price: {
    currency: string;
    total: string;
    base?: string;
    grandTotal?: string;
  };
  validatingAirlineCodes?: string[];
  numberOfBookableSeats?: number;
}

export interface AmadeusFlightOffersResponse {
  data: AmadeusFlightOffer[];
  dictionaries?: {
    carriers?: Record<string, string>;
    locations?: Record<string, { cityCode?: string; countryCode?: string }>;
  };
}

export interface AmadeusHotelListEntry {
  hotelId: string;
  name: string;
  chainCode?: string;
  iataCode?: string;
  geoCode?: { latitude: number; longitude: number };
  address?: { countryCode?: string };
  distance?: { value: number; unit: string };
  /** Classement en étoiles — absent de la plupart des réponses. */
  rating?: number | string;
}

export interface AmadeusHotelListResponse {
  data: AmadeusHotelListEntry[];
}

export interface AmadeusHotelRoomOffer {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  rateCode?: string;
  rateFamilyEstimated?: { code?: string; type?: string };
  room?: {
    type?: string;
    typeEstimated?: { category?: string; beds?: number; bedType?: string };
    description?: { text?: string; lang?: string };
  };
  guests?: { adults?: number };
  boardType?: string;
  price: {
    currency: string;
    base?: string;
    total: string;
    variations?: { average?: { base?: string } };
  };
  policies?: {
    cancellations?: Array<{ deadline?: string; amount?: string; type?: string }>;
    paymentType?: string;
  };
  self?: string;
}

export interface AmadeusHotelOfferEntry {
  hotel: {
    hotelId: string;
    name: string;
    chainCode?: string;
    cityCode?: string;
    latitude?: number;
    longitude?: number;
  };
  available: boolean;
  offers: AmadeusHotelRoomOffer[];
}

export interface AmadeusHotelOffersResponse {
  data: AmadeusHotelOfferEntry[];
}

export interface AmadeusHotelSentiment {
  hotelId: string;
  overallRating: number;
  numberOfReviews: number;
  numberOfRatings?: number;
}

export interface AmadeusHotelSentimentsResponse {
  data: AmadeusHotelSentiment[];
}
