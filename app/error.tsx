"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En production, brancher ici un service de suivi d'erreurs.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-coral-100">
        <TriangleAlert className="size-6 text-coral-600" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink-900">
        Une erreur est survenue
      </h1>
      <p className="mt-3 leading-relaxed text-ink-500">
        Nous n&apos;avons pas pu calculer vos recommandations. Réessayez : le problème est
        souvent temporaire.
      </p>
      <Button variant="primary" className="mt-8" onClick={reset}>
        <RotateCcw />
        Réessayer
      </Button>
    </div>
  );
}
