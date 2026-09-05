import type { Metadata } from "next";
import { criteriaFromSearchParams } from "@/lib/searchCriteria";
import { FavoritesClient } from "./FavoritesClient";

export const metadata: Metadata = {
  title: "Mes favoris",
  description: "Retrouvez les destinations et hébergements que vous avez enregistrés.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const criteria = criteriaFromSearchParams(params);
  // Sans critères dans l'URL, le client réutilisera la dernière recherche.
  return <FavoritesClient criteria={criteria} urlHasCriteria={Object.keys(params).length > 0} />;
}
