"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortKey = "score" | "price" | "temperature" | "duration";

export const SORT_LABELS: Record<SortKey, string> = {
  score: "Score voyage",
  price: "Prix croissant",
  temperature: "Température décroissante",
  duration: "Trajet le plus court",
};

export function SortSelect({ value }: { value: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function change(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "score") params.delete("sort");
    else params.set("sort", next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Select value={value} onValueChange={change}>
      <SelectTrigger className="h-10 w-auto min-w-[190px] gap-2 rounded-full">
        <ArrowDownWideNarrow className="size-4 shrink-0 text-ink-400" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <SelectItem key={key} value={key}>
            {SORT_LABELS[key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
