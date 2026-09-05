import { Bed, PiggyBank, Plane, ShoppingBag, TriangleAlert } from "lucide-react";
import type { BudgetBreakdown as BudgetBreakdownType, SearchCriteria } from "@/types";
import { cn, formatPrice } from "@/lib/utils";

interface BudgetBreakdownProps {
  budget: BudgetBreakdownType;
  criteria: SearchCriteria;
  className?: string;
}

/** Répartition du budget : transport, hébergement, dépenses sur place. */
export function BudgetBreakdown({ budget, criteria, className }: BudgetBreakdownProps) {
  const guests = criteria.travelers.adults + criteria.travelers.children;
  const lines = [
    {
      key: "transport",
      label: "Transport A/R",
      hint: `${guests} voyageur${guests > 1 ? "s" : ""}`,
      amount: budget.transport,
      icon: Plane,
      color: "bg-lagoon-500",
    },
    {
      key: "accommodation",
      label: "Hébergement",
      hint: `${criteria.nights} nuit${criteria.nights > 1 ? "s" : ""}`,
      amount: budget.accommodation,
      icon: Bed,
      color: "bg-coral-500",
    },
    {
      key: "onSite",
      label: "Dépenses sur place",
      hint: "Repas, transports, visites",
      amount: budget.onSite,
      icon: ShoppingBag,
      color: "bg-amber-400",
    },
  ];

  const overBudget = budget.remaining < 0;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-ink-100/70 bg-white shadow-soft",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
        <h3 className="flex items-center gap-2 font-semibold tracking-tight text-ink-900">
          <PiggyBank className="size-4 text-ink-400" />
          Budget estimé
        </h3>
        <span className="text-sm text-ink-400">
          Plafond : {formatPrice(criteria.maxBudget)}
        </span>
      </div>

      <div className="grid gap-5 p-6">
        {/* Barre de répartition. */}
        <div className="flex h-2.5 overflow-hidden rounded-full bg-sand-100">
          {lines.map((line) => (
            <div
              key={line.key}
              className={cn(line.color, "transition-[width] duration-700")}
              style={{ width: `${(line.amount / Math.max(1, budget.total)) * 100}%` }}
              title={`${line.label} : ${formatPrice(line.amount)}`}
            />
          ))}
        </div>

        <ul className="grid gap-3">
          {lines.map(({ key, label, hint, amount, icon: Icon, color }) => (
            <li key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-3">
                <span className={cn("size-2.5 rounded-full", color)} />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                    <Icon className="size-3.5 text-ink-400" />
                    {label}
                  </span>
                  <span className="text-xs text-ink-400">{hint}</span>
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink-900">
                {formatPrice(amount)}
              </span>
            </li>
          ))}
        </ul>

        <div className="grid gap-2 border-t border-ink-100 pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium text-ink-600">Total estimé</span>
            <span className="text-2xl font-semibold tracking-tight text-ink-900">
              {formatPrice(budget.total)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-ink-400">Par personne</span>
            <span className="text-sm font-medium text-ink-700">
              {formatPrice(budget.perPerson)}
            </span>
          </div>
        </div>

        <p
          className={cn(
            "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm",
            overBudget ? "bg-coral-100 text-coral-600" : "bg-emerald-50 text-emerald-700",
          )}
        >
          {overBudget && <TriangleAlert className="size-4 shrink-0" />}
          {overBudget
            ? `Dépassement de ${formatPrice(Math.abs(budget.remaining))} par rapport à votre budget.`
            : `Il vous reste ${formatPrice(budget.remaining)} de marge sur votre budget.`}
        </p>
      </div>
    </section>
  );
}
