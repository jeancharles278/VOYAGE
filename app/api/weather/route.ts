import { NextResponse } from "next/server";
import { getDestination } from "@/data/destinations";
import { getWeatherProvider } from "@/lib/providers";
import { todayISO } from "@/lib/utils";

/**
 * GET /api/weather?destination=majorque&start=2026-07-11&nights=4
 *
 * Expose le provider météo actif. Utile pour rafraîchir la météo côté
 * client sans recharger la page, et pour vérifier quel provider est
 * réellement branché (`provider` et `kind` dans la réponse).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("destination");
  if (!slug) {
    return NextResponse.json(
      { error: "Paramètre `destination` requis." },
      { status: 400 },
    );
  }

  const destination = getDestination(slug);
  if (!destination) {
    return NextResponse.json(
      { error: `Destination inconnue : ${slug}` },
      { status: 404 },
    );
  }

  const nights = Number(searchParams.get("nights") ?? 5);
  const report = await getWeatherProvider().getReport({
    destination,
    startDate: searchParams.get("start") ?? todayISO(),
    nights: Number.isFinite(nights) ? Math.min(21, Math.max(1, nights)) : 5,
  });

  return NextResponse.json(report);
}
