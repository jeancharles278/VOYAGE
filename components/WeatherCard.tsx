import {
  Droplets,
  Gauge,
  Info,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import type { WeatherReport } from "@/types";
import { conditionLabels } from "@/lib/climate";
import { cn, formatTemperature } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { WeatherIcon } from "@/components/WeatherIcon";

const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

interface WeatherCardProps {
  report: WeatherReport;
  className?: string;
}

/**
 * Carte météo.
 *
 * Distingue explicitement une prévision réelle (horizon court) d'une
 * tendance climatique historique (horizon long). Aucune prévision à long
 * terme n'est présentée comme fiable.
 */
export function WeatherCard({ report, className }: WeatherCardProps) {
  const { summary, daily, kind } = report;
  const isForecast = kind === "forecast";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
        <h3 className="flex items-center gap-2 font-semibold tracking-tight text-ink-900">
          <Thermometer className="size-4 text-ink-400" />
          Météo attendue
        </h3>
        <Badge variant={isForecast ? "lagoon" : "soft"}>{report.label}</Badge>
      </div>

      <div className="grid gap-6 p-6">
        {/* ---------------------------- Résumé ---------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-sand-50">
              <WeatherIcon condition={summary.condition} className="size-8" />
            </span>
            <div>
              <p className="text-4xl font-semibold tracking-tight text-ink-900">
                {formatTemperature(summary.temperature)}
              </p>
              <p className="text-sm text-ink-500">
                {conditionLabels[summary.condition]} · ressenti{" "}
                {formatTemperature(summary.feelsLike)}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <Stat
              icon={Droplets}
              label="Précipitations"
              value={`${summary.precipitation.toFixed(1)} mm/j`}
            />
            <Stat icon={Wind} label="Vent" value={`${summary.windSpeed} km/h`} />
            <Stat icon={Gauge} label="Humidité" value={`${summary.humidity} %`} />
            {report.seaTemperature !== undefined ? (
              <Stat
                icon={Waves}
                label="Mer"
                value={formatTemperature(report.seaTemperature)}
              />
            ) : (
              <Stat
                icon={Thermometer}
                label="Ensoleillement"
                value={`${(summary.sunHours ?? 0).toFixed(0)} h/j`}
              />
            )}
          </dl>
        </div>

        {/* --------------------------- Journalier -------------------------- */}
        <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
          {daily.map((day) => {
            const date = new Date(`${day.date}T12:00:00`);
            return (
              <div
                key={day.date}
                className="flex min-w-[86px] flex-1 flex-col items-center gap-2 rounded-2xl bg-sand-50 px-3 py-4"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  {DAY_FORMAT.format(date)}
                </span>
                <WeatherIcon condition={day.condition} className="size-5" />
                <span className="text-sm font-semibold text-ink-900">
                  {formatTemperature(day.temperature)}
                </span>
                <span className="text-[11px] text-ink-300">{DATE_FORMAT.format(date)}</span>
              </div>
            );
          })}
        </div>

        {/* ------------------------- Avertissement ------------------------ */}
        <p className="flex items-start gap-2 rounded-2xl bg-sand-50 p-3.5 text-xs leading-relaxed text-ink-500">
          <Info className="mt-0.5 size-3.5 shrink-0 text-ink-400" />
          {isForecast ? (
            <span>
              Prévision fournie par {report.provider}. Elle reste fiable jusqu&apos;à environ
              14 jours ; au-delà, nous basculons automatiquement sur les normales
              climatiques.
            </span>
          ) : (
            <span>
              Vos dates sont trop éloignées pour une prévision fiable. Nous affichons donc
              la <strong className="font-medium text-ink-700">tendance climatique
              historique</strong> pour cette période, calculée à partir des normales
              mensuelles — et non une prévision.
            </span>
          )}
        </p>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-ink-900">{value}</dd>
    </div>
  );
}

export function WeatherCardSkeleton() {
  return (
    <div className="rounded-3xl border border-ink-100/70 bg-white p-6 shadow-soft">
      <div className="skeleton h-5 w-40 rounded-full" />
      <div className="mt-6 flex items-center gap-4">
        <div className="skeleton size-16 rounded-2xl" />
        <div className="grid gap-2">
          <div className="skeleton h-9 w-24 rounded-full" />
          <div className="skeleton h-4 w-40 rounded-full" />
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton h-28 flex-1 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
