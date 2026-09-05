"use client";

import { useState } from "react";
import {
  Bath,
  BedDouble,
  Car,
  Check,
  CloudRain,
  CloudSnow,
  Croissant,
  Flame,
  Home,
  Hotel,
  ParkingCircle,
  Plane,
  RotateCcw,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Thermometer,
  Timer,
  TrainFront,
  UtensilsCrossed,
  Waves,
  Wind,
} from "lucide-react";
import type {
  AccommodationType,
  Amenity,
  MealPlan,
  SearchCriteria,
  StayType,
  TransportMode,
  WeatherPreference,
} from "@/types";
import { stayTypeLabels } from "@/lib/recommendationEngine";
import { mealPlanLabels } from "@/lib/providers/hotelProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SearchFiltersProps {
  criteria: SearchCriteria;
  onChange: (criteria: SearchCriteria) => void;
  onReset?: () => void;
}

const TEMPERATURES = [15, 20, 25, 30];
const TRAVEL_TIMES = [2, 3, 4, 6];

const WEATHER_OPTIONS: Array<{
  value: WeatherPreference;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "sunny", label: "Soleil", icon: Sun },
  { value: "dry", label: "Peu de pluie", icon: CloudRain },
  { value: "hot", label: "Chaud", icon: Flame },
  { value: "snow", label: "Neige", icon: CloudSnow },
  { value: "any", label: "Indifférent", icon: Wind },
];

const TRANSPORT_OPTIONS: Array<{
  value: TransportMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "plane", label: "Avion", icon: Plane },
  { value: "train", label: "Train", icon: TrainFront },
  { value: "car", label: "Voiture", icon: Car },
  { value: "any", label: "Indifférent", icon: Wind },
];

const ACCOMMODATION_OPTIONS: Array<{
  value: AccommodationType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "hotel", label: "Hôtel", icon: Hotel },
  { value: "rental", label: "Location", icon: Home },
  { value: "resort", label: "Resort", icon: BedDouble },
  { value: "any", label: "Indifférent", icon: Wind },
];

const AMENITY_OPTIONS: Array<{
  value: Amenity;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "pool", label: "Piscine", icon: Waves },
  { value: "spa", label: "Spa", icon: Bath },
  { value: "beach", label: "Plage", icon: Waves },
  { value: "breakfast", label: "Petit-déjeuner", icon: Croissant },
  { value: "allInclusive", label: "All inclusive", icon: UtensilsCrossed },
  { value: "parking", label: "Parking", icon: ParkingCircle },
  { value: "airConditioning", label: "Climatisation", icon: Snowflake },
];

const MEAL_PLAN_OPTIONS: MealPlan[] = [
  "none",
  "breakfast",
  "halfBoard",
  "fullBoard",
  "allInclusive",
];

const STAY_TYPE_OPTIONS: StayType[] = [
  "beach",
  "family",
  "romantic",
  "luxury",
  "nature",
  "city",
  "culture",
  "gastronomy",
  "weekend",
  "roadtrip",
  "ski",
  "themepark",
];

const STAY_TYPE_EMOJI: Record<StayType, string> = {
  beach: "🏖️",
  family: "👨‍👩‍👧",
  romantic: "💞",
  luxury: "✨",
  nature: "🌿",
  city: "🏙️",
  culture: "🏛️",
  gastronomy: "🍽️",
  weekend: "🧳",
  roadtrip: "🚗",
  ski: "⛷️",
  themepark: "🎢",
};

