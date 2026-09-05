import type { ScoreBreakdown } from "@/types";
import { SCORE_WEIGHTS, scoreLabels } from "@/lib/recommendationEngine";
import { cn } from "@/lib/utils";

interface TravelScoreProps {
  score: number;
  breakdown?: ScoreBreakdown;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Palier de couleur : excellent / bon / moyen / faible. */
export function scoreTone(score: number) {
  if (score >= 85) return { text: "text-emerald-700", bg: "bg-emerald-50", ring: "stroke-emerald-500", label: "Excellent" };
  if (score >= 70) return { text: "text-lagoon-700", bg: "bg-lagoon-50", ring: "stroke-lagoon-500", label: "Très bon" };
  if (score >= 55) return { text: "text-amber-700", bg: "bg-amber-50", ring: "stroke-amber-500", label: "Correct" };
  return { text: "text-ink-500", bg: "bg-sand-100", ring: "stroke-ink-300", label: "Moyen" };
}

/** Pastille circulaire « Score voyage : 91/100 ». */
export function TravelScore({ score, size = "md", className }: TravelScoreProps) {
  const tone = scoreTone(score);
  const dimension = size === "lg" ? 84 : size === "sm" ? 44 : 60;
  const stroke = size === "lg" ? 6 : size === "sm" ? 4 : 5;
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: dimension, height: dimension }}
      role="img"
      aria-label={`Score voyage : ${score} sur 100`}
    >
      <svg width={dimension} height={dimension} className="-rotate-90">
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-ink-100"
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className={cn(tone.ring, "transition-[stroke-dashoffset] duration-700")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-semibold tabular-nums leading-none",
            tone.text,
            size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg",
          )}
        >
          {score}
        </span>
        {size !== "sm" && (
          <span className="text-[9px] font-medium uppercase tracking-wide text-ink-300">
            /100
          </span>
        )}
      </div>
    </div>
  );
}

/** Détail pondéré du score, avec barres de progression. */
export function ScoreBreakdownList({
  breakdown,
  className,
}: {
  breakdown: ScoreBreakdown;
  className?: string;
}) {
  const keys = Object.keys(SCORE_WEIGHTS) as (keyof ScoreBreakdown)[];

  return (
    <ul className={cn("grid gap-3", className)}>
      {keys.map((key) => {
        const value = breakdown[key];
        const tone = scoreTone(value);
        return (
          <li key={key} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink-600">
                {scoreLabels[key]}
                <span className="ml-1.5 text-xs text-ink-300">
                  ({SCORE_WEIGHTS[key]} %)
                </span>
              </span>
              <span className={cn("font-semibold tabular-nums", tone.text)}>{value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sand-100">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700",
                  value >= 85
                    ? "bg-emerald-500"
                    : value >= 70
                      ? "bg-lagoon-500"
                      : value >= 55
                        ? "bg-amber-500"
                        : "bg-ink-300",
                )}
                style={{ width: `${Math.max(3, value)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
