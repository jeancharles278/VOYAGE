import type { Amenity, ParsedQuery, SearchCriteria, StayType } from "@/types";
import { origins } from "@/data/origins";
import { destinations } from "@/data/destinations";
import { addDays, todayISO } from "@/lib/utils";

/**
 * Parser de langage naturel « règles » pour le MVP.
 *
 * Il reconnaît : budget, nombre de voyageurs, âge des enfants, durée,
 * température, ville de départ, destination, équipements (piscine, plage),
 * météo et type de séjour.
 *
 * Une implémentation LLM peut le remplacer sans changer l'interface :
 * voir `parseTravelQuery()` en bas de fichier.
 */

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
};

function toNumber(token: string): number | null {
  const digits = Number(token.replace(/[^\d]/g, ""));
  if (Number.isFinite(digits) && digits > 0) return digits;
  return NUMBER_WORDS[token] ?? null;
}

const MONTHS: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
};

const STAY_TYPE_KEYWORDS: Array<[StayType, string[]]> = [
  ["beach", ["plage", "mer", "balneaire", "farniente", "sable"]],
  ["family", ["famille", "enfants", "familial", "kids"]],
  ["romantic", ["romantique", "amoureux", "couple", "lune de miel", "ma femme", "mon mari"]],
  ["luxury", ["luxe", "5 etoiles", "palace", "haut de gamme"]],
  ["nature", ["nature", "randonnee", "montagne", "parc naturel", "verdure"]],
  ["city", ["ville", "city break", "urbain", "capitale"]],
  ["culture", ["culture", "musee", "histoire", "monument", "patrimoine"]],
  ["gastronomy", ["gastronomie", "restaurant", "cuisine", "vin", "food"]],
  ["weekend", ["week-end", "weekend", "court sejour"]],
  ["roadtrip", ["road trip", "roadtrip", "itinerant", "en voiture"]],
  ["ski", ["ski", "neige", "snowboard", "station de ski", "montagne enneigee"]],
  ["themepark", ["parc d'attraction", "parc d attraction", "attractions", "disney"]],
];

const AMENITY_KEYWORDS: Array<[Amenity, string[]]> = [
  ["pool", ["piscine", "pool"]],
  ["spa", ["spa", "hammam", "massage", "bien-etre", "bien etre"]],
  ["beach", ["bord de mer", "acces plage", "pieds dans l'eau", "pieds dans l eau", "plage"]],
  ["breakfast", ["petit-dejeuner", "petit dejeuner", "breakfast"]],
  ["allInclusive", ["all inclusive", "tout compris", "all-inclusive"]],
  ["parking", ["parking", "voiture de location", "garage"]],
  ["airConditioning", ["climatisation", "climatise", "clim"]],
];

/**
 * Recherche un mot-clé en respectant les limites de mots.
 * Sans cela « Luxembourg » déclencherait le type de séjour « luxe ».
 */
function hasKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(text);
}

