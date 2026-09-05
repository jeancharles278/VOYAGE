import Link from "next/link";
import {
  ArrowRight,
  CloudSun,
  Compass,
  Sparkles,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { destinations } from "@/data/destinations";
import { defaultCriteria } from "@/lib/searchCriteria";
import { searchDestinations, stayTypeLabels } from "@/lib/recommendationEngine";
import type { StayType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DestinationCard } from "@/components/DestinationCard";
import { NaturalLanguageSearch } from "@/components/NaturalLanguageSearch";
import { Photo } from "@/components/Photo";
import { SearchBar } from "@/components/SearchBar";

const INSPIRATION: Array<{ type: StayType; emoji: string; caption: string }> = [
  { type: "beach", emoji: "🏖️", caption: "Mer chaude et criques" },
  { type: "family", emoji: "👨‍👩‍👧", caption: "Clubs enfants et piscines" },
  { type: "romantic", emoji: "💞", caption: "Escapades à deux" },
  { type: "culture", emoji: "🏛️", caption: "Villes et musées" },
  { type: "nature", emoji: "🌿", caption: "Randonnée et grands espaces" },
  { type: "ski", emoji: "⛷️", caption: "Neige garantie" },
  { type: "gastronomy", emoji: "🍽️", caption: "Tables et marchés" },
  { type: "weekend", emoji: "🧳", caption: "Deux nuits, pas plus" },
];

export default function HomePage() {
  const criteria = defaultCriteria();

  // Sélection éditoriale : meilleures destinations pour des critères ouverts.
  const highlights = searchDestinations(criteria).recommendations.slice(0, 6);
  const bestValue = [...highlights].sort(
    (a, b) => a.budget.perPerson - b.budget.perPerson,
  )[0];

  return (
    <>
      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-lagoon-50 via-sand-50 to-[var(--background)]" />
          <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-lagoon-200/40 blur-3xl" />
          <div className="absolute -right-32 top-10 size-[420px] rounded-full bg-coral-100/60 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mx-auto bg-white/70 px-3 py-1.5 text-xs">
              <Compass className="size-3.5 text-coral-500" />
              Conseiller de voyage intelligent
            </Badge>

            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
              Où voulez-vous partir&nbsp;?
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-ink-500">
              Trouvez la meilleure destination selon votre budget, la météo et vos envies.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-6xl animate-fade-up">
            <SearchBar initialCriteria={criteria} />
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-3">
            <Feature
              icon={CloudSun}
              title="Météo réaliste"
              description="Prévision réelle à court terme, tendance climatique historique au-delà. Jamais de fausse prévision."
            />
            <Feature
              icon={Wallet}
              title="Budget complet"
              description="Transport, hébergement et dépenses sur place : le total réel, pas seulement le prix d'appel."
            />
            <Feature
              icon={TrendingDown}
              title="Score sur 100"
              description="Météo, prix, trajet, hébergement, activités et avis pondérés en un seul indicateur comparable."
            />
          </div>
        </div>
      </section>

      {/* ====================== RECHERCHE EN LANGAGE NATUREL ============== */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <NaturalLanguageSearch baseCriteria={criteria} />
        </div>
      </section>

      {/* =========================== INSPIRATION ========================== */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              Quelle envie&nbsp;?
            </h2>
            <p className="mt-1.5 text-ink-500">
              Choisissez une ambiance, nous filtrons les {destinations.length} destinations.
            </p>
          </div>
        </div>

        <div className="no-scrollbar -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-8">
          {INSPIRATION.map(({ type, emoji, caption }) => (
            <Link
              key={type}
              href={`/search?types=${type}&origin=${criteria.origin}&budget=${criteria.maxBudget}`}
              className="group flex min-w-[140px] flex-col gap-1 rounded-2xl border border-ink-100 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-lift"
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="mt-1 text-sm font-medium text-ink-900">
                {stayTypeLabels[type]}
              </span>
              <span className="text-xs leading-snug text-ink-400">{caption}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ========================= DESTINATIONS PHARES ==================== */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              Nos meilleures destinations en ce moment
            </h2>
            <p className="mt-1.5 text-ink-500">
              Calculées pour un départ de {criteria.travelers.adults} adultes depuis
              Luxembourg, {criteria.nights} nuits, {criteria.maxBudget} € maximum.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/search">
              Voir tous les résultats
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((recommendation, index) => (
            <DestinationCard
              key={recommendation.destination.slug}
              recommendation={recommendation}
              priority={index < 3}
            />
          ))}
        </div>
      </section>

      {/* ======================= MISE EN AVANT PRIX ======================= */}
      {bestValue && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-4xl bg-ink-900">
            <Photo
              src={bestValue.destination.image}
              alt={bestValue.destination.name}
              sizes="100vw"
              className="absolute inset-0"
              imageClassName="opacity-45"
            />
            <div className="relative grid gap-6 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <Badge variant="coral">
                  <Sparkles className="size-3" />
                  Meilleur rapport qualité/prix
                </Badge>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {bestValue.destination.name}, {bestValue.destination.country}
                </h2>
                <p className="mt-3 max-w-xl text-balance leading-relaxed text-white/75">
                  {bestValue.destination.tagline}. {bestValue.reason}
                </p>
                <Button variant="coral" size="lg" className="mt-6" asChild>
                  <Link href={`/destination/${bestValue.destination.slug}`}>
                    Découvrir cette destination
                    <ArrowRight />
                  </Link>
                </Button>
              </div>

              <dl className="grid grid-cols-3 gap-4 rounded-3xl bg-white/10 p-6 backdrop-blur-md">
                <Stat label="Score" value={`${bestValue.score}`} suffix="/100" />
                <Stat
                  label="Par personne"
                  value={`${bestValue.budget.perPerson}`}
                  suffix="€"
                />
                <Stat
                  label="Température"
                  value={`${Math.round(bestValue.weather.temperature)}`}
                  suffix="°C"
                />
              </dl>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-100/70 bg-white/70 p-5 backdrop-blur-sm">
      <span className="flex size-9 items-center justify-center rounded-xl bg-ink-900 text-white">
        <Icon className="size-4" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{description}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-white">
        {value}
        <span className="text-sm font-medium text-white/60">{suffix}</span>
      </dd>
    </div>
  );
}
