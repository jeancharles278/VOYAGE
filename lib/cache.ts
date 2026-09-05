/**
 * Cache TTL avec déduplication des requêtes en vol.
 *
 * Pourquoi c'est indispensable ici : une recherche interroge jusqu'à 35
 * destinations. Sans cache, brancher une API facturée à l'appel (Amadeus,
 * Booking…) multiplierait le coût et la latence par 35. Sans déduplication,
 * deux utilisateurs cherchant la même destination au même instant
 * déclencheraient deux appels identiques.
 *
 * Le store est enfichable : la mémoire du processus suffit en local et sur
 * une instance unique ; en production multi-instances, remplacer par Redis
 * (voir `createRedisStore` dans le README).
 */

export interface CacheStore {
  get<T>(key: string): Promise<CacheEntry<T> | undefined>;
  set<T>(key: string, value: T, expiresAt: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  /** Appels évités parce qu'une requête identique était déjà en vol. */
  coalesced: number;
  errors: number;
  entries: number;
}

/* -------------------------------------------------------------------------- */
/*                            Store en mémoire (LRU)                           */
/* -------------------------------------------------------------------------- */

/**
 * Store LRU en mémoire. `Map` conserve l'ordre d'insertion : réinsérer une
 * clé lue la place en fin de file, la première clé est donc la plus ancienne.
 *
 * `now` doit être la même horloge que celle du cache qui l'utilise : sinon
 * les entrées seraient écrites avec une horloge et expirées avec une autre.
 */
export function createMemoryStore(
  maxEntries = 500,
  now: () => number = () => Date.now(),
): CacheStore {
  const entries = new Map<string, CacheEntry<unknown>>();

  return {
    async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
      const entry = entries.get(key) as CacheEntry<T> | undefined;
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      // Marque l'entrée comme récemment utilisée.
      entries.delete(key);
      entries.set(key, entry);
      return entry;
    },
    async set<T>(key: string, value: T, expiresAt: number): Promise<void> {
      if (entries.has(key)) entries.delete(key);
      entries.set(key, { value, expiresAt });
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next();
        if (oldest.done) break;
        entries.delete(oldest.value);
      }
    },
    async delete(key: string): Promise<void> {
      entries.delete(key);
    },
    async clear(): Promise<void> {
      entries.clear();
    },
    size() {
      return entries.size;
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Cache                                     */
/* -------------------------------------------------------------------------- */

export interface CacheOptions {
  /** Préfixe des clés, pour cloisonner les domaines. */
  namespace: string;
  /** Durée de vie par défaut, en millisecondes. */
  ttlMs: number;
  /**
   * Store personnalisé (Redis…). Attention : il gère alors sa propre
   * horloge, `now` ne s'applique qu'aux dates d'expiration écrites.
   */
  store?: CacheStore;
  /** Horloge injectable (tests). */
  now?: () => number;
}

export interface Cache {
  /**
   * Retourne la valeur en cache, sinon exécute `produce` et mémorise le
   * résultat. Les appels concurrents sur la même clé partagent la même
   * promesse : une seule requête part réellement.
   */
  wrap<T>(key: string, produce: () => Promise<T>, ttlMs?: number): Promise<T>;
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
  stats(): CacheStats;
}

export function createCache(options: CacheOptions): Cache {
  const now = options.now ?? (() => Date.now());
  // Le store créé ici partage l'horloge du cache ; un store fourni par
  // l'appelant garde la sienne.
  const store = options.store ?? createMemoryStore(500, now);
  const inFlight = new Map<string, Promise<unknown>>();
  const counters = { hits: 0, misses: 0, coalesced: 0, errors: 0 };

  const namespaced = (key: string) => `${options.namespace}:${key}`;

  return {
    async wrap<T>(key: string, produce: () => Promise<T>, ttlMs?: number): Promise<T> {
      const fullKey = namespaced(key);

      const cached = await store.get<T>(fullKey);
      if (cached) {
        counters.hits++;
        return cached.value;
      }

      const pending = inFlight.get(fullKey) as Promise<T> | undefined;
      if (pending) {
        counters.coalesced++;
        return pending;
      }

      counters.misses++;
      const promise = produce()
        .then(async (value) => {
          await store.set(fullKey, value, now() + (ttlMs ?? options.ttlMs));
          return value;
        })
        .catch((error) => {
          // Un échec n'est jamais mémorisé : le prochain appel réessaiera.
          counters.errors++;
          throw error;
        })
        .finally(() => {
          inFlight.delete(fullKey);
        });

      inFlight.set(fullKey, promise);
      return promise;
    },

    async get<T>(key: string): Promise<T | undefined> {
      const entry = await store.get<T>(namespaced(key));
      return entry?.value;
    },

    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
      await store.set(namespaced(key), value, now() + (ttlMs ?? options.ttlMs));
    },

    async invalidate(key: string): Promise<void> {
      await store.delete(namespaced(key));
      inFlight.delete(namespaced(key));
    },

    async clear(): Promise<void> {
      await store.clear();
      inFlight.clear();
    },

    stats(): CacheStats {
      return { ...counters, entries: store.size() };
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                            Clés de cache stables                            */
/* -------------------------------------------------------------------------- */

/**
 * Sérialise des paramètres en clé stable : les propriétés sont triées, donc
 * `{a:1,b:2}` et `{b:2,a:1}` produisent la même clé.
 */
export function cacheKey(parts: Record<string, unknown>): string {
  return Object.keys(parts)
    .sort()
    .filter((key) => parts[key] !== undefined && parts[key] !== null)
    .map((key) => `${key}=${stringify(parts[key])}`)
    .join("|");
}

function stringify(value: unknown): string {
  if (Array.isArray(value)) return value.map(stringify).join(",");
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value !== null) {
    return cacheKey(value as Record<string, unknown>);
  }
  return String(value);
}

/* -------------------------------------------------------------------------- */
/*                        Durées de vie recommandées                           */
/* -------------------------------------------------------------------------- */

export const TTL = {
  /** Jeton OAuth : géré séparément, expiration fournie par le serveur. */
  seconds: (n: number) => n * 1000,
  minutes: (n: number) => n * 60_000,
  hours: (n: number) => n * 3_600_000,
} as const;

/**
 * Durées par domaine. Les prix de vol bougent vite, la liste des hôtels
 * d'une ville très peu.
 */
export const CACHE_TTL = {
  flightOffers: TTL.minutes(20),
  hotelList: TTL.hours(24),
  hotelOffers: TTL.minutes(30),
  hotelRatings: TTL.hours(24),
  weather: TTL.minutes(30),
} as const;
