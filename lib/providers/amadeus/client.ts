import { createCache, type Cache } from "@/lib/cache";

/**
 * Client HTTP Amadeus : authentification OAuth2, limitation de débit,
 * reprise sur erreur et transport injectable.
 *
 * Le transport (`fetchImpl`) est injectable pour deux raisons : rejouer des
 * réponses enregistrées sans identifiants (mode `fixtures`), et tester les
 * mappings sans réseau.
 */

const BASE_URLS = {
  test: "https://test.api.amadeus.com",
  production: "https://api.amadeus.com",
} as const;

export type AmadeusEnvironment = keyof typeof BASE_URLS;

export interface AmadeusConfig {
  clientId: string;
  clientSecret: string;
  /** `test` par défaut : l'environnement bac à sable d'Amadeus. */
  environment?: AmadeusEnvironment;
  /** Transport HTTP. Par défaut : `fetch` global. */
  fetchImpl?: typeof fetch;
  /** Intervalle minimum entre deux appels (10 req/s en environnement test). */
  minIntervalMs?: number;
  maxRetries?: number;
  cache?: Cache;
}

export class AmadeusError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "AmadeusError";
  }

  /** Une erreur transitoire mérite une nouvelle tentative. */
  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AmadeusErrorBody {
  errors?: Array<{ status?: number; code?: number; title?: string; detail?: string }>;
}

export interface AmadeusClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  /** Expose le cache pour les providers qui l'utilisent. */
  readonly cache: Cache;
  readonly environment: AmadeusEnvironment;
}

export function createAmadeusClient(config: AmadeusConfig): AmadeusClient {
  const environment = config.environment ?? "test";
  const baseUrl = BASE_URLS[environment];
  const doFetch = config.fetchImpl ?? fetch;
  const minIntervalMs = config.minIntervalMs ?? 110;
  const maxRetries = config.maxRetries ?? 3;
  const cache =
    config.cache ?? createCache({ namespace: "amadeus", ttlMs: 20 * 60_000 });

  /** Jeton courant, conservé en mémoire jusqu'à 30 s avant son expiration. */
  let token: { value: string; expiresAt: number } | null = null;
  let tokenRequest: Promise<string> | null = null;

  /** File d'attente sérialisant les appels pour respecter le quota. */
  let nextSlot = 0;

  async function throttle(): Promise<void> {
    const now = Date.now();
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + minIntervalMs;
    const wait = slot - now;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  }

  async function getToken(): Promise<string> {
    if (token && token.expiresAt > Date.now()) return token.value;
    // Une seule demande de jeton, même si dix requêtes la réclament ensemble.
    if (tokenRequest) return tokenRequest;

    tokenRequest = (async () => {
      const response = await doFetch(`${baseUrl}/v1/security/oauth2/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        const isCredentialProblem = response.status === 400 || response.status === 401;
        throw new AmadeusError(
          isCredentialProblem
            ? "Authentification Amadeus refusée : vérifiez AMADEUS_CLIENT_ID et AMADEUS_CLIENT_SECRET."
            : `Amadeus ${response.status} lors de la demande de jeton.`,
          response.status,
        );
      }

      const payload = (await response.json()) as TokenResponse;
      token = {
        value: payload.access_token,
        // Marge de 30 s pour ne jamais présenter un jeton expiré.
        expiresAt: Date.now() + Math.max(0, payload.expires_in - 30) * 1000,
      };
      return token.value;
    })().finally(() => {
      tokenRequest = null;
    });

    return tokenRequest;
  }

  async function request<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
    attempt = 0,
  ): Promise<T> {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }

    await throttle();
    const accessToken = await getToken();
    const response = await doFetch(url.toString(), {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });

    if (response.ok) return (await response.json()) as T;

    // Jeton révoqué ou expiré côté serveur : on le jette et on réessaie une fois.
    if (response.status === 401 && attempt === 0) {
      token = null;
      return request<T>(path, params, attempt + 1);
    }

    const error = await toAmadeusError(response, path);
    if (error.isRetryable && attempt < maxRetries) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : // Exponentiel avec gigue, pour ne pas resynchroniser les clients.
          2 ** attempt * 500 + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return request<T>(path, params, attempt + 1);
    }

    throw error;
  }

  return {
    get: request,
    cache,
    environment,
  };
}

async function toAmadeusError(response: Response, path: string): Promise<AmadeusError> {
  let detail: string | undefined;
  let code: number | undefined;
  try {
    const body = (await response.json()) as AmadeusErrorBody;
    const first = body.errors?.[0];
    detail = first?.detail ?? first?.title;
    code = first?.code;
  } catch {
    // Corps non JSON : on garde le statut seul.
  }
  return new AmadeusError(
    `Amadeus ${response.status} sur ${path}${detail ? ` — ${detail}` : ""}`,
    response.status,
    code,
    detail,
  );
}

/* -------------------------------------------------------------------------- */
/*                              Utilitaires                                    */
/* -------------------------------------------------------------------------- */

/**
 * Convertit une durée ISO 8601 (`PT2H10M`) en heures décimales.
 * Renvoie 0 si le format est inattendu, jamais NaN.
 */
export function parseIsoDuration(value: string | undefined): number {
  if (!value) return 0;
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 24 +
    Number(hours ?? 0) +
    Number(minutes ?? 0) / 60 +
    Number(seconds ?? 0) / 3600
  );
}

/** `2026-07-11T09:45:00` → `09:45`. */
export function timeFromIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = /T(\d{2}:\d{2})/.exec(value);
  return match?.[1];
}
