import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MessageSquareQuote,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { destinations, getDestination } from "@/data/destinations";
import { getOrigin } from "@/data/origins";
import {
  evaluateDestination,
  findAlternatives,
  badgeLabels,
} from "@/lib/recommendationEngine";
import {
  criteriaFromSearchParams,
  criteriaToSearchParams,
} from "@/lib/searchCriteria";
import {
  filterHotels,
  getFlightProvider,
  getHotelProvider,
  getRentalProvider,
  getWeatherProvider,
} from "@/lib/providers";
import { formatDateRange, formatDistance, pluralize, todayISO } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetBreakdown } from "@/components/BudgetBreakdown";
import { CompareToggle } from "@/components/CompareToggle";
import { DestinationCard } from "@/components/DestinationCard";
import { DestinationMap } from "@/components/DestinationMap";
import { FavoriteButton } from "@/components/FavoriteButton";
import { HotelComparison } from "@/components/HotelComparison";
import { Photo } from "@/components/Photo";
import { RentalGrid } from "@/components/RentalGrid";
import { ScoreBreakdownList, TravelScore } from "@/components/TravelScore";
import { TransportOptions } from "@/components/TransportOptions";
import { WeatherCard } from "@/components/WeatherCard";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateStaticParams() {
  return destinations.map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) return { title: "Destination introuvable" };
  return {
    title: `${destination.name}, ${destination.country}`,
    description: destination.tagline,
  };
}

