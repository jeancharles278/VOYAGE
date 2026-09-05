"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2, Sparkles, WandSparkles } from "lucide-react";
import type { SearchCriteria } from "@/types";
import { mergeParsedCriteria, parseNaturalLanguage } from "@/lib/nlpParser";
import { searchUrl } from "@/lib/searchCriteria";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const EXAMPLES = [
  "Je veux partir 4 jours avec ma femme et mon fils de 9 ans depuis Luxembourg. Je veux du soleil, une piscine et un budget maximum de 2 000 €.",
  "Un week-end romantique en train depuis Paris, moins de 800 € pour deux.",
  "Une semaine au ski en février depuis Genève, 3 500 € maximum.",
];

interface NaturalLanguageSearchProps {
  baseCriteria: SearchCriteria;
}

/**
 * Champ « Décrivez votre voyage idéal ».
 * Le parsing est instantané et local ; l'architecture permet de basculer
 * vers une API LLM sans changer ce composant (voir `parseTravelQuery`).
 */
export function NaturalLanguageSearch({ baseCriteria }: NaturalLanguageSearchProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  const parsed = text.trim().length > 12 ? parseNaturalLanguage(text) : null;

  function submit() {
    if (!parsed) return;
    setPending(true);
    router.push(searchUrl(mergeParsedCriteria(baseCriteria, parsed.criteria)));
  }

  return (
    <div className="rounded-3xl border border-ink-100/70 bg-white p-5 shadow-soft sm:p-6">
      <label
        htmlFor="nl-search"
        className="flex items-center gap-2 text-sm font-semibold text-ink-900"
      >
        <WandSparkles className="size-4 text-coral-500" />
        Décrivez votre voyage idéal
      </label>
      <p className="mt-1 text-sm text-ink-400">
        Écrivez librement : nous en extrayons vos critères automatiquement.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <textarea
          id="nl-search"
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
          }}
          placeholder={EXAMPLES[0]}
          className="w-full resize-none rounded-2xl border border-ink-200 bg-white p-4 text-sm leading-relaxed text-ink-900 transition-colors placeholder:text-ink-300 focus-visible:border-lagoon-500 focus-visible:outline-none"
        />

        {parsed && parsed.matched.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 animate-fade-in">
            <span className="text-xs text-ink-400">Critères détectés :</span>
            {parsed.matched.map((item) => (
              <Badge key={item} variant="lagoon">
                {item}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.slice(1).map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setText(example)}
                className="rounded-full bg-sand-100 px-3 py-1.5 text-xs text-ink-500 transition-colors hover:bg-sand-200 hover:text-ink-800"
              >
                {example.length > 46 ? `${example.slice(0, 46)}…` : example}
              </button>
            ))}
          </div>

          <Button onClick={submit} disabled={!parsed || pending} variant="primary">
            {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Analyser ma demande
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
