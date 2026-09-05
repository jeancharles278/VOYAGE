import type { Metadata } from "next";
import { criteriaFromSearchParams } from "@/lib/searchCriteria";
import { CompareClient } from "./CompareClient";

export const metadata: Metadata = {
  title: "Comparateur de destinations",
  description:
    "Comparez jusqu'à 4 destinations : prix, météo, température, durée de trajet, hébergements et score global.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const criteria = criteriaFromSearchParams(await searchParams);
  return <CompareClient criteria={criteria} />;
}
