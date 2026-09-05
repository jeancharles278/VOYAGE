import type { WeatherReport, WeatherSnapshot } from "@/types";
import {
  FORECAST_HORIZON_DAYS,
  climateSeries,
  deriveCondition,
  seaTemperatureForDate,
} from "@/lib/climate";
import { daysFromNow, todayISO } from "@/lib/utils";
import type { WeatherProvider, WeatherQuery } from "./types";

/* -------------------------------------------------------------------------- */
/*                            Provider simulé (MVP)                            */
/* -------------------------------------------------------------------------- */

/**
 * Construit un rapport à partir des normales climatiques mensuelles.
 * Deux régimes possibles :
 *  - `forecast` si le séjour démarre dans moins de 14 jours ;
 *  - `climate`  au-delà : on annonce explicitement une tendance historique
 *    plutôt qu'une fausse prévision à long terme.
 */
export const mockWeatherProvider: WeatherProvider = {
  id: "mock",
  label: "Normales climatiques (simulé)",
  live: false,
  async getReport({ destination, startDate, nights }: WeatherQuery): Promise<WeatherReport> {
    const start = startDate ?? todayISO();
    const horizon = daysFromNow(start);
    const isForecast = horizon >= 0 && horizon <= FORECAST_HORIZON_DAYS;
    const days = Math.min(Math.max(nights, 1) + 1, 10);
    const daily = climateSeries(destination, start, days);

    return buildReport({
      kind: isForecast ? "forecast" : "climate",
      provider: mockWeatherProvider.label,
      destination: destination.slug,
      daily,
      seaTemperature: seaTemperatureForDate(destination.climate, start),
      isForecast,
    });
  },
};

function buildReport(input: {
  kind: WeatherReport["kind"];
  provider: string;
  destination: string;
  daily: WeatherSnapshot[];
  seaTemperature?: number;
  isForecast: boolean;
}): WeatherReport {
  const { daily } = input;
  const avg = (pick: (s: WeatherSnapshot) => number) =>
    daily.reduce((sum, s) => sum + pick(s), 0) / Math.max(1, daily.length);

  const temperature = +avg((s) => s.temperature).toFixed(1);
  const precipitation = +avg((s) => s.precipitation).toFixed(1);
  const sunHours = +avg((s) => s.sunHours ?? 0).toFixed(1);
  const humidity = Math.round(avg((s) => s.humidity));
  const windSpeed = Math.round(avg((s) => s.windSpeed));

  return {
    kind: input.kind,
    provider: input.provider,
    destination: input.destination,
    label: input.isForecast
      ? `Prévision à ${daily.length} jours`
      : "Tendance climatique historique",
    summary: {
      date: daily[0]?.date ?? todayISO(),
      temperature,
      feelsLike: +avg((s) => s.feelsLike).toFixed(1),
      precipitation,
      windSpeed,
      humidity,
      condition: deriveCondition(temperature, precipitation, sunHours),
      sunHours,
    },
    daily,
    seaTemperature: input.seaTemperature,
  };
}

/* -------------------------------------------------------------------------- */
/*                       Provider OpenWeatherMap (réel)                        */
/* -------------------------------------------------------------------------- */

interface OwmForecastEntry {
  dt: number;
  main: { temp: number; feels_like: number; humidity: number };
  weather: { main: string; description: string }[];
  wind: { speed: number };
  rain?: { "3h"?: number };
  clouds?: { all: number };
}

/**
 * Prévision réelle à 5 jours (endpoint gratuit `/data/2.5/forecast`).
 * Au-delà de l'horizon fiable, on retombe volontairement sur les normales
 * climatiques : aucune prévision à long terme n'est inventée.
 */
export function createOpenWeatherMapProvider(apiKey: string): WeatherProvider {
  return {
    id: "openweathermap",
    label: "OpenWeatherMap",
    live: true,
    async getReport(query: WeatherQuery): Promise<WeatherReport> {
      const start = query.startDate ?? todayISO();
      const horizon = daysFromNow(start);

      // Hors de la fenêtre de prévision : normales climatiques.
      if (horizon < 0 || horizon > 5) {
        const fallback = await mockWeatherProvider.getReport(query);
        return { ...fallback, provider: "OpenWeatherMap (normales)" };
      }

      const { position } = query.destination;
      const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
      url.searchParams.set("lat", String(position.lat));
      url.searchParams.set("lon", String(position.lng));
      url.searchParams.set("units", "metric");
      url.searchParams.set("lang", "fr");
      url.searchParams.set("appid", apiKey);

      try {
        const response = await fetch(url, { next: { revalidate: 1800 } });
        if (!response.ok) throw new Error(`OpenWeatherMap: ${response.status}`);
        const payload = (await response.json()) as { list: OwmForecastEntry[] };
        const daily = aggregateOwmByDay(payload.list);
        if (daily.length === 0) throw new Error("OpenWeatherMap: réponse vide");

        return buildReport({
          kind: "forecast",
          provider: "OpenWeatherMap",
          destination: query.destination.slug,
          daily,
          seaTemperature: seaTemperatureForDate(query.destination.climate, start),
          isForecast: true,
        });
      } catch {
        // Dégradation silencieuse : l'utilisateur voit une tendance
        // climatique clairement identifiée plutôt qu'une erreur.
        const fallback = await mockWeatherProvider.getReport(query);
        return { ...fallback, provider: "OpenWeatherMap (indisponible)" };
      }
    },
  };
}

