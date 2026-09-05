import type { Origin } from "@/types";

/**
 * Villes de départ proposées dans le moteur de recherche.
 * `priceFactor` module le prix des vols (hub majeur = moins cher).
 */
export const origins: Origin[] = [
  { slug: "luxembourg", name: "Luxembourg", country: "Luxembourg", position: { lat: 49.6233, lng: 6.2044 }, airport: "LUX", priceFactor: 1.18 },
  { slug: "paris", name: "Paris", country: "France", position: { lat: 48.8566, lng: 2.3522 }, airport: "CDG", priceFactor: 0.95 },
  { slug: "bruxelles", name: "Bruxelles", country: "Belgique", position: { lat: 50.8503, lng: 4.3517 }, airport: "BRU", priceFactor: 1.02 },
  { slug: "lyon", name: "Lyon", country: "France", position: { lat: 45.764, lng: 4.8357 }, airport: "LYS", priceFactor: 1.05 },
  { slug: "marseille", name: "Marseille", country: "France", position: { lat: 43.2965, lng: 5.3698 }, airport: "MRS", priceFactor: 1.03 },
  { slug: "nice", name: "Nice", country: "France", position: { lat: 43.7102, lng: 7.262 }, airport: "NCE", priceFactor: 1.06 },
  { slug: "bordeaux", name: "Bordeaux", country: "France", position: { lat: 44.8378, lng: -0.5792 }, airport: "BOD", priceFactor: 1.04 },
  { slug: "toulouse", name: "Toulouse", country: "France", position: { lat: 43.6047, lng: 1.4442 }, airport: "TLS", priceFactor: 1.05 },
  { slug: "nantes", name: "Nantes", country: "France", position: { lat: 47.2184, lng: -1.5536 }, airport: "NTE", priceFactor: 1.07 },
  { slug: "lille", name: "Lille", country: "France", position: { lat: 50.6292, lng: 3.0573 }, airport: "LIL", priceFactor: 1.1 },
  { slug: "strasbourg", name: "Strasbourg", country: "France", position: { lat: 48.5734, lng: 7.7521 }, airport: "SXB", priceFactor: 1.12 },
  { slug: "geneve", name: "Genève", country: "Suisse", position: { lat: 46.2044, lng: 6.1432 }, airport: "GVA", priceFactor: 1.08 },
  { slug: "zurich", name: "Zurich", country: "Suisse", position: { lat: 47.3769, lng: 8.5417 }, airport: "ZRH", priceFactor: 1.12 },
  { slug: "francfort", name: "Francfort", country: "Allemagne", position: { lat: 50.1109, lng: 8.6821 }, airport: "FRA", priceFactor: 1.0 },
  { slug: "munich", name: "Munich", country: "Allemagne", position: { lat: 48.1351, lng: 11.582 }, airport: "MUC", priceFactor: 1.0 },
  { slug: "berlin", name: "Berlin", country: "Allemagne", position: { lat: 52.52, lng: 13.405 }, airport: "BER", priceFactor: 0.98 },
  { slug: "amsterdam", name: "Amsterdam", country: "Pays-Bas", position: { lat: 52.3676, lng: 4.9041 }, airport: "AMS", priceFactor: 0.96 },
  { slug: "londres", name: "Londres", country: "Royaume-Uni", position: { lat: 51.5072, lng: -0.1276 }, airport: "LHR", priceFactor: 0.94 },
  { slug: "madrid", name: "Madrid", country: "Espagne", position: { lat: 40.4168, lng: -3.7038 }, airport: "MAD", priceFactor: 0.93 },
  { slug: "milan", name: "Milan", country: "Italie", position: { lat: 45.4642, lng: 9.19 }, airport: "MXP", priceFactor: 0.97 },
];

export function getOrigin(slug: string): Origin | undefined {
  return origins.find((o) => o.slug === slug);
}

export const defaultOrigin = origins[0];