export function SearchFilters({ criteria, onChange, onReset }: SearchFiltersProps) {
  const [draft, setDraft] = useState(criteria);

  function patch(next: Partial<SearchCriteria>) {
    const updated = { ...draft, ...next };
    setDraft(updated);
    onChange(updated);
  }

  function toggleAmenity(amenity: Amenity) {
    patch({
      amenities: draft.amenities.includes(amenity)
        ? draft.amenities.filter((a) => a !== amenity)
        : [...draft.amenities, amenity],
    });
  }

  function toggleStayType(type: StayType) {
    patch({
      stayTypes: draft.stayTypes.includes(type)
        ? draft.stayTypes.filter((t) => t !== type)
        : [...draft.stayTypes, type],
    });
  }

  return (
    <div className="flex flex-col gap-7">
      {/* --------------------------- Type de séjour ------------------------- */}
      <Section title="Type de séjour" icon={Sparkles}>
        <div className="grid grid-cols-2 gap-2">
          {STAY_TYPE_OPTIONS.map((type) => {
            const active = draft.stayTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleStayType(type)}
                aria-pressed={active}
                className={cn(
                  "group relative flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-all duration-200",
                  active
                    ? "border-ink-900 bg-ink-900 text-white shadow-lift"
                    : "border-ink-100 bg-white text-ink-700 hover:border-ink-200 hover:shadow-soft",
                )}
              >
                <span className="text-lg leading-none">{STAY_TYPE_EMOJI[type]}</span>
                <span className="text-[13px] font-medium">{stayTypeLabels[type]}</span>
                {active && (
                  <Check className="absolute right-2.5 top-2.5 size-3.5" strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>
      </Section>

      <Separator />

      {/* ------------------------------- Météo ------------------------------ */}
      <Section title="Météo" icon={Sun}>
        <div className="grid gap-4">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-600">
              <Thermometer className="size-4 text-ink-400" />
              Température minimale souhaitée
            </p>
            <ChipGroup>
              {TEMPERATURES.map((temperature) => (
                <Chip
                  key={temperature}
                  active={draft.minTemperature === temperature}
                  onClick={() =>
                    patch({
                      minTemperature:
                        draft.minTemperature === temperature ? null : temperature,
                    })
                  }
                >
                  {temperature} °C
                </Chip>
              ))}
              {draft.minTemperature !== null &&
                !TEMPERATURES.includes(draft.minTemperature) && (
                  <Chip active onClick={() => patch({ minTemperature: null })}>
                    {draft.minTemperature} °C
                  </Chip>
                )}
              <Chip
                active={draft.minTemperature === null}
                onClick={() => patch({ minTemperature: null })}
              >
                Indifférent
              </Chip>
            </ChipGroup>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-600">Conditions</p>
            <ChipGroup>
              {WEATHER_OPTIONS.map(({ value, label, icon: Icon }) => (
                <Chip
                  key={value}
                  active={draft.weather === value}
                  onClick={() => patch({ weather: value })}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Chip>
              ))}
            </ChipGroup>
          </div>
        </div>
      </Section>

      <Separator />

      {/* ----------------------------- Transport ---------------------------- */}
      <Section title="Transport" icon={Plane}>
        <div className="grid gap-4">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-600">
              <Timer className="size-4 text-ink-400" />
              Durée maximum du trajet
            </p>
            <ChipGroup>
              {TRAVEL_TIMES.map((hours) => (
                <Chip
                  key={hours}
                  active={draft.maxTravelTime === hours}
                  onClick={() =>
                    patch({ maxTravelTime: draft.maxTravelTime === hours ? null : hours })
                  }
                >
                  {hours} h
                </Chip>
              ))}
              {draft.maxTravelTime !== null &&
                !TRAVEL_TIMES.includes(draft.maxTravelTime) && (
                  <Chip active onClick={() => patch({ maxTravelTime: null })}>
                    {draft.maxTravelTime} h
                  </Chip>
                )}
              <Chip
                active={draft.maxTravelTime === null}
                onClick={() => patch({ maxTravelTime: null })}
              >
                Indifférent
              </Chip>
            </ChipGroup>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-600">Mode de transport</p>
            <ChipGroup>
              {TRANSPORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                <Chip
                  key={value}
                  active={draft.transport === value}
                  onClick={() => patch({ transport: value })}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Chip>
              ))}
            </ChipGroup>
          </div>
        </div>
      </Section>

      <Separator />

      {/* ---------------------------- Hébergement --------------------------- */}
      <Section title="Hébergement" icon={Hotel}>
        <div className="grid gap-4">
          <ChipGroup>
            {ACCOMMODATION_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Chip
                key={value}
                active={draft.accommodation === value}
                onClick={() => patch({ accommodation: value })}
              >
                <Icon className="size-3.5" />
                {label}
              </Chip>
            ))}
          </ChipGroup>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-600">Classement minimum</p>
            <ChipGroup>
              {[3, 4, 5].map((stars) => (
                <Chip
                  key={stars}
                  active={draft.minHotelRating === stars}
                  onClick={() =>
                    patch({ minHotelRating: draft.minHotelRating === stars ? null : stars })
                  }
                >
                  {stars}
                  <Star className="size-3 fill-current" />
                </Chip>
              ))}
              <Chip
                active={draft.minHotelRating === null}
                onClick={() => patch({ minHotelRating: null })}
              >
                Indifférent
              </Chip>
            </ChipGroup>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-600">Équipements</p>
            <div className="grid gap-1">
              {AMENITY_OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = draft.amenities.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleAmenity(value)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      active ? "bg-lagoon-50 text-ink-900" : "text-ink-600 hover:bg-sand-50",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={cn("size-4", active ? "text-lagoon-600" : "text-ink-300")}
                      />
                      {label}
                    </span>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-md border transition-colors",
                        active
                          ? "border-lagoon-600 bg-lagoon-600 text-white"
                          : "border-ink-200",
                      )}
                    >
                      {active && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-600">Formule repas</p>
            <ChipGroup>
              {MEAL_PLAN_OPTIONS.map((plan) => (
                <Chip
                  key={plan}
                  active={draft.mealPlan === plan}
                  onClick={() => patch({ mealPlan: plan })}
                >
                  {plan === "none" ? "Indifférent" : mealPlanLabels[plan]}
                </Chip>
              ))}
            </ChipGroup>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-600">Proximité de la plage</p>
            <ChipGroup>
              {[
                { value: 500, label: "< 500 m" },
                { value: 1000, label: "< 1 km" },
                { value: 3000, label: "< 3 km" },
              ].map(({ value, label }) => (
                <Chip
                  key={value}
                  active={draft.maxBeachDistance === value}
                  onClick={() =>
                    patch({
                      maxBeachDistance: draft.maxBeachDistance === value ? null : value,
                    })
                  }
                >
                  {label}
                </Chip>
              ))}
              <Chip
                active={draft.maxBeachDistance === null}
                onClick={() => patch({ maxBeachDistance: null })}
              >
                Indifférent
              </Chip>
            </ChipGroup>
          </div>
        </div>
      </Section>

      {onReset && (
        <Button variant="ghost" className="justify-center" onClick={onReset}>
          <RotateCcw />
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <Icon className="size-4 text-ink-400" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all duration-200",
        active
          ? "border-ink-900 bg-ink-900 text-white shadow-soft"
          : "border-ink-100 bg-white text-ink-600 hover:border-ink-200 hover:bg-sand-50",
      )}
    >
      {children}
    </button>
  );
}