function aggregateOwmByDay(entries: OwmForecastEntry[]): WeatherSnapshot[] {
  const byDay = new Map<string, OwmForecastEntry[]>();
  for (const entry of entries) {
    const iso = new Date(entry.dt * 1000).toISOString().slice(0, 10);
    byDay.set(iso, [...(byDay.get(iso) ?? []), entry]);
  }

  return Array.from(byDay.entries()).map(([iso, group]) => {
    const avg = (pick: (e: OwmForecastEntry) => number) =>
      group.reduce((sum, e) => sum + pick(e), 0) / group.length;
    const temperature = +avg((e) => e.main.temp).toFixed(1);
    const precipitation = +group
      .reduce((sum, e) => sum + (e.rain?.["3h"] ?? 0), 0)
      .toFixed(1);
    const clouds = avg((e) => e.clouds?.all ?? 50);
    // Ensoleillement approché depuis la nébulosité moyenne.
    const sunHours = +(12 * (1 - clouds / 100)).toFixed(1);

    return {
      date: iso,
      temperature,
      feelsLike: +avg((e) => e.main.feels_like).toFixed(1),
      precipitation,
      windSpeed: Math.round(avg((e) => e.wind.speed) * 3.6),
      humidity: Math.round(avg((e) => e.main.humidity)),
      condition: deriveCondition(temperature, precipitation, sunHours),
      sunHours,
    } satisfies WeatherSnapshot;
  });
}

/* -------------------------------------------------------------------------- */
/*                          Provider WeatherAPI (réel)                         */
/* -------------------------------------------------------------------------- */

interface WeatherApiDay {
  date: string;
  day: {
    avgtemp_c: number;
    totalprecip_mm: number;
    maxwind_kph: number;
    avghumidity: number;
    daily_chance_of_rain: number;
    condition: { text: string; code: number };
  };
}

/** Prévision réelle à 14 jours (endpoint `/v1/forecast.json`). */
export function createWeatherApiProvider(apiKey: string): WeatherProvider {
  return {
    id: "weatherapi",
    label: "WeatherAPI",
    live: true,
    async getReport(query: WeatherQuery): Promise<WeatherReport> {
      const start = query.startDate ?? todayISO();
      const horizon = daysFromNow(start);
      if (horizon < 0 || horizon > FORECAST_HORIZON_DAYS) {
        const fallback = await mockWeatherProvider.getReport(query);
        return { ...fallback, provider: "WeatherAPI (normales)" };
      }

      const { position } = query.destination;
      const url = new URL("https://api.weatherapi.com/v1/forecast.json");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("q", `${position.lat},${position.lng}`);
      url.searchParams.set("days", String(Math.min(14, horizon + query.nights + 1)));
      url.searchParams.set("lang", "fr");

      try {
        const response = await fetch(url, { next: { revalidate: 1800 } });
        if (!response.ok) throw new Error(`WeatherAPI: ${response.status}`);
        const payload = (await response.json()) as {
          forecast: { forecastday: WeatherApiDay[] };
        };
        const daily: WeatherSnapshot[] = payload.forecast.forecastday
          .filter((d) => d.date >= start)
          .map((d) => {
            const sunHours = +(12 * (1 - d.day.daily_chance_of_rain / 130)).toFixed(1);
            return {
              date: d.date,
              temperature: d.day.avgtemp_c,
              feelsLike: d.day.avgtemp_c,
              precipitation: d.day.totalprecip_mm,
              windSpeed: Math.round(d.day.maxwind_kph),
              humidity: Math.round(d.day.avghumidity),
              condition: deriveCondition(
                d.day.avgtemp_c,
                d.day.totalprecip_mm,
                sunHours,
              ),
              sunHours,
            } satisfies WeatherSnapshot;
          });

        if (daily.length === 0) throw new Error("WeatherAPI: réponse vide");

        return buildReport({
          kind: "forecast",
          provider: "WeatherAPI",
          destination: query.destination.slug,
          daily,
          seaTemperature: seaTemperatureForDate(query.destination.climate, start),
          isForecast: true,
        });
      } catch {
        const fallback = await mockWeatherProvider.getReport(query);
        return { ...fallback, provider: "WeatherAPI (indisponible)" };
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                             Sélection du provider                           */
/* -------------------------------------------------------------------------- */

/**
 * Résout le provider météo actif à partir des variables d'environnement.
 * Sans clé, l'application reste pleinement fonctionnelle en mode simulé.
 */
export function getWeatherProvider(): WeatherProvider {
  const configured = process.env.WEATHER_PROVIDER?.toLowerCase();
  const owmKey = process.env.OPENWEATHERMAP_API_KEY;
  const waKey = process.env.WEATHERAPI_API_KEY;

  if (configured === "openweathermap" && owmKey) {
    return createOpenWeatherMapProvider(owmKey);
  }
  if (configured === "weatherapi" && waKey) {
    return createWeatherApiProvider(waKey);
  }
  // Auto-détection : une clé présente suffit à activer le mode réel.
  if (!configured || configured === "auto") {
    if (owmKey) return createOpenWeatherMapProvider(owmKey);
    if (waKey) return createWeatherApiProvider(waKey);
  }
  return mockWeatherProvider;
}
