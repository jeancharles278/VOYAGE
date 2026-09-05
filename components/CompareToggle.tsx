"use client";

import { GitCompareArrows } from "lucide-react";
import { useCompare } from "@/hooks/useCompare";
import { cn } from "@/lib/utils";

interface CompareToggleProps {
  slug: string;
  className?: string;
  variant?: "overlay" | "inline";
}

export function CompareToggle({ slug, className, variant = "overlay" }: CompareToggleProps) {
  const { isSelected, toggle, isFull, hydrated } = useCompare();
  const active = hydrated && isSelected(slug);
  const disabled = hydrated && !active && isFull;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) toggle(slug);
      }}
      aria-pressed={active}
      disabled={disabled}
      title={
        disabled
          ? "Comparateur complet (4 destinations maximum)"
          : active
            ? "Retirer du comparateur"
            : "Ajouter au comparateur"
      }
      aria-label={active ? "Retirer du comparateur" : "Ajouter au comparateur"}
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40",
        variant === "overlay"
          ? "size-9 shadow-soft backdrop-blur"
          : "size-9 border border-ink-100",
        active
          ? "bg-ink-900 text-white"
          : variant === "overlay"
            ? "bg-white/85 text-ink-700 hover:bg-white"
            : "bg-white text-ink-600 hover:border-ink-200",
        className,
      )}
    >
      <GitCompareArrows className="size-4" />
    </button>
  );
}
