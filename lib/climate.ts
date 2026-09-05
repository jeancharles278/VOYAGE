import type {
  Destination,
  MonthlyClimate,
  WeatherCondition,
  WeatherSnapshot,
} from "@/types";
import { seededRandom } from "@/lib/utils";

/** Horizon au-delà duquel aucune prévision météo n'est fiable. */
export const FORECAST_HORIZON_DAYS = 14;

/**
 * Interpole une série mensuelle à une date donnée.
 * Les moyennes sont calées au 15 du mois puis interpolées linéairement,
 * ce qui évite les marches d'escalier entre deux mois.
 */
function interpolateMonthly(series: number[], date: Date): number {
  const month = date.getMonth();
  const day = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
  const progress = (day - 15) / daysInMonth;
  const [from, to] =
    progress >= 0
      ? [month, (month + 1) % 12]
      : [(month + 11) % 12, month];
  const t = Math.abs(progress);
  return series[from] * (1 - t) + series[to] * t;
}

export function deriveCondition(
  temperature: number,
  dailyPrecipitation: number,
  sunHours: number,
): WeatherCondition {
  if (temperature <= 1 && dailyPrecipitation > 1.5) return "snow";
  if (dailyPrecipitation > 6) return "storm";
  if (dailyPrecipitation > 2.5) return "rain";
  if (sunHours >= 8.5) return "sunny";
  if (sunHours >= 5.5) return "partly-cloudy";
  return "cloudy";
}

export const conditionLabels: Record<WeatherCondition, string> = {
  sunny: "Ensoleillé",
  "partly-cloudy": "Éclaircies",
  cloudy: "Nuageux",
  rain: "Pluvieux",
  storm: "Averses orageuses",
  snow: "Neige",
};

/** Normales climatiques pour une date précise (aucune prévision impliquée). */
export function climateForDate(
  climate: MonthlyClimate,
  isoDate: string,
): WeatherSnapshot {
  const date = new Date(`${isoDate}T12:00:00`);
  const high = interpolateMonthly(climate.avgHigh, date);
  const low = interpolateMonthly(climate.avgLow, date);
  const monthlyRain = interpolateMonthly(climate.precipitation, date);
  const sun = interpolateMonthly(climate.sunHours, date);
  const dailyRain = monthlyRain / 30;
  // Journée type : moyenne pondérée vers le maximum diurne.
  const temperature = high * 0.68 + low * 0.32;
  const humidity = Math.round(
    Math.min(92, Math.max(38, 52 + monthlyRain * 0.22 - sun * 1.4)),
  );
  const wind = Math.round(9 + (monthlyRain / 40) * 6);

  return {
    date: isoDate,
    temperature: +temperature.toFixed(1),
    feelsLike: +feelsLike(temperature, humidity, wind).toFixed(1),
    precipitation: +dailyRain.toFixed(1),
    windSpeed: wind,
    humidity,
    condition: deriveCondition(temperature, dailyRain, sun),
    sunHours: +sun.toFixed(1),
  };
}

/** Indice de chaleur / refroidissement éolien simplifié. */
function feelsLike(temperature: number, humidity: number, wind: number): number {
  if (temperature >= 26) {
    return temperature + (humidity - 50) * 0.045 + Math.max(0, temperature - 26) * 0.12;
  }
  if (temperature <= 10) {
    return temperature - wind * 0.12;
  }
  return temperature;
}

/**
 * Ajoute une variabilité journalière déterministe autour des normales.
 * Utilisé uniquement pour illustrer une tendance, jamais présenté comme
 * une prévision réelle.
 */
export function climateSeries(
  destination: Destination,
  startISO: string,
  days: number,
): WeatherSnapshot[] {
  const rand = seededRandom(`${destination.slug}-${startISO}`);
  const out: WeatherSnapshot[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(`${startISO}T12:00:00`);
    date.setDate(date.getDate() + i);
    const iso = date.toISOString().slice(0, 10);
    const base = climateForDate(destination.climate, iso);
    const drift = (rand() - 0.5) * 3.4;
    const rainDrift = rand();
    const precipitation = +Math.max(
      0,
      base.precipitation * (rainDrift < 0.62 ? 0.25 : 1.9),
    ).toFixed(1);
    const temperature = +(base.temperature + drift).toFixed(1);
    const sunHours = +Math.max(
      0,
      (base.sunHours ?? 6) * (rainDrift < 0.62 ? 1.12 : 0.55),
    ).toFixed(1);
    out.push({
      ...base,
      date: iso,
      temperature,
      feelsLike: +feelsLike(temperature, base.humidity, base.windSpeed).toFixed(1),
      precipitation,
      sunHours,
      condition: deriveCondition(temperature, precipitation, sunHours),
    });
  }
  return out;
}

/** Moyennes climatiques sur la période demandée. */
export function climateForPeriod(
  destination: Destination,
  startISO: string,
  nights: number,
): WeatherSnapshot {
  const days = Math.max(1, nights);
  let temperature = 0;
  let precipitation = 0;
  let sunHours = 0;
  let humidity = 0;
  let wind = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(`${startISO}T12:00:00`);
    date.setDate(date.getDate() + i);
    const snap = climateForDate(destination.climate, date.toISOString().slice(0, 10));
    temperature += snap.temperature;
    precipitation += snap.precipitation;
    sunHours += snap.sunHours ?? 0;
    humidity += snap.humidity;
    wind += snap.windSpeed;
  }

  const avgTemp = temperature / days;
  const avgRain = precipitation / days;
  const avgSun = sunHours / days;
  const avgHumidity = Math.round(humidity / days);
  const avgWind = Math.round(wind / days);

  return {
    date: startISO,
    temperature: +avgTemp.toFixed(1),
    feelsLike: +feelsLike(avgTemp, avgHumidity, avgWind).toFixed(1),
    precipitation: +avgRain.toFixed(1),
    windSpeed: avgWind,
    humidity: avgHumidity,
    condition: deriveCondition(avgTemp, avgRain, avgSun),
    sunHours: +avgSun.toFixed(1),
  };
}

/** Température de la mer interpolée, si la destination est balnéaire. */
export function seaTemperatureForDate(
  climate: MonthlyClimate,
  isoDate: string,
): number | undefined {
  if (!climate.seaTemperature) return undefined;
  return +interpolateMonthly(
    climate.seaTemperature,
    new Date(`${isoDate}T12:00:00`),
  ).toFixed(1);
}
