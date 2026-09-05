import type { GeoPoint, Origin, TransportMode } from "@/types";

const EARTH_RADIUS_KM = 6371;

/** Distance orthodromique en kilomètres. */
export function haversine(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface TravelEstimate {
  mode: Exclude<TransportMode, "any">;
  /** Durée porte-à-porte estimée, en heures. */
  duration: number;
  /** Durée du seul trajet (vol, roulage), en heures. */
  transitTime: number;
  distance: number;
  stops: number;
}

/** Vitesse moyenne et temps fixes par mode de transport. */
const MODE_PROFILE: Record<
  Exclude<TransportMode, "any">,
  { speed: number; fixedTime: number; maxDistance: number }
> = {
  // Temps de vol commercial : roulage et attente au point d'arrêt inclus.
  plane: { speed: 750, fixedTime: 0.6, maxDistance: 8000 },
  // Grandes lignes européennes, marge d'accès au quai incluse.
  train: { speed: 165, fixedTime: 0.5, maxDistance: 1600 },
  // Autoroute européenne, pauses incluses.
  car: { speed: 90, fixedTime: 0.3, maxDistance: 2200 },
};

/**
 * Estime le trajet entre une ville de départ et un point d'arrivée.
 * `preferred` force un mode ; sinon on retient le mode le plus rapide
 * réellement disponible (le train n'est proposé que si la destination
 * est desservie).
 */
export function estimateTravel(
  origin: Origin,
  target: GeoPoint,
  options: { preferred?: TransportMode; trainAccessible?: boolean } = {},
): TravelEstimate {
  const distance = haversine(origin.position, target);
  const { preferred = "any", trainAccessible = false } = options;

  const candidates: Exclude<TransportMode, "any">[] =
    preferred === "any" ? ["plane", "train", "car"] : [preferred];

  const estimates = candidates
    .filter((mode) => {
      if (mode === "train" && !trainAccessible) return false;
      return distance <= MODE_PROFILE[mode].maxDistance;
    })
    .map((mode) => {
      const profile = MODE_PROFILE[mode];
      // Le trajet réel est plus long que la distance à vol d'oiseau.
      const detour = mode === "plane" ? 1.06 : 1.28;
      const transitTime = (distance * detour) / profile.speed;
      const stops = mode === "plane" && distance > 3500 ? 1 : 0;
      return {
        mode,
        distance: Math.round(distance),
        transitTime: +transitTime.toFixed(2),
        duration: +(transitTime + profile.fixedTime + stops * 1.1).toFixed(2),
        stops,
      } satisfies TravelEstimate;
    });

  if (estimates.length === 0) {
    // Repli : vol long-courrier même si le mode demandé est impossible.
    const profile = MODE_PROFILE.plane;
    const transitTime = (distance * 1.06) / profile.speed;
    return {
      mode: "plane",
      distance: Math.round(distance),
      transitTime: +transitTime.toFixed(2),
      duration: +(transitTime + profile.fixedTime + 1.1).toFixed(2),
      stops: 1,
    };
  }

  return estimates.sort((a, b) => a.duration - b.duration)[0];
}

/** Convertit une position géographique en coordonnées écran (projection Mercator). */
export function projectMercator(point: GeoPoint): { x: number; y: number } {
  const x = (point.lng + 180) / 360;
  const latRad = (point.lat * Math.PI) / 180;
  const y =
    0.5 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / (2 * Math.PI);
  return { x, y };
}
