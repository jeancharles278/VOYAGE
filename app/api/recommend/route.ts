import { NextResponse } from "next/server";
import { searchDestinations } from "@/lib/recommendationEngine";
import { criteriaFromSearchParams } from "@/lib/searchCriteria";

/**
 * GET /api/recommend?origin=luxembourg&budget=2000&minTemp=23&maxTravel=4…
 *
 * Même moteur que la page `/search`, exposé en JSON. Permet de tester
 * l'algorithme, d'alimenter une application mobile ou de brancher un
 * agent conversationnel.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const criteria = criteriaFromSearchParams(searchParams);
  const outcome = searchDestinations(criteria);

  return NextResponse.json({
    criteria,
    relaxed: outcome.relaxed,
    excluded: outcome.excluded,
    count: outcome.recommendations.length,
    results: outcome.recommendations.map((recommendation) => ({
      slug: recommendation.destination.slug,
      name: recommendation.destination.name,
      country: recommendation.destination.country,
      score: recommendation.score,
      breakdown: recommendation.breakdown,
      badges: recommendation.badges,
      budget: recommendation.budget,
      weather: recommendation.weather,
      travel: recommendation.travel,
      reason: recommendation.reason,
    })),
  });
}
