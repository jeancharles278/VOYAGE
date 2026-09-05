import type { Destination } from "@/types";
import { destinations, getDestination } from "@/data/destinations";
import type { DestinationProvider } from "./types";

/** Normalise une chaîne pour la recherche (accents, casse). */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Catalogue de destinations. Aujourd'hui alimenté par `/data/destinations.ts`,
 * il pourra pointer vers une table Supabase ou un CMS sans modifier
 * les appelants.
 */
export const staticDestinationProvider: DestinationProvider = {
  id: "static",
  label: "Catalogue local",
  live: false,
  async list(): Promise<Destination[]> {
    return destinations;
  },
  async get(slug: string): Promise<Destination | undefined> {
    return getDestination(slug);
  },
  async search(term: string): Promise<Destination[]> {
    const query = normalize(term);
    if (!query) return destinations;
    return destinations.filter((destination) =>
      [destination.name, destination.country, destination.region, ...destination.stayTypes]
        .map(normalize)
        .some((field) => field.includes(query)),
    );
  },
};

export function getDestinationProvider(): DestinationProvider {
  return staticDestinationProvider;
}