export function parseNaturalLanguage(input: string): ParsedQuery {
  const text = normalize(input);
  const criteria: Partial<SearchCriteria> = {};
  const matched: string[] = [];

  /* ---------------------------- Budget ---------------------------------- */
  // « 2 000 € », « budget de 1500 euros », « max 2k »
  const budgetMatch =
    text.match(/(\d[\d\s.,]*)\s*(?:€|euros?|eur)\b/) ??
    text.match(/budget[^\d]{0,20}(\d[\d\s.,]*)/) ??
    text.match(/(\d+(?:[.,]\d+)?)\s*k\b/);
  if (budgetMatch) {
    const rawValue = budgetMatch[1].replace(/\s/g, "").replace(/,/g, ".");
    let value = Number(rawValue.replace(/\.(?=\d{3}\b)/g, ""));
    if (/k\b/.test(budgetMatch[0])) value = Number(rawValue) * 1000;
    if (Number.isFinite(value) && value >= 100) {
      criteria.maxBudget = Math.round(value);
      matched.push("budget");
    }
  }

  /* --------------------------- Voyageurs -------------------------------- */
  const adultsMatch = text.match(/(\d+|un|une|deux|trois|quatre|cinq|six)\s+adultes?/);
  const childrenMatch = text.match(
    /(\d+|un|une|deux|trois|quatre|cinq)\s+(?:enfants?|petits?)/,
  );
  const ages = Array.from(
    text.matchAll(/(?:de|d'|age de|ages de)?\s*(\d{1,2})\s*ans?/g),
    (m) => Number(m[1]),
  ).filter((age) => age >= 0 && age <= 17);

  let adults = adultsMatch ? (toNumber(adultsMatch[1]) ?? 2) : null;
  let children = childrenMatch ? (toNumber(childrenMatch[1]) ?? 0) : null;

  // Formulations implicites : « avec ma femme et mon fils »
  const partnerMentioned = /\b(ma femme|mon mari|ma compagne|mon compagnon|mon conjoint|ma conjointe|en couple|mon copain|ma copine)\b/.test(text);
  const childMentions = (text.match(/\b(mon fils|ma fille|mes enfants|notre fils|notre fille)\b/g) ?? []).length;

  if (adults === null && partnerMentioned) adults = 2;
  if (children === null && childMentions > 0) {
    children = /mes enfants/.test(text) ? Math.max(2, ages.length || 2) : childMentions;
  }
  if (children === null && ages.length > 0) children = ages.length;

  if (adults !== null || children !== null) {
    const finalAdults = adults ?? 2;
    const finalChildren = children ?? 0;
    criteria.travelers = {
      adults: finalAdults,
      children: finalChildren,
      childrenAges: Array.from(
        { length: finalChildren },
        (_, i) => ages[i] ?? 8,
      ),
    };
    matched.push("voyageurs");
  }

  /* ----------------------------- Durée ---------------------------------- */
  const nightsMatch = text.match(/(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|dix)\s*(nuits?|nuitees?)/);
  const daysMatch = text.match(/(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|dix)\s*(jours?|journees?)/);
  const weeksMatch = text.match(/(\d+|une|deux|trois)\s*semaines?/);

  let nights: number | null = null;
  if (nightsMatch) nights = toNumber(nightsMatch[1]);
  else if (daysMatch) {
    const days = toNumber(daysMatch[1]);
    nights = days ? Math.max(1, days - 1) : null;
  } else if (weeksMatch) {
    const weeks = toNumber(weeksMatch[1]);
    nights = weeks ? weeks * 7 : null;
  } else if (/\bweek-?end\b/.test(text)) {
    nights = 2;
  }

  if (nights) {
    criteria.nights = nights;
    matched.push("durée");
  }

  /* ----------------------------- Dates ---------------------------------- */
  const monthMatch = Object.keys(MONTHS).find((month) =>
    new RegExp(`\\b(?:en|au mois de|debut|mi|fin)?\\s*${month}\\b`).test(text),
  );
  if (monthMatch) {
    const now = new Date();
    const targetMonth = MONTHS[monthMatch];
    const year = targetMonth < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
    const start = new Date(year, targetMonth, 8).toISOString().slice(0, 10);
    criteria.startDate = start;
    criteria.endDate = addDays(start, nights ?? 7);
    matched.push("dates");
  } else if (nights) {
    const start = addDays(todayISO(), 30);
    criteria.startDate = start;
    criteria.endDate = addDays(start, nights);
  }

  /* -------------------------- Température ------------------------------- */
  const tempMatch =
    text.match(/(?:plus de|au moins|minimum|>|superieure? a)\s*(\d{1,2})\s*(?:°|degres?|c\b)/) ??
    text.match(/(\d{1,2})\s*(?:°c?|degres?)/);
  if (tempMatch) {
    const value = Number(tempMatch[1]);
    if (value >= 5 && value <= 40) {
      criteria.minTemperature = value;
      matched.push("température");
    }
  }

  /* ---------------------------- Transport ------------------------------- */
  const travelMatch = text.match(
    /(?:trajet|vol|voyage|route)[^\d]{0,20}(?:de\s*)?(?:moins de|max(?:imum)?|<|inferieur a)?\s*(\d{1,2})\s*(?:h|heures?)/,
  );
  if (travelMatch) {
    criteria.maxTravelTime = Number(travelMatch[1]);
    matched.push("durée de trajet");
  }
  if (/\ben train\b|\bsans avion\b|\bpas d'avion\b|\bpas d avion\b/.test(text)) {
    criteria.transport = "train";
    matched.push("transport");
  } else if (/\ben voiture\b|\bavec ma voiture\b/.test(text)) {
    criteria.transport = "car";
    matched.push("transport");
  }

  /* ------------------------------ Météo --------------------------------- */
  if (/\bsoleil\b|\bensoleill|\bsunny\b/.test(text)) {
    criteria.weather = "sunny";
    matched.push("météo");
  } else if (/\bchaud\b|\bchaleur\b/.test(text)) {
    criteria.weather = "hot";
    matched.push("météo");
  } else if (/\bneige\b|\bski\b/.test(text)) {
    criteria.weather = "snow";
    matched.push("météo");
  } else if (/\bpeu de pluie\b|\bsans pluie\b|\bsec\b/.test(text)) {
    criteria.weather = "dry";
    matched.push("météo");
  }

  /* --------------------------- Équipements ------------------------------ */
  const amenities: Amenity[] = [];
  for (const [amenity, keywords] of AMENITY_KEYWORDS) {
    if (keywords.some((keyword) => hasKeyword(text, keyword))) amenities.push(amenity);
  }
  if (amenities.length > 0) {
    criteria.amenities = amenities;
    matched.push("équipements");
  }

  /* -------------------------- Type de séjour ---------------------------- */
  const stayTypes: StayType[] = [];
  for (const [type, keywords] of STAY_TYPE_KEYWORDS) {
    if (keywords.some((keyword) => hasKeyword(text, keyword))) stayTypes.push(type);
  }
  if (criteria.travelers && criteria.travelers.children > 0 && !stayTypes.includes("family")) {
    stayTypes.push("family");
  }
  if (stayTypes.length > 0) {
    criteria.stayTypes = stayTypes;
    matched.push("type de séjour");
  }

  /* ------------------------- Hébergement -------------------------------- */
  if (/\blocation\b|\bappartement\b|\bvilla\b|\bmaison\b|\bairbnb\b/.test(text)) {
    criteria.accommodation = "rental";
    matched.push("hébergement");
  } else if (/\bresort\b|\bclub\b/.test(text)) {
    criteria.accommodation = "resort";
    matched.push("hébergement");
  } else if (/\bhotel\b/.test(text)) {
    criteria.accommodation = "hotel";
    matched.push("hébergement");
  }
  const starsMatch = text.match(/(\d)\s*(?:etoiles?|\*)/);
  if (starsMatch) {
    const stars = Number(starsMatch[1]);
    if (stars >= 3 && stars <= 5) {
      criteria.minHotelRating = stars;
      matched.push("classement");
    }
  }
  if (/\ball inclusive\b|\btout compris\b/.test(text)) {
    criteria.mealPlan = "allInclusive";
  } else if (/\bdemi-pension\b|\bdemi pension\b/.test(text)) {
    criteria.mealPlan = "halfBoard";
  } else if (/\bpension complete\b/.test(text)) {
    criteria.mealPlan = "fullBoard";
  } else if (/\bpetit-dejeuner\b|\bpetit dejeuner\b/.test(text)) {
    criteria.mealPlan = "breakfast";
  }

  /* --------------------------- Ville de départ -------------------------- */
  // « depuis Luxembourg », « au départ de Paris », « de Bruxelles »
  const originCandidate =
    origins.find((origin) =>
      new RegExp(
        `(?:depuis|au depart de|en partant de|du|de|d')\\s+${normalize(origin.name)}\\b`,
      ).test(text),
    ) ?? origins.find((origin) => hasKeyword(text, normalize(origin.name)));
  if (originCandidate) {
    criteria.origin = originCandidate.slug;
    matched.push("ville de départ");
  }

  /* --------------------------- Destination ------------------------------ */
  const destinationCandidate = destinations.find((destination) => {
    const name = normalize(destination.name);
    return new RegExp(`\\b(?:a|vers|pour|en|jusqu'a)\\s+${name}\\b`).test(text);
  });
  if (destinationCandidate && destinationCandidate.slug !== criteria.origin) {
    criteria.destination = destinationCandidate.slug;
    matched.push("destination");
  }

  const confidence = Math.min(1, matched.length / 6);

  return { criteria, matched, confidence, provider: "rule-based" };
}

/**
 * Point d'entrée unique pour la recherche en langage naturel.
 *
 * Aujourd'hui : parser à règles, exécuté côté client, instantané et gratuit.
 * Demain : appel à une API LLM (voir `app/api/parse/route.ts`) capable de
 * gérer des formulations libres. Le contrat `ParsedQuery` reste identique.
 */
export async function parseTravelQuery(input: string): Promise<ParsedQuery> {
  if (process.env.NLP_PROVIDER === "llm" && process.env.ANTHROPIC_API_KEY) {
    // TODO: brancher l'appel LLM ici (voir README, section « APIs à connecter »).
    return parseNaturalLanguage(input);
  }
  return parseNaturalLanguage(input);
}

/** Fusionne un résultat de parsing avec des critères existants. */
export function mergeParsedCriteria(
  base: SearchCriteria,
  parsed: Partial<SearchCriteria>,
): SearchCriteria {
  const merged: SearchCriteria = { ...base, ...parsed };
  if (parsed.travelers) merged.travelers = parsed.travelers;
  if (parsed.nights && parsed.startDate) {
    merged.endDate = addDays(parsed.startDate, parsed.nights);
  }
  return merged;
}
