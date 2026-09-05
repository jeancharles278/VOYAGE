import { NextResponse } from "next/server";
import { parseNaturalLanguage } from "@/lib/nlpParser";
import type { ParsedQuery } from "@/types";

/**
 * POST /api/parse — « Décrivez votre voyage idéal ».
 *
 * Reçoit `{ query: string }` et renvoie un `ParsedQuery`.
 *
 * Aujourd'hui : parser à règles (instantané, gratuit, déterministe).
 * Pour brancher un LLM, il suffit de remplacer l'implémentation de
 * `parseWithLlm()` ci-dessous : le contrat de sortie ne change pas, donc
 * ni l'interface ni le moteur de recommandation n'ont à être modifiés.
 */
export async function POST(request: Request) {
  let query: unknown;
  try {
    ({ query } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (typeof query !== "string" || query.trim().length < 3) {
    return NextResponse.json(
      { error: "Le champ `query` doit contenir au moins 3 caractères." },
      { status: 400 },
    );
  }

  const useLlm =
    process.env.NLP_PROVIDER === "llm" && Boolean(process.env.ANTHROPIC_API_KEY);

  const parsed = useLlm ? await parseWithLlm(query) : parseNaturalLanguage(query);
  return NextResponse.json(parsed);
}

/**
 * Point d'ancrage LLM.
 *
 * Implémentation type (à activer avec `NLP_PROVIDER=llm` et une clé) :
 *
 * ```ts
 * const response = await fetch("https://api.anthropic.com/v1/messages", {
 *   method: "POST",
 *   headers: {
 *     "content-type": "application/json",
 *     "x-api-key": process.env.ANTHROPIC_API_KEY!,
 *     "anthropic-version": "2023-06-01",
 *   },
 *   body: JSON.stringify({
 *     model: "claude-sonnet-5",
 *     max_tokens: 512,
 *     system: SYSTEM_PROMPT,        // décrit le schéma SearchCriteria
 *     messages: [{ role: "user", content: query }],
 *   }),
 * });
 * ```
 *
 * Le résultat doit être validé (Zod ou équivalent) avant d'être renvoyé :
 * en cas d'échec, on retombe sur le parser à règles ci-dessous.
 */
async function parseWithLlm(query: string): Promise<ParsedQuery> {
  // Tant que l'appel LLM n'est pas branché, on sert le parser déterministe
  // plutôt que de renvoyer une erreur à l'utilisateur.
  return parseNaturalLanguage(query);
}
