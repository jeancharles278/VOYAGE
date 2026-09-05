"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { SearchCriteria } from "@/types";
import { origins } from "@/data/origins";
import { destinations } from "@/data/destinations";
import { searchUrl } from "@/lib/searchCriteria";
import { addDays, cn, daysBetween, formatDateRange, formatPrice, todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface SearchBarProps {
  initialCriteria: SearchCriteria;
  variant?: "hero" | "compact";
}

const CHILD_AGES = Array.from({ length: 18 }, (_, i) => i);

export function SearchBar({ initialCriteria, variant = "hero" }: SearchBarProps) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<SearchCriteria>(initialCriteria);
  const [pending, setPending] = useState<"search" | "surprise" | null>(null);
  // Sur mobile, la barre compacte reste repliée pour ne pas manger l'écran.
  const [expanded, setExpanded] = useState(false);

  const travelersLabel = useMemo(() => {
    const { adults, children } = criteria.travelers;
    const parts = [`${adults} adulte${adults > 1 ? "s" : ""}`];
    if (children > 0) parts.push(`${children} enfant${children > 1 ? "s" : ""}`);
    return parts.join(", ");
  }, [criteria.travelers]);

  function patch(next: Partial<SearchCriteria>) {
    setCriteria((current) => ({ ...current, ...next }));
  }

  function setDates(start: string, end: string) {
    const safeEnd = end > start ? end : addDays(start, 1);
    patch({
      startDate: start,
      endDate: safeEnd,
      nights: Math.max(1, daysBetween(start, safeEnd)),
    });
  }

  function setChildren(count: number) {
    const children = Math.max(0, Math.min(6, count));
    patch({
      travelers: {
        ...criteria.travelers,
        children,
        childrenAges: Array.from(
          { length: children },
          (_, i) => criteria.travelers.childrenAges[i] ?? 8,
        ),
      },
    });
  }

  function submit(mode: "search" | "surprise") {
    setPending(mode);
    const target: SearchCriteria =
      mode === "surprise" ? { ...criteria, destination: undefined } : criteria;
    router.push(searchUrl(target));
  }

  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "w-full rounded-3xl border border-ink-100/80 bg-white",
        isHero ? "p-3 shadow-panel sm:p-4" : "p-2.5 shadow-soft",
      )}
    >
      {!isHero && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-sand-50 lg:hidden"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white">
            <Search className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900">
              {origins.find((o) => o.slug === criteria.origin)?.name} ·{" "}
              {criteria.destination
                ? destinations.find((d) => d.slug === criteria.destination)?.name
                : "Peu importe"}
            </span>
            <span className="block truncate text-xs text-ink-400">
              {formatDateRange(criteria.startDate, criteria.endDate)} · {travelersLabel} ·{" "}
              {formatPrice(criteria.maxBudget)}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-ink-400 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
      )}

      <div
        className={cn(
          "grid gap-px overflow-hidden rounded-2xl bg-ink-100/70",
          !isHero && !expanded && "hidden lg:grid",
          !isHero && expanded && "mt-2.5",
          isHero
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,1fr)_auto]"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,1.4fr)_minmax(0,0.95fr)_minmax(0,1fr)_auto]",
        )}
      >
        {/* ------------------------------ Départ ---------------------------- */}
        <Field icon={MapPin} label="Départ">
          <Select value={criteria.origin} onValueChange={(value) => patch({ origin: value })}>
            <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-[15px] font-medium [&>span]:truncate">
              <SelectValue placeholder="Ville de départ">
                {origins.find((o) => o.slug === criteria.origin)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {origins.map((origin) => (
                <SelectItem key={origin.slug} value={origin.slug} textValue={origin.name}>
                  <span className="flex w-full items-center justify-between gap-3">
                    {origin.name}
                    <span className="text-xs text-ink-300">{origin.airport}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* ---------------------------- Destination ------------------------- */}
        <Field icon={Sparkles} label="Destination">
          <Select
            value={criteria.destination ?? "any"}
            onValueChange={(value) =>
              patch({ destination: value === "any" ? undefined : value })
            }
          >
            <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-[15px] font-medium [&>span]:truncate">
              <SelectValue placeholder="Peu importe">
                {criteria.destination
                  ? destinations.find((d) => d.slug === criteria.destination)?.name
                  : "Peu importe"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="any">Peu importe</SelectItem>
              {destinations
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "fr"))
                .map((destination) => (
                  <SelectItem
                    key={destination.slug}
                    value={destination.slug}
                    textValue={destination.name}
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      {destination.name}
                      <span className="text-xs text-ink-300">{destination.country}</span>
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>

        {/* ------------------------------ Dates ----------------------------- */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="group bg-white px-4 py-3.5 text-left transition-colors hover:bg-sand-50">
              <FieldLabel icon={CalendarDays} label="Dates" />
              <span className="mt-1 block truncate text-[15px] font-medium text-ink-900">
                {formatDateRange(criteria.startDate, criteria.endDate)}
                <span className="ml-1.5 text-ink-400">
                  · {criteria.nights} nuit{criteria.nights > 1 ? "s" : ""}
                </span>
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="start-date">Aller</Label>
                <Input
                  id="start-date"
                  type="date"
                  min={todayISO()}
                  value={criteria.startDate ?? ""}
                  onChange={(event) =>
                    setDates(event.target.value, criteria.endDate ?? event.target.value)
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="end-date">Retour</Label>
                <Input
                  id="end-date"
                  type="date"
                  min={criteria.startDate ?? todayISO()}
                  value={criteria.endDate ?? ""}
                  onChange={(event) =>
                    setDates(criteria.startDate ?? todayISO(), event.target.value)
                  }
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[2, 3, 4, 7, 10, 14].map((nights) => (
                  <button
                    key={nights}
                    type="button"
                    onClick={() =>
                      setDates(
                        criteria.startDate ?? addDays(todayISO(), 30),
                        addDays(criteria.startDate ?? addDays(todayISO(), 30), nights),
                      )
                    }
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      criteria.nights === nights
                        ? "bg-ink-900 text-white"
                        : "bg-sand-100 text-ink-600 hover:bg-sand-200",
                    )}
                  >
                    {nights} nuits
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* ---------------------------- Voyageurs --------------------------- */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="bg-white px-4 py-3.5 text-left transition-colors hover:bg-sand-50">
              <FieldLabel icon={Users} label="Voyageurs" />
              <span className="mt-1 block truncate text-[15px] font-medium text-ink-900">
                {travelersLabel}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <Counter
                label="Adultes"
                hint="13 ans et plus"
                value={criteria.travelers.adults}
                min={1}
                max={8}
                onChange={(adults) =>
                  patch({ travelers: { ...criteria.travelers, adults } })
                }
              />
              <Counter
                label="Enfants"
                hint="0 à 17 ans"
                value={criteria.travelers.children}
                min={0}
                max={6}
                onChange={setChildren}
              />
              {criteria.travelers.children > 0 && (
                <div className="grid gap-2 border-t border-ink-100 pt-3">
                  <Label>Âge des enfants</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {criteria.travelers.childrenAges.map((age, index) => (
                      <Select
                        key={index}
                        value={String(age)}
                        onValueChange={(value) => {
                          const ages = [...criteria.travelers.childrenAges];
                          ages[index] = Number(value);
                          patch({ travelers: { ...criteria.travelers, childrenAges: ages } });
                        }}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHILD_AGES.map((value) => (
                            <SelectItem key={value} value={String(value)}>
                              {value === 0 ? "< 1 an" : `${value} ans`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* ------------------------------ Budget ---------------------------- */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="bg-white px-4 py-3.5 text-left transition-colors hover:bg-sand-50">
              <FieldLabel icon={Wallet} label="Budget max." />
              <span className="mt-1 block truncate text-[15px] font-medium text-ink-900">
                {formatPrice(criteria.maxBudget)}
                <span className="ml-1.5 text-ink-400">au total</span>
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="budget">Budget total maximum</Label>
                <div className="relative">
                  <Input
                    id="budget"
                    type="number"
                    min={200}
                    step={50}
                    value={criteria.maxBudget}
                    onChange={(event) =>
                      patch({ maxBudget: Math.max(200, Number(event.target.value) || 0) })
                    }
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                    €
                  </span>
                </div>
              </div>
              <Slider
                value={[Math.min(12000, criteria.maxBudget)]}
                min={300}
                max={12000}
                step={100}
                onValueChange={([value]) => patch({ maxBudget: value })}
              />
              <p className="text-xs leading-relaxed text-ink-400">
                Transport, hébergement et dépenses sur place inclus, pour{" "}
                {criteria.travelers.adults + criteria.travelers.children} personne
                {criteria.travelers.adults + criteria.travelers.children > 1 ? "s" : ""}.
              </p>
            </div>
          </PopoverContent>
        </Popover>

        {/* ------------------------------ Action ---------------------------- */}
        <div className="flex items-center bg-white p-2 sm:p-3">
          <Button
            variant="coral"
            size={isHero ? "lg" : "default"}
            className="w-full xl:w-auto"
            onClick={() => submit("search")}
            disabled={pending !== null}
          >
            {pending === "search" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Search />
            )}
            <span className={cn(isHero ? "" : "sm:hidden xl:inline")}>
              Trouver mon voyage
            </span>
          </Button>
        </div>
      </div>

      {isHero && (
        <div className="flex flex-col items-center gap-3 px-2 pb-1 pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => submit("surprise")}
            className="group inline-flex items-center gap-2 rounded-full bg-sand-100 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-sand-200"
            disabled={pending !== null}
          >
            {pending === "surprise" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4 text-coral-500 transition-transform group-hover:scale-110" />
            )}
            Je ne sais pas où partir
          </button>
          <p className="text-center text-xs text-ink-400 sm:text-right">
            {destinations.length} destinations analysées · météo, budget et trajet comparés
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Sous-composants                                 */
/* -------------------------------------------------------------------------- */

function FieldLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white px-4 py-3.5 transition-colors hover:bg-sand-50">
      <FieldLabel icon={icon} label={label} />
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Counter({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink-900">{label}</p>
        <p className="text-xs text-ink-400">{hint}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Retirer un ${label.toLowerCase()}`}
        >
          <Minus />
        </Button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Ajouter un ${label.toLowerCase()}`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