export default async function DestinationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) notFound();

  const criteria = criteriaFromSearchParams(await searchParams);
  const origin = getOrigin(criteria.origin);
  const recommendation = evaluateDestination(destination, criteria);
  const query = criteriaToSearchParams(criteria).toString();

  // Providers : simulés par défaut, réels dès qu'une clé est configurée.
  const [weather, hotels, rentals, flights] = await Promise.all([
    getWeatherProvider().getReport({
      destination,
      startDate: criteria.startDate ?? todayISO(),
      nights: criteria.nights,
    }),
    getHotelProvider().search({ destination, criteria }),
    getRentalProvider().search({ destination, criteria }),
    origin
      ? getFlightProvider().search({ origin, destination, criteria })
      : Promise.resolve([]),
  ]);

  const matchingHotels = filterHotels(hotels, criteria);
  const alternatives = findAlternatives(destination, criteria);
  const guests = criteria.travelers.adults + criteria.travelers.children;

  return (
    <article className="pb-16">
      {/* ============================== HERO ============================== */}
      <header className="relative">
        <Photo
          src={destination.image}
          alt={`${destination.name}, ${destination.country}`}
          sizes="100vw"
          priority
          className="h-[46vh] min-h-[340px] w-full sm:h-[54vh]"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-ink-950/10" />
        </Photo>

        <div className="absolute inset-x-0 top-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Button
            variant="outline"
            size="sm"
            className="border-white/25 bg-white/15 text-white backdrop-blur hover:bg-white/25"
            asChild
          >
            <Link href={query ? `/search?${query}` : "/search"}>
              <ArrowLeft />
              Retour aux résultats
            </Link>
          </Button>
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex flex-wrap gap-1.5">
                  {recommendation.badges.map((badge) => (
                    <Badge key={badge} variant="lagoon" className="shadow-soft">
                      {badgeLabels[badge]}
                    </Badge>
                  ))}
                </div>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {destination.name}
                </h1>
                <p className="mt-2 flex items-center gap-1.5 text-white/80">
                  <MapPin className="size-4" />
                  {destination.country} · {destination.region} · Aéroport{" "}
                  {destination.airport}
                </p>
                <p className="mt-3 max-w-xl text-balance leading-relaxed text-white/70">
                  {destination.tagline}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <CompareToggle slug={destination.slug} variant="inline" />
                <FavoriteButton
                  variant="inline"
                  item={{
                    id: destination.slug,
                    type: "destination",
                    label: destination.name,
                    destination: destination.slug,
                  }}
                />
                <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
                  <TravelScore score={recommendation.score} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                      Score voyage
                    </p>
                    <p className="text-lg font-semibold tracking-tight text-ink-900">
                      {recommendation.score}/100
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------- Rappel des critères ---------------------- */}
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3.5 text-sm text-ink-500 sm:px-6 lg:px-8">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-ink-300" />
            Départ de {origin?.name ?? criteria.origin}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-ink-300" />
            {formatDateRange(criteria.startDate, criteria.endDate)} ·{" "}
            {pluralize(criteria.nights, "nuit")}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5 text-ink-300" />
            {pluralize(guests, "voyageur")}
            {criteria.travelers.children > 0 &&
              ` (${criteria.travelers.childrenAges.join(", ")} ans)`}
          </span>
          <Button variant="link" size="sm" className="ml-auto h-auto p-0" asChild>
            <Link href={query ? `/search?${query}` : "/search"}>Modifier ma recherche</Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ========================= PRÉSENTATION ======================== */}
        <section className="grid gap-8 py-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
              Pourquoi cette destination&nbsp;?
            </h2>
            <p className="mt-4 rounded-3xl bg-lagoon-50 p-5 text-[15px] leading-relaxed text-ink-700">
              {recommendation.reason}
            </p>
            <p className="mt-5 leading-relaxed text-ink-500">{destination.description}</p>

            <ul className="mt-6 grid gap-2.5">
              {destination.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2.5 text-sm text-ink-600">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-coral-500" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-ink-100/70 bg-white p-6 shadow-soft">
            <h3 className="text-sm font-semibold text-ink-900">Détail du score</h3>
            <p className="mt-1 text-xs text-ink-400">
              Pondération : météo 25, prix 25, transport 15, hébergement 15, activités 10,
              avis 10.
            </p>
            <ScoreBreakdownList breakdown={recommendation.breakdown} className="mt-5" />
          </div>
        </section>

        {/* ====================== MÉTÉO ET TRANSPORT ===================== */}
        <section id="meteo" className="grid gap-6 pb-10 lg:grid-cols-2">
          <WeatherCard report={weather} />
          {origin && <TransportOptions offers={flights} originName={origin.name} />}
        </section>

        {/* ========================= HÉBERGEMENT ========================= */}
        <section id="hebergement" className="pb-10">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
            Où dormir à {destination.name}
          </h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Comparaison des tarifs entre agences pour vos dates. Les prix sont simulés.
          </p>

          <Tabs defaultValue="hotels" className="mt-6">
            <TabsList>
              <TabsTrigger value="hotels">
                Hôtels
                <span className="text-xs text-ink-300">({matchingHotels.length})</span>
              </TabsTrigger>
              <TabsTrigger value="rentals">
                Locations
                <span className="text-xs text-ink-300">({rentals.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hotels">
              <HotelComparison
                hotels={matchingHotels}
                criteria={criteria}
                destinationSlug={destination.slug}
              />
            </TabsContent>

            <TabsContent value="rentals">
              <RentalGrid
                rentals={rentals}
                nights={criteria.nights}
                destinationSlug={destination.slug}
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* ============================ CARTE ============================ */}
        <section id="carte" className="pb-10">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-ink-900">
            Se repérer
          </h2>
          <DestinationMap destination={destination} />
        </section>

        {/* ================== ACTIVITÉS, BUDGET ET AVIS ================== */}
        <section className="grid gap-6 pb-10 lg:grid-cols-[1.5fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft">
            <div className="border-b border-ink-100 px-6 py-4">
              <h3 className="flex items-center gap-2 font-semibold tracking-tight text-ink-900">
                <Ticket className="size-4 text-ink-400" />
                Activités incontournables
              </h3>
            </div>
            <ul className="divide-y divide-ink-100">
              {destination.activities.map((activity) => (
                <li key={activity.name} className="flex items-start gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900">{activity.name}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-500">
                      {activity.description}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-xs text-ink-400">
                      <Badge variant="soft">{activity.category}</Badge>
                      {activity.duration}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ink-900">
                    {activity.price === 0 ? "Gratuit" : `${activity.price} €`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-6">
            <BudgetBreakdown budget={recommendation.budget} criteria={criteria} />

            <div className="rounded-3xl border border-ink-100/70 bg-white p-6 shadow-soft">
              <h3 className="flex items-center gap-2 font-semibold tracking-tight text-ink-900">
                <MessageSquareQuote className="size-4 text-ink-400" />
                Avis voyageurs
              </h3>
              <div className="mt-4 flex items-center gap-4">
                <span className="text-4xl font-semibold tracking-tight text-ink-900">
                  {destination.reviewScore.toFixed(1)}
                </span>
                <div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={
                          index < Math.round(destination.reviewScore)
                            ? "size-4 fill-amber-400 text-amber-400"
                            : "size-4 text-ink-200"
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-ink-400">
                    {destination.reviewCount.toLocaleString("fr-FR")} avis
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid gap-3">
                {(
                  [
                    ["Plage", destination.scores.beach],
                    ["Famille", destination.scores.family],
                    ["Culture", destination.scores.culture],
                    ["Gastronomie", destination.scores.gastronomy],
                    ["Nature", destination.scores.nature],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="grid gap-1.5">
                    <div className="flex justify-between text-sm">
                      <dt className="text-ink-600">{label}</dt>
                      <dd className="font-medium tabular-nums text-ink-900">{value}</dd>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-sand-100">
                      <div
                        className="h-full rounded-full bg-lagoon-500"
                        style={{ width: `${Math.max(3, value)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </dl>

              {destination.beachDistance !== null && (
                <p className="mt-5 rounded-2xl bg-sand-50 p-3.5 text-xs leading-relaxed text-ink-500">
                  Plage la plus proche à environ{" "}
                  {formatDistance(destination.beachDistance)} des hébergements du centre.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ========================= ALTERNATIVES ======================== */}
        {alternatives.length > 0 && (
          <section className="pb-4">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
              Destinations similaires
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">
              Même ambiance, comparées avec vos critères actuels.
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {alternatives.map((alternative) => (
                <DestinationCard
                  key={alternative.destination.slug}
                  recommendation={alternative}
                  query={query}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
